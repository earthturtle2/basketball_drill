import type { TacticDocumentV1 } from "@basketball/shared";

/**
 * Built-ins follow common teaching shapes (FIBA / USA Basketball style drill
 * diagrams): spread pick-and-roll 3v0, primary break 3v2, Horns-style elbow
 * entry 4v0, two-man elbow DHO, and a 5-defender 1-3-1 shell. Roster size
 * matches each drill — not every template is 5v5.
 */
export interface Template {
  id: string;
  nameKey: string;
  descKey: string;
  document: TacticDocumentV1;
}

const BASE_TEAMS = {
  offense: { id: "o", label: "Offense", color: "#e53935" },
  defense: { id: "d", label: "Defense", color: "#1e88e5" },
};

/** ~10s, 8 keyframes; normalized coords, basket toward +x. */
const T8 = [0, 1428, 2857, 4285, 5714, 7142, 8571, 10_000] as const;

export const TEMPLATES: Template[] = [
  {
    id: "high-pnr",
    nameKey: "tpl.highPnr.name",
    descKey: "tpl.highPnr.desc",
    document: {
      schemaVersion: 1,
      meta: {
        name: "Spread Pick & Roll (3v0)",
        description: "Three-man shell: corner stays home, high ball-screen, roll pass.",
        durationMs: 10_000,
      },
      teams: BASE_TEAMS,
      actors: [
        { id: "o1", type: "player", team: "offense", number: 1, label: "1" },
        { id: "o5", type: "player", team: "offense", number: 5, label: "5" },
        { id: "o2", type: "player", team: "offense", number: 2, label: "2" },
        { id: "ball", type: "ball", heldBy: "o1" },
      ],
      keyframes: [
        {
          t: T8[0],
          poses: {
            o1: { x: 0.28, y: 0.5, facingDeg: 82 },
            o5: { x: 0.64, y: 0.55, facingDeg: 88 },
            o2: { x: 0.92, y: 0.84, facingDeg: 215 },
          },
        },
        {
          t: T8[1],
          poses: {
            o1: { x: 0.34, y: 0.5, facingDeg: 80 },
            o5: { x: 0.52, y: 0.52, facingDeg: 88 },
            o2: { x: 0.92, y: 0.84, facingDeg: 215 },
          },
        },
        {
          t: T8[2],
          poses: {
            o1: { x: 0.4, y: 0.48, facingDeg: 76 },
            o5: { x: 0.46, y: 0.52, facingDeg: 86 },
            o2: { x: 0.92, y: 0.84, facingDeg: 215 },
          },
        },
        {
          t: T8[3],
          poses: {
            o1: { x: 0.49, y: 0.42, facingDeg: 70 },
            o5: { x: 0.44, y: 0.54, facingDeg: 82 },
            o2: { x: 0.92, y: 0.84, facingDeg: 215 },
          },
        },
        {
          t: T8[4],
          poses: {
            o1: { x: 0.58, y: 0.36, facingDeg: 65 },
            o5: { x: 0.6, y: 0.58, facingDeg: 72 },
            o2: { x: 0.92, y: 0.84, facingDeg: 215 },
          },
        },
        {
          t: T8[5],
          poses: {
            o1: { x: 0.64, y: 0.4, facingDeg: 52 },
            o5: { x: 0.72, y: 0.54, facingDeg: 68 },
            o2: { x: 0.92, y: 0.84, facingDeg: 215 },
          },
        },
        {
          t: T8[6],
          poses: {
            o1: { x: 0.78, y: 0.34, facingDeg: 38 },
            o5: { x: 0.82, y: 0.5, facingDeg: 62 },
            o2: { x: 0.92, y: 0.84, facingDeg: 215 },
          },
        },
        {
          t: T8[7],
          poses: {
            o1: { x: 0.88, y: 0.3, facingDeg: 32 },
            o5: { x: 0.9, y: 0.5, facingDeg: 58 },
            o2: { x: 0.92, y: 0.84, facingDeg: 215 },
          },
        },
      ],
      events: [
        { t: 3800, kind: "screen", from: "o5", angle: 0 },
        { t: 5600, kind: "screen_end", from: "o5" },
        { t: 7200, kind: "pass", from: "o1", to: "o5" },
      ],
    },
  },
  {
    id: "fast-break",
    nameKey: "tpl.fastBreak.name",
    descKey: "tpl.fastBreak.desc",
    document: {
      schemaVersion: 1,
      meta: {
        name: "Primary break 3v2",
        description: "Outlet lanes vs. two defenders; middle drive, pitch to wing.",
        durationMs: 10_000,
      },
      teams: BASE_TEAMS,
      actors: [
        { id: "o1", type: "player", team: "offense", number: 1, label: "1" },
        { id: "o2", type: "player", team: "offense", number: 2, label: "2" },
        { id: "o3", type: "player", team: "offense", number: 3, label: "3" },
        { id: "d1", type: "player", team: "defense", number: 1, label: "D1" },
        { id: "d2", type: "player", team: "defense", number: 2, label: "D2" },
        { id: "ball", type: "ball", heldBy: "o1" },
      ],
      keyframes: [
        {
          t: T8[0],
          poses: {
            o1: { x: 0.08, y: 0.5, facingDeg: 88 },
            o2: { x: 0.06, y: 0.1, facingDeg: 85 },
            o3: { x: 0.06, y: 0.9, facingDeg: 92 },
            d1: { x: 0.7, y: 0.38, facingDeg: 265 },
            d2: { x: 0.7, y: 0.62, facingDeg: 275 },
          },
        },
        {
          t: T8[1],
          poses: {
            o1: { x: 0.2, y: 0.5, facingDeg: 88 },
            o2: { x: 0.16, y: 0.1, facingDeg: 85 },
            o3: { x: 0.16, y: 0.9, facingDeg: 92 },
            d1: { x: 0.66, y: 0.4, facingDeg: 265 },
            d2: { x: 0.66, y: 0.6, facingDeg: 275 },
          },
        },
        {
          t: T8[2],
          poses: {
            o1: { x: 0.34, y: 0.5, facingDeg: 88 },
            o2: { x: 0.28, y: 0.11, facingDeg: 82 },
            o3: { x: 0.28, y: 0.89, facingDeg: 95 },
            d1: { x: 0.62, y: 0.42, facingDeg: 265 },
            d2: { x: 0.62, y: 0.58, facingDeg: 275 },
          },
        },
        {
          t: T8[3],
          poses: {
            o1: { x: 0.46, y: 0.5, facingDeg: 88 },
            o2: { x: 0.4, y: 0.12, facingDeg: 78 },
            o3: { x: 0.4, y: 0.88, facingDeg: 98 },
            d1: { x: 0.58, y: 0.44, facingDeg: 265 },
            d2: { x: 0.58, y: 0.56, facingDeg: 275 },
          },
        },
        {
          t: T8[4],
          poses: {
            o1: { x: 0.54, y: 0.5, facingDeg: 88 },
            o2: { x: 0.52, y: 0.13, facingDeg: 75 },
            o3: { x: 0.52, y: 0.87, facingDeg: 100 },
            d1: { x: 0.56, y: 0.42, facingDeg: 270 },
            d2: { x: 0.56, y: 0.58, facingDeg: 270 },
          },
        },
        {
          t: T8[5],
          poses: {
            o1: { x: 0.58, y: 0.48, facingDeg: 70 },
            o2: { x: 0.62, y: 0.14, facingDeg: 72 },
            o3: { x: 0.62, y: 0.86, facingDeg: 102 },
            d1: { x: 0.54, y: 0.4, facingDeg: 275 },
            d2: { x: 0.54, y: 0.6, facingDeg: 275 },
          },
        },
        {
          t: T8[6],
          poses: {
            o1: { x: 0.62, y: 0.54, facingDeg: 55 },
            o2: { x: 0.78, y: 0.14, facingDeg: 68 },
            o3: { x: 0.74, y: 0.88, facingDeg: 105 },
            d1: { x: 0.58, y: 0.36, facingDeg: 280 },
            d2: { x: 0.58, y: 0.64, facingDeg: 280 },
          },
        },
        {
          t: T8[7],
          poses: {
            o1: { x: 0.68, y: 0.56, facingDeg: 48 },
            o2: { x: 0.9, y: 0.13, facingDeg: 65 },
            o3: { x: 0.82, y: 0.88, facingDeg: 108 },
            d1: { x: 0.62, y: 0.34, facingDeg: 285 },
            d2: { x: 0.62, y: 0.66, facingDeg: 285 },
          },
        },
      ],
      events: [{ t: 6800, kind: "pass", from: "o1", to: "o2" }],
    },
  },
  {
    id: "horns",
    nameKey: "tpl.horns.name",
    descKey: "tpl.horns.desc",
    document: {
      schemaVersion: 1,
      meta: {
        name: "Horns entry (4v0)",
        description: "Double elbows, one corner filled; PG entry and corner pass.",
        durationMs: 10_000,
      },
      teams: BASE_TEAMS,
      actors: [
        { id: "o1", type: "player", team: "offense", number: 1, label: "1" },
        { id: "o2", type: "player", team: "offense", number: 2, label: "2" },
        { id: "o4", type: "player", team: "offense", number: 4, label: "4" },
        { id: "o5", type: "player", team: "offense", number: 5, label: "5" },
        { id: "ball", type: "ball", heldBy: "o1" },
      ],
      keyframes: [
        {
          t: T8[0],
          poses: {
            o1: { x: 0.28, y: 0.5, facingDeg: 88 },
            o2: { x: 0.91, y: 0.86, facingDeg: 205 },
            o4: { x: 0.44, y: 0.62, facingDeg: 92 },
            o5: { x: 0.44, y: 0.38, facingDeg: 90 },
          },
        },
        {
          t: T8[1],
          poses: {
            o1: { x: 0.32, y: 0.49, facingDeg: 82 },
            o2: { x: 0.91, y: 0.85, facingDeg: 205 },
            o4: { x: 0.45, y: 0.62, facingDeg: 90 },
            o5: { x: 0.45, y: 0.38, facingDeg: 88 },
          },
        },
        {
          t: T8[2],
          poses: {
            o1: { x: 0.38, y: 0.47, facingDeg: 75 },
            o2: { x: 0.9, y: 0.84, facingDeg: 208 },
            o4: { x: 0.47, y: 0.62, facingDeg: 88 },
            o5: { x: 0.46, y: 0.38, facingDeg: 86 },
          },
        },
        {
          t: T8[3],
          poses: {
            o1: { x: 0.44, y: 0.44, facingDeg: 58 },
            o2: { x: 0.89, y: 0.83, facingDeg: 210 },
            o4: { x: 0.51, y: 0.62, facingDeg: 78 },
            o5: { x: 0.42, y: 0.36, facingDeg: 82 },
          },
        },
        {
          t: T8[4],
          poses: {
            o1: { x: 0.54, y: 0.34, facingDeg: 42 },
            o2: { x: 0.88, y: 0.82, facingDeg: 212 },
            o4: { x: 0.55, y: 0.6, facingDeg: 72 },
            o5: { x: 0.48, y: 0.4, facingDeg: 78 },
          },
        },
        {
          t: T8[5],
          poses: {
            o1: { x: 0.64, y: 0.28, facingDeg: 32 },
            o2: { x: 0.87, y: 0.81, facingDeg: 215 },
            o4: { x: 0.6, y: 0.56, facingDeg: 68 },
            o5: { x: 0.52, y: 0.42, facingDeg: 72 },
          },
        },
        {
          t: T8[6],
          poses: {
            o1: { x: 0.72, y: 0.26, facingDeg: 25 },
            o2: { x: 0.9, y: 0.85, facingDeg: 220 },
            o4: { x: 0.66, y: 0.54, facingDeg: 62 },
            o5: { x: 0.7, y: 0.4, facingDeg: 68 },
          },
        },
        {
          t: T8[7],
          poses: {
            o1: { x: 0.78, y: 0.24, facingDeg: 20 },
            o2: { x: 0.91, y: 0.86, facingDeg: 222 },
            o4: { x: 0.72, y: 0.52, facingDeg: 58 },
            o5: { x: 0.74, y: 0.38, facingDeg: 65 },
          },
        },
      ],
      events: [
        { t: 3200, kind: "pass", from: "o1", to: "o4" },
        { t: 7600, kind: "pass", from: "o4", to: "o2" },
      ],
    },
  },
  {
    id: "handoff",
    nameKey: "tpl.handoff.name",
    descKey: "tpl.handoff.desc",
    document: {
      schemaVersion: 1,
      meta: {
        name: "Elbow DHO (2v0)",
        description: "Two-man dribble handoff at the elbow; receiver attacks.",
        durationMs: 10_000,
      },
      teams: BASE_TEAMS,
      actors: [
        { id: "o1", type: "player", team: "offense", number: 1, label: "1" },
        { id: "o2", type: "player", team: "offense", number: 2, label: "2" },
        { id: "ball", type: "ball", heldBy: "o2" },
      ],
      keyframes: [
        {
          t: T8[0],
          poses: {
            o1: { x: 0.22, y: 0.28, facingDeg: 68 },
            o2: { x: 0.52, y: 0.54, facingDeg: 92 },
          },
        },
        {
          t: T8[1],
          poses: {
            o1: { x: 0.3, y: 0.36, facingDeg: 72 },
            o2: { x: 0.52, y: 0.53, facingDeg: 90 },
          },
        },
        {
          t: T8[2],
          poses: {
            o1: { x: 0.38, y: 0.42, facingDeg: 76 },
            o2: { x: 0.51, y: 0.52, facingDeg: 88 },
          },
        },
        {
          t: T8[3],
          poses: {
            o1: { x: 0.45, y: 0.46, facingDeg: 80 },
            o2: { x: 0.5, y: 0.51, facingDeg: 86 },
          },
        },
        {
          t: T8[4],
          poses: {
            o1: { x: 0.52, y: 0.47, facingDeg: 78 },
            o2: { x: 0.49, y: 0.51, facingDeg: 84 },
          },
        },
        {
          t: T8[5],
          poses: {
            o1: { x: 0.62, y: 0.46, facingDeg: 72 },
            o2: { x: 0.46, y: 0.53, facingDeg: 78 },
          },
        },
        {
          t: T8[6],
          poses: {
            o1: { x: 0.74, y: 0.48, facingDeg: 68 },
            o2: { x: 0.44, y: 0.55, facingDeg: 74 },
          },
        },
        {
          t: T8[7],
          poses: {
            o1: { x: 0.86, y: 0.5, facingDeg: 65 },
            o2: { x: 0.42, y: 0.56, facingDeg: 72 },
          },
        },
      ],
      events: [{ t: 4200, kind: "pass", from: "o2", to: "o1" }],
    },
  },
  {
    id: "zone-131",
    nameKey: "tpl.zone131.name",
    descKey: "tpl.zone131.desc",
    document: {
      schemaVersion: 1,
      meta: {
        name: "1-3-1 zone shell (5)",
        description: "Five defenders in a 1-3-1 vs. imaginary ball movement.",
        durationMs: 10_000,
      },
      teams: BASE_TEAMS,
      actors: [
        { id: "d1", type: "player", team: "defense", number: 1, label: "D1" },
        { id: "d2", type: "player", team: "defense", number: 2, label: "D2" },
        { id: "d3", type: "player", team: "defense", number: 3, label: "D3" },
        { id: "d4", type: "player", team: "defense", number: 4, label: "D4" },
        { id: "d5", type: "player", team: "defense", number: 5, label: "D5" },
        { id: "ball", type: "ball" },
      ],
      keyframes: [
        {
          t: T8[0],
          poses: {
            d1: { x: 0.36, y: 0.5, facingDeg: 88 },
            d2: { x: 0.54, y: 0.2, facingDeg: 98 },
            d3: { x: 0.56, y: 0.5, facingDeg: 88 },
            d4: { x: 0.54, y: 0.8, facingDeg: 82 },
            d5: { x: 0.78, y: 0.5, facingDeg: 268 },
            ball: { x: 0.24, y: 0.5 },
          },
        },
        {
          t: T8[1],
          poses: {
            d1: { x: 0.38, y: 0.5, facingDeg: 88 },
            d2: { x: 0.54, y: 0.22, facingDeg: 98 },
            d3: { x: 0.56, y: 0.5, facingDeg: 88 },
            d4: { x: 0.54, y: 0.78, facingDeg: 82 },
            d5: { x: 0.78, y: 0.5, facingDeg: 268 },
            ball: { x: 0.3, y: 0.5 },
          },
        },
        {
          t: T8[2],
          poses: {
            d1: { x: 0.4, y: 0.54, facingDeg: 95 },
            d2: { x: 0.52, y: 0.24, facingDeg: 102 },
            d3: { x: 0.54, y: 0.52, facingDeg: 90 },
            d4: { x: 0.6, y: 0.74, facingDeg: 76 },
            d5: { x: 0.76, y: 0.48, facingDeg: 272 },
            ball: { x: 0.36, y: 0.72 },
          },
        },
        {
          t: T8[3],
          poses: {
            d1: { x: 0.42, y: 0.44, facingDeg: 72 },
            d2: { x: 0.5, y: 0.28, facingDeg: 108 },
            d3: { x: 0.52, y: 0.48, facingDeg: 86 },
            d4: { x: 0.64, y: 0.7, facingDeg: 70 },
            d5: { x: 0.72, y: 0.42, facingDeg: 288 },
            ball: { x: 0.3, y: 0.86 },
          },
        },
        {
          t: T8[4],
          poses: {
            d1: { x: 0.44, y: 0.4, facingDeg: 65 },
            d2: { x: 0.56, y: 0.32, facingDeg: 112 },
            d3: { x: 0.5, y: 0.46, facingDeg: 84 },
            d4: { x: 0.66, y: 0.82, facingDeg: 66 },
            d5: { x: 0.6, y: 0.78, facingDeg: 302 },
            ball: { x: 0.26, y: 0.88 },
          },
        },
        {
          t: T8[5],
          poses: {
            d1: { x: 0.46, y: 0.46, facingDeg: 88 },
            d2: { x: 0.62, y: 0.22, facingDeg: 118 },
            d3: { x: 0.48, y: 0.5, facingDeg: 80 },
            d4: { x: 0.56, y: 0.76, facingDeg: 86 },
            d5: { x: 0.76, y: 0.52, facingDeg: 268 },
            ball: { x: 0.34, y: 0.2 },
          },
        },
        {
          t: T8[6],
          poses: {
            d1: { x: 0.4, y: 0.52, facingDeg: 95 },
            d2: { x: 0.58, y: 0.2, facingDeg: 105 },
            d3: { x: 0.52, y: 0.52, facingDeg: 90 },
            d4: { x: 0.56, y: 0.78, facingDeg: 84 },
            d5: { x: 0.8, y: 0.48, facingDeg: 266 },
            ball: { x: 0.32, y: 0.5 },
          },
        },
        {
          t: T8[7],
          poses: {
            d1: { x: 0.38, y: 0.5, facingDeg: 88 },
            d2: { x: 0.54, y: 0.2, facingDeg: 98 },
            d3: { x: 0.56, y: 0.5, facingDeg: 88 },
            d4: { x: 0.54, y: 0.8, facingDeg: 82 },
            d5: { x: 0.78, y: 0.5, facingDeg: 268 },
            ball: { x: 0.26, y: 0.5 },
          },
        },
      ],
    },
  },
];
