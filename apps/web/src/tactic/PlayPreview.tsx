import { useMemo } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import { samplePoses } from "./viewer-math";

const teams = {
  offense: "#e53935",
  defense: "#1e88e5",
} as const;

export function PlayPreview({ document, tMs }: { document: TacticDocumentV1; tMs: number }) {
  const poses = useMemo(() => samplePoses(document, tMs), [document, tMs]);

  return (
    <div className="viewer">
      <div className="court">
        {document.actors.map((a) => {
          if (a.type === "ball") {
            const holder = a.heldBy ? poses[a.heldBy] : null;
            const p = holder ?? poses[a.id] ?? { x: 0.5, y: 0.5 };
            return (
              <div
                key={a.id}
                className="dot ball"
                style={{ left: `${p.x * 100}%`, top: `${(1 - p.y) * 100}%` }}
                title="球"
              />
            );
          }
          const p = poses[a.id];
          if (!p) return null;
          const col = teams[a.team] ?? teams.offense;
          return (
            <div
              key={a.id}
              className="dot"
              style={{
                left: `${p.x * 100}%`,
                top: `${(1 - p.y) * 100}%`,
                background: col,
              }}
              title={a.label}
            >
              {a.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
