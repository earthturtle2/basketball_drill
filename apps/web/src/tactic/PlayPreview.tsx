import { useMemo } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import { samplePoses } from "./viewer-math";
import { CourtSVG } from "./CourtSVG";
import { tacticToSvg, type CourtMode } from "./court-geometry";

export function PlayPreview({
  document,
  tMs,
  courtMode = "half",
}: {
  document: TacticDocumentV1;
  tMs: number;
  courtMode?: CourtMode;
}) {
  const poses = useMemo(() => samplePoses(document, tMs), [document, tMs]);

  const teamColors = {
    offense: document.teams.offense.color ?? "#e53935",
    defense: document.teams.defense.color ?? "#1e88e5",
  };

  const ballActor = document.actors.find((a) => a.type === "ball");
  const ballHolderId = ballActor?.type === "ball" ? ballActor.heldBy : undefined;

  return (
    <CourtSVG mode={courtMode}>
      {document.actors.map((a) => {
        if (a.type === "ball") {
          // Only render standalone ball if no one holds it
          if (ballHolderId) return null;
          const p = poses[a.id] ?? { x: 0.5, y: 0.5 };
          const [sx, sy] = tacticToSvg(p.x, p.y, courtMode);
          return (
            <circle
              key={a.id}
              cx={sx}
              cy={sy}
              r={2.2}
              fill="#ffab40"
              stroke="#3d2200"
              strokeWidth="0.4"
            />
          );
        }
        const p = poses[a.id];
        if (!p) return null;
        const [sx, sy] = tacticToSvg(p.x, p.y, courtMode);
        const color = teamColors[a.team] ?? teamColors.offense;
        const holdsball = a.id === ballHolderId;
        return (
          <g key={a.id}>
            {holdsball && (
              <circle cx={sx} cy={sy} r={6} fill="none" stroke="#ffab40" strokeWidth="1.2" opacity="0.85" />
            )}
            <circle cx={sx} cy={sy} r={4} fill={color} stroke="#000" strokeWidth="0.4" />
            <text
              x={sx}
              y={sy}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={3.2}
              fontWeight="bold"
              style={{ pointerEvents: "none" }}
            >
              {a.label}
            </text>
          </g>
        );
      })}
    </CourtSVG>
  );
}
