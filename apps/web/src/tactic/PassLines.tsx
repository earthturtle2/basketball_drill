import type { TacticDocumentV1 } from "@basketball/shared";
import { samplePoses } from "./viewer-math";
import { tacticToSvg, type CourtMode } from "./court-geometry";

interface Props {
  document: TacticDocumentV1;
  courtMode?: CourtMode;
  /**
   * Editor: only show passes whose event time falls in [kf0.t .. kf[k].t] across
   * the union of time windows for segments 1..k (same scope as movement trails).
   * k=0 means show nothing. When omitted, show all passes (no editor clipping).
   */
  cumulativeUptoKeyframeIndex?: number;
}

/**
 * True iff the pass instant falls in the union of time segments
 * [i-1]→[i] for i=1..k in **document** keyframe order, matching MovementTrails.
 * k=0: nothing (no “past” yet). Same as showing passes only for motion drawn up to k.
 */
function passInCumulativeKeyRange(
  t: number,
  keyframes: { t: number }[],
  k: number,
): boolean {
  if (k < 1) return false;
  const n = keyframes.length;
  if (n < 2) return false;
  const kClamped = Math.min(k, n - 1);
  for (let i = 1; i <= kClamped; i++) {
    const a = keyframes[i - 1]!.t;
    const b = keyframes[i]!.t;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (t >= lo && t <= hi) return true;
  }
  return false;
}

export function PassLines({ document, courtMode = "half", cumulativeUptoKeyframeIndex }: Props) {
  const passes = (document.events ?? []).filter(
    (e) => e.kind === "pass" && e.from && e.to,
  );
  const kfs = document.keyframes;
  const filtered =
    cumulativeUptoKeyframeIndex === undefined
      ? passes
      : passes.filter((e) => passInCumulativeKeyRange(e.t, kfs, cumulativeUptoKeyframeIndex));
  if (filtered.length === 0) return null;

  return (
    <g className="pass-lines">
      {filtered.map((ev, i) => {
        const poses = samplePoses(document, ev.t);
        const fromP = poses[ev.from!];
        const toP = poses[ev.to!];
        if (!fromP || !toP) return null;
        const [x1, y1] = tacticToSvg(fromP.x, fromP.y, courtMode);
        const [x2, y2] = tacticToSvg(toP.x, toP.y, courtMode);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255,200,60,0.5)"
            strokeWidth="0.8"
            strokeDasharray="3 2"
            markerEnd="url(#arrow)"
          />
        );
      })}
    </g>
  );
}
