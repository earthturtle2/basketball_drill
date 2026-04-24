import type { TacticDocumentV1 } from "@basketball/shared";
import { tacticToSvg, type CourtMode } from "./court-geometry";

interface Props {
  document: TacticDocumentV1;
  teamColors: { offense: string; defense: string };
  courtMode?: CourtMode;
}

export function MovementTrails({ document, teamColors, courtMode = "half" }: Props) {
  const actorTeam: Record<string, "offense" | "defense"> = {};
  for (const a of document.actors) {
    if (a.type === "player") actorTeam[a.id] = a.team;
  }

  const actorIds = Object.keys(actorTeam);

  return (
    <g className="movement-trails">
      {actorIds.map((id) => {
        const points = document.keyframes
          .map((kf) => kf.poses[id])
          .filter(Boolean)
          .map((p) => tacticToSvg(p!.x, p!.y, courtMode));

        if (points.length < 2) return null;

        return (
          <polyline
            key={id}
            points={points.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke={teamColors[actorTeam[id]!] ?? teamColors.offense}
            strokeWidth="0.8"
            strokeDasharray="2.5 1.5"
            opacity="0.4"
          />
        );
      })}
    </g>
  );
}
