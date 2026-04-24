import type { TacticDocumentV1 } from "@basketball/shared";
import { tacticToSvg, type CourtMode } from "./court-geometry";
import { resolveBallHolderAt } from "./viewer-math";

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

export function MovementTrails({ document: doc, teamColors, courtMode = "half", upToKeyframeIndex }: Props) {
  const players = doc.actors.filter((a) => a.type === "player");
  const kfs = doc.keyframes;
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

          const holder = resolveBallHolderAt(doc, kfs[i - 1].t, true);
          const isDribble = holder === actor.id;

          const hasCp = currPose.cpx !== undefined && currPose.cpy !== undefined;
          const cp: [number, number] | null = hasCp
            ? tacticToSvg(currPose.cpx!, currPose.cpy!, courtMode)
            : null;

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
