import type { TacticDocumentV1 } from "@basketball/shared";
import { samplePoses } from "./viewer-math";
import { tacticToSvg, type CourtMode } from "./court-geometry";

interface Props {
  document: TacticDocumentV1;
  courtMode?: CourtMode;
  /** Only show pass events with event time t <= this (ms). Omitted = show all. */
  upToTMs?: number;
}

export function PassLines({ document, courtMode = "half", upToTMs }: Props) {
  const passes = (document.events ?? []).filter(
    (e) => e.kind === "pass" && e.from && e.to,
  );
  const filtered =
    upToTMs === undefined ? passes : passes.filter((e) => e.t <= upToTMs);
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
