import type { TacticDocumentV1 } from "./tactic-v1.zod.js";

export const DEFAULT_TACTIC_DOCUMENT: TacticDocumentV1 = {
  schemaVersion: 1,
  meta: {
    name: "新战术",
    description: "",
    tags: [],
    court: {
      preset: "half",
      orientation: "home_attacks_right",
      sizeMeters: { length: 14, width: 15 },
    },
    durationMs: 2000,
  },
  teams: {
    offense: { id: "off", label: "进攻", color: "#e53935" },
    defense: { id: "def", label: "防守", color: "#1e88e5" },
  },
  actors: [
    { id: "p1", type: "player", team: "offense", number: 1, label: "1" },
    { id: "ball", type: "ball", heldBy: "p1" },
  ],
  keyframes: [
    { t: 0, poses: { p1: { x: 0.2, y: 0.5, facingDeg: 90 } } },
    { t: 2000, poses: { p1: { x: 0.6, y: 0.5, facingDeg: 90 } } },
  ],
  interpolation: { position: "linear", facing: "shortestAngle" },
  rules: { coordinateSystem: "normalized", bounds: { x: [0, 1], y: [0, 1] } },
};
