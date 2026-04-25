import type { TacticDocumentV1 } from "@basketball/shared";
import { useMemo } from "react";
import { tacticToSvg, type CourtMode } from "./court-geometry";
import { resolveBallHolderAt, samplePoses } from "./viewer-math";

interface Props {
  document: TacticDocumentV1;
  teamColors: { offense: string; defense: string };
  courtMode?: CourtMode;
  /** In the editor, only draw segments from keyframe 0 up to this keyframe index (inclusive). Omitted = show full timeline. */
  upToKeyframeIndex?: number;
}

function sampleQuadBezier(
  p0: [number, number],
  cp: [number, number],
  p1: [number, number],
  n: number = 24,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * p0[0] + 2 * u * t * cp[0] + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * cp[1] + t * t * p1[1],
    ]);
  }
  return pts;
}

function wavyPathD(points: [number, number][], amp: number = 1.8, waveLen: number = 5): string {
  if (points.length < 2) return "";
  let total = 0;
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    total += Math.sqrt(dx * dx + dy * dy);
    cum.push(total);
  }
  if (total < 1)
    return `M ${points[0][0]} ${points[0][1]} L ${points[points.length - 1][0]} ${points[points.length - 1][1]}`;

  const waves = Math.max(2, Math.round(total / waveLen));
  const steps = waves * 4;
  let d = `M ${points[0][0]} ${points[0][1]}`;

  for (let si = 1; si <= steps; si++) {
    const t = si / steps;
    const dist = t * total;
    let seg = 0;
    for (let j = 1; j < cum.length; j++) {
      if (cum[j] >= dist) {
        seg = j - 1;
        break;
      }
    }
    const segLen = cum[seg + 1] - cum[seg];
    const segT = segLen > 0 ? (dist - cum[seg]) / segLen : 0;
    const px = points[seg][0] + (points[seg + 1][0] - points[seg][0]) * segT;
    const py = points[seg][1] + (points[seg + 1][1] - points[seg][1]) * segT;
    const dx = points[seg + 1][0] - points[seg][0];
    const dy = points[seg + 1][1] - points[seg][1];
    const sl = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / sl;
    const ny = dx / sl;
    const w = si === steps ? 0 : Math.sin(t * waves * 2 * Math.PI) * amp;
    d += ` L ${(px + nx * w).toFixed(2)} ${(py + ny * w).toFixed(2)}`;
  }
  return d;
}

/** 本帧区间内「传给该球员」的传球时刻（球在 pass.t 才到位，与 resolveBallHolderAt 一致）。取区间内最晚一次传球。 */
function findReceivePassT(
  doc: TacticDocumentV1,
  actorId: string,
  tOpen: number,
  tClosed: number,
): number | null {
  const passes = (doc.events ?? []).filter(
    (e) =>
      e.kind === "pass" &&
      typeof e.to === "string" &&
      e.to === actorId &&
      e.t > tOpen &&
      e.t <= tClosed,
  );
  if (!passes.length) return null;
  passes.sort((a, b) => a.t - b.t);
  return passes[passes.length - 1]!.t;
}

/**
 * 将二次贝塞尔在参数 u 处切开：左段 P0→B(u)，右段 B(u)→P1（与关键帧间线性时间近似对应）。
 * SVG Q: M p0 Q cp p_end
 */
function splitQuadraticSvg(
  p0: [number, number],
  cp: [number, number],
  p1: [number, number],
  u: number,
): { leftD: string; right: { p0: [number, number]; cp: [number, number]; p1: [number, number] } } {
  const t = Math.min(0.999, Math.max(0.001, u));
  const s0: [number, number] = [(1 - t) * p0[0] + t * cp[0], (1 - t) * p0[1] + t * cp[1]];
  const s1: [number, number] = [(1 - t) * cp[0] + t * p1[0], (1 - t) * cp[1] + t * p1[1]];
  const s: [number, number] = [(1 - t) * s0[0] + t * s1[0], (1 - t) * s0[1] + t * s1[1]];
  const leftD = `M ${p0[0]} ${p0[1]} Q ${s0[0]} ${s0[1]} ${s[0]} ${s[1]}`;
  return { leftD, right: { p0: s, cp: s1, p1 } };
}

const PART2_MIN_MS = 8;

export function MovementTrails({ document: doc, teamColors, courtMode = "half", upToKeyframeIndex }: Props) {
  const players = useMemo(() => doc.actors.filter((a) => a.type === "player"), [doc.actors]);
  const kfs = useMemo(() => [...doc.keyframes].sort((a, b) => a.t - b.t), [doc.keyframes]);
  const holdersByTime = useMemo(() => {
    const out = new Map<number, string | undefined>();
    for (const kf of kfs) out.set(kf.t, resolveBallHolderAt(doc, kf.t));
    return out;
  }, [doc, kfs]);
  if (kfs.length < 2) return null;

  const endSeg = upToKeyframeIndex === undefined ? kfs.length - 1 : Math.min(Math.max(0, upToKeyframeIndex), kfs.length - 1);
  if (endSeg < 1) return null;

  return (
    <g className="movement-trails">
      {players.map((actor) => {
        if (actor.type !== "player") return null;
        const color = teamColors[actor.team] ?? teamColors.offense;
        const segments: React.ReactNode[] = [];

        for (let i = 1; i <= endSeg; i++) {
          const prevPose = kfs[i - 1].poses[actor.id];
          const currPose = kfs[i].poses[actor.id];
          if (!prevPose || !currPose) continue;

          const [x0, y0] = tacticToSvg(prevPose.x, prevPose.y, courtMode);
          const [x1, y1] = tacticToSvg(currPose.x, currPose.y, courtMode);
          if (Math.abs(x1 - x0) < 0.5 && Math.abs(y1 - y0) < 0.5) continue;

          const t0 = kfs[i - 1].t;
          const t1 = kfs[i].t;
          const holderEnd = resolveBallHolderAt(doc, t1);
          const receiveT = findReceivePassT(doc, actor.id, t0, t1);

          const hasCp = currPose.cpx !== undefined && currPose.cpy !== undefined;
          const cp: [number, number] | null = hasCp
            ? tacticToSvg(currPose.cpx!, currPose.cpy!, courtMode)
            : null;

          /** 区间内接球：接球前为无球跑动（不画波折）；接球后带球才画波折线 */
          if (receiveT !== null && t1 - t0 > 1) {
            const posesRecv = samplePoses(doc, receiveT);
            const pv = posesRecv[actor.id];
            if (pv) {
              const uTime = (receiveT - t0) / (t1 - t0);
              const dribbleAfter = holderEnd === actor.id && receiveT < t1 - PART2_MIN_MS;

              if (receiveT < t1 - PART2_MIN_MS) {
                if (hasCp && cp) {
                  const { leftD, right } = splitQuadraticSvg([x0, y0], cp, [x1, y1], uTime);
                  segments.push(
                    <path
                      key={`${actor.id}-${i}-recv`}
                      d={leftD}
                      fill="none"
                      stroke={color}
                      strokeWidth="0.8"
                      opacity="0.5"
                      markerEnd="url(#moveArrowOff)"
                    />,
                  );
                  if (dribbleAfter) {
                    const pts = sampleQuadBezier(right.p0, right.cp, right.p1, 30);
                    segments.push(
                      <path
                        key={`${actor.id}-${i}-drib`}
                        d={wavyPathD(pts)}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.9"
                        opacity="0.65"
                        markerEnd="url(#moveArrowDrib)"
                      />,
                    );
                  } else {
                    segments.push(
                      <path
                        key={`${actor.id}-${i}-post`}
                        d={`M ${right.p0[0]} ${right.p0[1]} Q ${right.cp[0]} ${right.cp[1]} ${right.p1[0]} ${right.p1[1]}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.8"
                        opacity="0.5"
                        markerEnd="url(#moveArrowOff)"
                      />,
                    );
                  }
                } else {
                  const [xT, yT] = tacticToSvg(pv.x, pv.y, courtMode);
                  segments.push(
                    <line
                      key={`${actor.id}-${i}-recv`}
                      x1={x0}
                      y1={y0}
                      x2={xT}
                      y2={yT}
                      stroke={color}
                      strokeWidth="0.8"
                      opacity="0.5"
                      markerEnd="url(#moveArrowOff)"
                    />,
                  );
                  if (dribbleAfter) {
                    const pts: [number, number][] = [
                      [xT, yT],
                      [x1, y1],
                    ];
                    segments.push(
                      <path
                        key={`${actor.id}-${i}-drib`}
                        d={wavyPathD(pts)}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.9"
                        opacity="0.65"
                        markerEnd="url(#moveArrowDrib)"
                      />,
                    );
                  } else {
                    segments.push(
                      <line
                        key={`${actor.id}-${i}-post`}
                        x1={xT}
                        y1={yT}
                        x2={x1}
                        y2={y1}
                        stroke={color}
                        strokeWidth="0.8"
                        opacity="0.5"
                        markerEnd="url(#moveArrowOff)"
                      />,
                    );
                  }
                }
                continue;
              }

              // 接球发生在本帧末尾附近：整段视为接球前移动，不画带球波折线
              if (hasCp && cp) {
                segments.push(
                  <path
                    key={`${actor.id}-${i}`}
                    d={`M ${x0} ${y0} Q ${cp[0]} ${cp[1]} ${x1} ${y1}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.8"
                    opacity="0.5"
                    markerEnd="url(#moveArrowOff)"
                  />,
                );
              } else {
                segments.push(
                  <line
                    key={`${actor.id}-${i}`}
                    x1={x0}
                    y1={y0}
                    x2={x1}
                    y2={y1}
                    stroke={color}
                    strokeWidth="0.8"
                    opacity="0.5"
                    markerEnd="url(#moveArrowOff)"
                  />,
                );
              }
              continue;
            }
          }

          const holder = holdersByTime.get(kfs[i].t);
          const isDribble = holder === actor.id;

          if (isDribble) {
            const pts: [number, number][] = cp
              ? sampleQuadBezier([x0, y0], cp, [x1, y1], 30)
              : [[x0, y0], [x1, y1]];
            segments.push(
              <path
                key={`${actor.id}-${i}`}
                d={wavyPathD(pts)}
                fill="none"
                stroke={color}
                strokeWidth="0.9"
                opacity="0.65"
                markerEnd="url(#moveArrowDrib)"
              />,
            );
          } else if (cp) {
            segments.push(
              <path
                key={`${actor.id}-${i}`}
                d={`M ${x0} ${y0} Q ${cp[0]} ${cp[1]} ${x1} ${y1}`}
                fill="none"
                stroke={color}
                strokeWidth="0.8"
                opacity="0.5"
                markerEnd="url(#moveArrowOff)"
              />,
            );
          } else {
            segments.push(
              <line
                key={`${actor.id}-${i}`}
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                stroke={color}
                strokeWidth="0.8"
                opacity="0.5"
                markerEnd="url(#moveArrowOff)"
              />,
            );
          }
        }
        return <g key={actor.id}>{segments}</g>;
      })}
    </g>
  );
}
