import { useMemo } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import {
  samplePoses,
  resolveBallState,
  resolveBallHolderAt,
  resolveScreenOverlaysAtT,
  PASS_FLY_MS,
} from "./viewer-math";
import { CourtSVG } from "./CourtSVG";
import { tacticToSvg, type CourtMode } from "./court-geometry";

function sampleBezier(
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

function wavyPathD(points: [number, number][], amp = 1.8, waveLen = 5): string {
  if (points.length < 2) return "";
  let total = 0;
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    total += Math.sqrt(dx * dx + dy * dy);
    cum.push(total);
  }
  if (total < 1) return `M ${points[0][0]} ${points[0][1]} L ${points[points.length - 1][0]} ${points[points.length - 1][1]}`;
  const waves = Math.max(2, Math.round(total / waveLen));
  const steps = waves * 4;
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let si = 1; si <= steps; si++) {
    const t = si / steps;
    const dist = t * total;
    let seg = 0;
    for (let j = 1; j < cum.length; j++) {
      if (cum[j] >= dist) { seg = j - 1; break; }
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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function PlayPreview({
  document: doc,
  tMs,
  courtMode = "half",
}: {
  document: TacticDocumentV1;
  tMs: number;
  courtMode?: CourtMode;
}) {
  const poses = useMemo(() => samplePoses(doc, tMs), [doc, tMs]);
  const ballState = useMemo(() => resolveBallState(doc, tMs, poses), [doc, tMs, poses]);

  const teamColors = {
    offense: doc.teams.offense.color ?? "#e53935",
    defense: doc.teams.defense.color ?? "#1e88e5",
  };

  const screenMap = useMemo(() => resolveScreenOverlaysAtT(doc, tMs), [doc, tMs]);

  // Completed pass trail lines (dashed, fade after pass)
  const passTrails = useMemo(() => {
    const passes = (doc.events ?? []).filter((e) => e.kind === "pass" && e.from && e.to);
    const trails: React.ReactNode[] = [];
    for (let i = 0; i < passes.length; i++) {
      const ev = passes[i];
      if (ev.t > tMs) continue;
      const endT = ev.t + PASS_FLY_MS;
      const passPoses = samplePoses(doc, ev.t);
      const fromP = passPoses[ev.from!];
      const endPoses = samplePoses(doc, endT);
      const toP = endPoses[ev.to!];
      if (!fromP || !toP) continue;
      const [x1, y1] = tacticToSvg(fromP.x, fromP.y, courtMode);
      const [x2, y2] = tacticToSvg(toP.x, toP.y, courtMode);

      if (PASS_FLY_MS > 0 && tMs < endT) {
        // Pass in flight — partial dashed trail
        const progress = (tMs - ev.t) / PASS_FLY_MS;
        const bx = lerp(x1, x2, progress);
        const by = lerp(y1, y2, progress);
        trails.push(
          <line
            key={`trail-${i}`}
            x1={x1} y1={y1} x2={bx} y2={by}
            stroke="rgba(255,200,60,0.6)"
            strokeWidth="0.8"
            strokeDasharray="2 1.5"
          />,
        );
      } else {
        // Completed pass — full dashed trail, fading
        const fadeAge = tMs - endT;
        const opacity = Math.max(0, 0.5 - fadeAge / 3000);
        if (opacity > 0.02) {
          trails.push(
            <line
              key={`trail-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,200,60,0.5)"
              strokeWidth="0.7"
              strokeDasharray="2.5 1.5"
              opacity={opacity}
              markerEnd="url(#arrow)"
            />,
          );
        }
      }
    }
    return trails;
  }, [doc, tMs, courtMode]);

  // Movement trails for preview — includes partial in-progress segment
  const movementTrails = useMemo(() => {
    const players = doc.actors.filter((a) => a.type === "player");
    const kfs = doc.keyframes;
    if (kfs.length < 2) return null;
    const trails: React.ReactNode[] = [];

    for (const actor of players) {
      if (actor.type !== "player") continue;
      const color = teamColors[actor.team] ?? teamColors.offense;

      for (let i = 1; i < kfs.length; i++) {
        const prevPose = kfs[i - 1].poses[actor.id];
        const currPose = kfs[i].poses[actor.id];
        if (!prevPose || !currPose) continue;
        if (kfs[i - 1].t > tMs) break;

        const [x0, y0] = tacticToSvg(prevPose.x, prevPose.y, courtMode);
        const [x1, y1] = tacticToSvg(currPose.x, currPose.y, courtMode);
        if (Math.abs(x1 - x0) < 0.5 && Math.abs(y1 - y0) < 0.5) continue;

        const holder = resolveBallHolderAt(doc, kfs[i - 1].t, true);
        const isDribble = holder === actor.id;
        const hasCp = currPose.cpx !== undefined && currPose.cpy !== undefined;
        const cp: [number, number] | null = hasCp
          ? tacticToSvg(currPose.cpx!, currPose.cpy!, courtMode)
          : null;

        const completed = kfs[i].t <= tMs;
        // For in-progress segment, compute the endpoint at current time
        let endX = x1, endY = y1;
        let partialCp = cp;
        if (!completed) {
          const segDur = kfs[i].t - kfs[i - 1].t;
          const s = segDur > 0 ? (tMs - kfs[i - 1].t) / segDur : 1;
          if (cp) {
            // Partial quadratic bezier: split at parameter s
            // de Casteljau: intermediate point and endpoint
            const mx1 = lerp(x0, cp[0], s);
            const my1 = lerp(y0, cp[1], s);
            const mx2 = lerp(cp[0], x1, s);
            const my2 = lerp(cp[1], y1, s);
            endX = lerp(mx1, mx2, s);
            endY = lerp(my1, my2, s);
            partialCp = [mx1, my1];
          } else {
            endX = lerp(x0, x1, s);
            endY = lerp(y0, y1, s);
          }
        }

        if (isDribble) {
          const pts: [number, number][] = partialCp
            ? sampleBezier([x0, y0], partialCp, [endX, endY], 30)
            : [[x0, y0], [endX, endY]];
          trails.push(
            <path
              key={`mv-${actor.id}-${i}`}
              d={wavyPathD(pts)}
              fill="none"
              stroke={color}
              strokeWidth="0.7"
              opacity="0.35"
            />,
          );
        } else if (partialCp) {
          trails.push(
            <path
              key={`mv-${actor.id}-${i}`}
              d={`M ${x0} ${y0} Q ${partialCp[0]} ${partialCp[1]} ${endX} ${endY}`}
              fill="none"
              stroke={color}
              strokeWidth="0.6"
              opacity="0.3"
            />,
          );
        } else {
          trails.push(
            <line
              key={`mv-${actor.id}-${i}`}
              x1={x0} y1={y0} x2={endX} y2={endY}
              stroke={color}
              strokeWidth="0.6"
              opacity="0.3"
            />,
          );
        }
      }
    }
    return trails.length > 0 ? <g className="preview-trails">{trails}</g> : null;
  }, [doc, tMs, courtMode, teamColors]);

  // Ball in flight
  const ballFlight = useMemo(() => {
    if (!ballState.flight) return null;
    const { fromX, fromY, toX, toY, progress } = ballState.flight;
    const bx = lerp(fromX, toX, progress);
    const by = lerp(fromY, toY, progress);
    const [sx, sy] = tacticToSvg(bx, by, courtMode);
    return (
      <circle
        cx={sx}
        cy={sy}
        r={2.2}
        fill="#ffab40"
        stroke="#3d2200"
        strokeWidth="0.5"
      />
    );
  }, [ballState.flight, courtMode]);

  return (
    <CourtSVG mode={courtMode}>
      {/* Movement trails (subtle) */}
      {movementTrails}

      {/* Pass trails */}
      {passTrails}

      {doc.actors.map((a) => {
        if (a.type === "ball") {
          if (ballState.holder || ballState.flight) return null;
          const p = poses[a.id] ?? { x: 0.5, y: 0.5 };
          const [sx, sy] = tacticToSvg(p.x, p.y, courtMode);
          return (
            <circle
              key={a.id}
              cx={sx} cy={sy} r={2.2}
              fill="#ffab40" stroke="#3d2200" strokeWidth="0.4"
            />
          );
        }
        const p = poses[a.id];
        if (!p) return null;
        const [sx, sy] = tacticToSvg(p.x, p.y, courtMode);
        const color = teamColors[a.team] ?? teamColors.offense;
        const holdsBall = a.id === ballState.holder;
        return (
          <g key={a.id}>
            {holdsBall && (
              <circle cx={sx} cy={sy} r={6} fill="none" stroke="#ffab40" strokeWidth="1.2" opacity="0.85" />
            )}
            <circle cx={sx} cy={sy} r={4} fill={color} stroke="#000" strokeWidth="0.4" />
            <text
              x={sx} y={sy}
              textAnchor="middle" dominantBaseline="central"
              fill="#fff" fontSize={3.2} fontWeight="bold"
              style={{ pointerEvents: "none" }}
            >
              {a.label}
            </text>
          </g>
        );
      })}

      {/* Screen markers above all players; ball in flight stays on top */}
      <g style={{ pointerEvents: "none" }}>
        {doc.actors.map((a) => {
          if (a.type !== "player") return null;
          const p = poses[a.id];
          if (!p) return null;
          const scrAngle = screenMap.get(a.id);
          if (scrAngle === undefined) return null;
          const [sx, sy] = tacticToSvg(p.x, p.y, courtMode);
          return (
            <g key={`screen-${a.id}`} transform={`translate(${sx}, ${sy}) rotate(${scrAngle})`}>
              <line x1={-3.5} y1={-9} x2={3.5} y2={-9} stroke="#ffeb3b" strokeWidth="1.2" strokeLinecap="round" />
              <line x1={0} y1={-9} x2={0} y2={-5} stroke="#ffeb3b" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          );
        })}
      </g>

      {/* Ball in flight — rendered above player dots so it stays visible */}
      {ballFlight}
    </CourtSVG>
  );
}
