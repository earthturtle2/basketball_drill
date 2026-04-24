import type { TacticDocumentV1 } from "@basketball/shared";
import { samplePoses } from "./viewer-math";
import { tacticToSvg, type CourtMode } from "./court-geometry";

interface Props {
  document: TacticDocumentV1;
  courtMode?: CourtMode;
}

export function PassLines({ document, courtMode = "half" }: Props) {
  const passes = (document.events ?? []).filter(
    (e) => e.kind === "pass" && e.from && e.to,
  );
  if (passes.length === 0) return null;

  return (
    <g className="pass-lines">
      {passes.map((ev, i) => {
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
            stroke="rgba(255,200,60,0.7)"
            strokeWidth="0.8"
            markerEnd="url(#arrow)"
          />
        );
      })}
    </g>
  );
}
