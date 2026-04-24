import { useMemo } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import { samplePoses } from "./viewer-math";
import { CourtSVG } from "./CourtSVG";
import { tacticToSvg } from "./court-geometry";

export function PlayPreview({
  document,
  tMs,
}: {
  document: TacticDocumentV1;
  tMs: number;
}) {
  const poses = useMemo(() => samplePoses(document, tMs), [document, tMs]);

  const teamColors = {
    offense: document.teams.offense.color ?? "#e53935",
    defense: document.teams.defense.color ?? "#1e88e5",
  };

  return (
    <CourtSVG>
      {document.actors.map((a) => {
        if (a.type === "ball") {
          const holder = a.heldBy ? poses[a.heldBy] : null;
          const p = holder ?? poses[a.id] ?? { x: 0.5, y: 0.5 };
          const [sx, sy] = tacticToSvg(p.x, p.y);
          return (
            <circle
              key={a.id}
              cx={sx}
              cy={sy}
              r={2.8}
              fill="#ffab40"
              stroke="#3d2200"
              strokeWidth="0.5"
            />
          );
        }
        const p = poses[a.id];
        if (!p) return null;
        const [sx, sy] = tacticToSvg(p.x, p.y);
        const color = teamColors[a.team] ?? teamColors.offense;
        return (
          <g key={a.id}>
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
