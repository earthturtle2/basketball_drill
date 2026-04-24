import { useMemo } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import { samplePoses } from "./viewer-math";
import { CourtSVG } from "./CourtSVG";
import { tacticToSvg, type CourtMode } from "./court-geometry";

/**
 * Resolve who holds the ball at time `tMs` by replaying pass events
 * on top of the initial heldBy value.
 */
function resolveBallHolder(doc: TacticDocumentV1, tMs: number): string | undefined {
  const ball = doc.actors.find((a) => a.type === "ball");
  let holder = ball?.type === "ball" ? ball.heldBy : undefined;

  const passes = (doc.events ?? [])
    .filter((e) => e.kind === "pass" && e.from && e.to)
    .sort((a, b) => a.t - b.t);

  for (const p of passes) {
    if (p.t <= tMs) {
      holder = p.to;
    } else {
      break;
    }
  }
  return holder;
}

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
  const ballHolderId = useMemo(() => resolveBallHolder(document, tMs), [document, tMs]);

  const teamColors = {
    offense: document.teams.offense.color ?? "#e53935",
    defense: document.teams.defense.color ?? "#1e88e5",
  };

  return (
    <CourtSVG mode={courtMode}>
      {document.actors.map((a) => {
        if (a.type === "ball") {
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
        const holdsBall = a.id === ballHolderId;
        return (
          <g key={a.id}>
            {holdsBall && (
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
