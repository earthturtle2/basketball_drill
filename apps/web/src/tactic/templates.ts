import type { TacticDocumentV1 } from "@basketball/shared";

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

/** ~10s timeline, 8 evenly spaced keyframes (0 … 10000). */
const T8 = [0, 1428, 2857, 4285, 5714, 7142, 8571, 10_000] as const;

export const TEMPLATES: Template[] = [
  {
    id: "high-pnr",
    nameKey: "tpl.highPnr.name",
    descKey: "tpl.highPnr.desc",
    document: {
      schemaVersion: 1,
      meta: { name: "High Pick & Roll", durationMs: 10_000 },
      teams: BASE_TEAMS,
      actors: [
        { id: "o1", type: "player", team: "offense", number: 1, label: "1" },
        { id: "o2", type: "player", team: "offense", number: 2, label: "2" },
        { id: "o3", type: "player", team: "offense", number: 3, label: "3" },
        { id: "o4", type: "player", team: "offense", number: 4, label: "4" },
        { id: "o5", type: "player", team: "offense", number: 5, label: "5" },
        { id: "ball", type: "ball", heldBy: "o1" },
      ],
      keyframes: [
        {
          t: T8[0],
          poses: {
            o1: { x: 0.3, y: 0.5, facingDeg: 85 },
            o2: { x: 0.9, y: 0.78, facingDeg: 200 },
            o3: { x: 0.9, y: 0.22, facingDeg: 160 },
            o4: { x: 0.72, y: 0.55, facingDeg: 195 },
            o5: { x: 0.58, y: 0.48, facingDeg: 95 },
          },
        },
        {
          t: T8[1],
          poses: {
            o1: { x: 0.34, y: 0.5, facingDeg: 82 },
            o2: { x: 0.9, y: 0.76, facingDeg: 200 },
            o3: { x: 0.9, y: 0.24, facingDeg: 160 },
            o4: { x: 0.74, y: 0.52, facingDeg: 195 },
            o5: { x: 0.5, y: 0.52, facingDeg: 90 },
          },
        },
        {
          t: T8[2],
          poses: {
            o1: { x: 0.4, y: 0.48, facingDeg: 78 },
            o2: { x: 0.9, y: 0.74, facingDeg: 200 },
            o3: { x: 0.88, y: 0.26, facingDeg: 160 },
            o4: { x: 0.76, y: 0.48, facingDeg: 200 },
            o5: { x: 0.46, y: 0.52, facingDeg: 88 },
          },
        },
        {
          t: T8[3],
          poses: {
            o1: { x: 0.48, y: 0.42, facingDeg: 72 },
            o2: { x: 0.88, y: 0.72, facingDeg: 205 },
            o3: { x: 0.86, y: 0.28, facingDeg: 155 },
            o4: { x: 0.8, y: 0.42, facingDeg: 210 },
            o5: { x: 0.44, y: 0.54, facingDeg: 85 },
          },
        },
        {
          t: T8[4],
          poses: {
            o1: { x: 0.58, y: 0.36, facingDeg: 68 },
            o2: { x: 0.86, y: 0.7, facingDeg: 210 },
            o3: { x: 0.84, y: 0.3, facingDeg: 150 },
            o4: { x: 0.84, y: 0.38, facingDeg: 215 },
            o5: { x: 0.62, y: 0.58, facingDeg: 75 },
          },
        },
        {
          t: T8[5],
          poses: {
            o1: { x: 0.64, y: 0.4, facingDeg: 55 },
            o2: { x: 0.84, y: 0.68, facingDeg: 215 },
            o3: { x: 0.82, y: 0.32, facingDeg: 145 },
            o4: { x: 0.86, y: 0.36, facingDeg: 220 },
            o5: { x: 0.72, y: 0.52, facingDeg: 70 },
          },
        },
        {
          t: T8[6],
          poses: {
            o1: { x: 0.78, y: 0.32, facingDeg: 40 },
            o2: { x: 0.82, y: 0.66, facingDeg: 220 },
            o3: { x: 0.8, y: 0.34, facingDeg: 140 },
            o4: { x: 0.88, y: 0.34, facingDeg: 225 },
            o5: { x: 0.82, y: 0.5, facingDeg: 65 },
          },
        },
        {
          t: T8[7],
          poses: {
            o1: { x: 0.86, y: 0.28, facingDeg: 35 },
            o2: { x: 0.8, y: 0.64, facingDeg: 225 },
            o3: { x: 0.78, y: 0.36, facingDeg: 135 },
            o4: { x: 0.9, y: 0.32, facingDeg: 230 },
            o5: { x: 0.9, y: 0.5, facingDeg: 60 },
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
      meta: { name: "Fast Break 3v2", durationMs: 10_000 },
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
            o2: { x: 0.06, y: 0.26, facingDeg: 85 },
            o3: { x: 0.06, y: 0.74, facingDeg: 92 },
            d1: { x: 0.7, y: 0.38, facingDeg: 265 },
            d2: { x: 0.7, y: 0.62, facingDeg: 275 },
          },
        },
        {
          t: T8[1],
          poses: {
            o1: { x: 0.2, y: 0.5, facingDeg: 88 },
            o2: { x: 0.16, y: 0.24, facingDeg: 85 },
            o3: { x: 0.16, y: 0.76, facingDeg: 92 },
            d1: { x: 0.66, y: 0.4, facingDeg: 265 },
            d2: { x: 0.66, y: 0.6, facingDeg: 275 },
          },
        },
        {
          t: T8[2],
          poses: {
            o1: { x: 0.34, y: 0.5, facingDeg: 88 },
            o2: { x: 0.28, y: 0.22, facingDeg: 82 },
            o3: { x: 0.28, y: 0.78, facingDeg: 95 },
            d1: { x: 0.62, y: 0.42, facingDeg: 265 },
            d2: { x: 0.62, y: 0.58, facingDeg: 275 },
          },
        },
        {
          t: T8[3],
          poses: {
            o1: { x: 0.48, y: 0.5, facingDeg: 88 },
            o2: { x: 0.4, y: 0.2, facingDeg: 78 },
            o3: { x: 0.4, y: 0.8, facingDeg: 98 },
            d1: { x: 0.58, y: 0.44, facingDeg: 265 },
            d2: { x: 0.58, y: 0.56, facingDeg: 275 },
          },
        },
        {
          t: T8[4],
          poses: {
            o1: { x: 0.54, y: 0.5, facingDeg: 88 },
            o2: { x: 0.52, y: 0.18, facingDeg: 75 },
            o3: { x: 0.52, y: 0.82, facingDeg: 100 },
            d1: { x: 0.56, y: 0.42, facingDeg: 270 },
            d2: { x: 0.56, y: 0.58, facingDeg: 270 },
          },
        },
        {
          t: T8[5],
          poses: {
            o1: { x: 0.58, y: 0.48, facingDeg: 70 },
            o2: { x: 0.62, y: 0.2, facingDeg: 72 },
            o3: { x: 0.62, y: 0.8, facingDeg: 102 },
            d1: { x: 0.54, y: 0.4, facingDeg: 275 },
            d2: { x: 0.54, y: 0.6, facingDeg: 275 },
          },
        },
        {
          t: T8[6],
          poses: {
            o1: { x: 0.62, y: 0.55, facingDeg: 55 },
            o2: { x: 0.78, y: 0.2, facingDeg: 68 },
            o3: { x: 0.72, y: 0.82, facingDeg: 105 },
            d1: { x: 0.58, y: 0.36, facingDeg: 280 },
            d2: { x: 0.58, y: 0.64, facingDeg: 280 },
          },
        },
        {
          t: T8[7],
          poses: {
            o1: { x: 0.68, y: 0.58, facingDeg: 48 },
            o2: { x: 0.88, y: 0.18, facingDeg: 65 },
            o3: { x: 0.84, y: 0.82, facingDeg: 108 },
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
      meta: { name: "Horns Offense", durationMs: 10_000 },
      teams: BASE_TEAMS,
      actors: [
        { id: "o1", type: "player", team: "offense", number: 1, label: "1" },
        { id: "o2", type: "player", team: "offense", number: 2, label: "2" },
        { id: "o3", type: "player", team: "offense", number: 3, label: "3" },
        { id: "o4", type: "player", team: "offense", number: 4, label: "4" },
        { id: "o5", type: "player", team: "offense", number: 5, label: "5" },
        { id: "ball", type: "ball", heldBy: "o1" },
      ],
      keyframes: [
        {
          t: T8[0],
          poses: {
            o1: { x: 0.3, y: 0.5, facingDeg: 88 },
            o2: { x: 0.88, y: 0.18, facingDeg: 200 },
            o3: { x: 0.88, y: 0.82, facingDeg: 160 },
            o4: { x: 0.46, y: 0.36, facingDeg: 95 },
            o5: { x: 0.46, y: 0.64, facingDeg: 88 },
          },
        },
        {
          t: T8[1],
          poses: {
            o1: { x: 0.34, y: 0.48, facingDeg: 82 },
            o2: { x: 0.88, y: 0.18, facingDeg: 200 },
            o3: { x: 0.88, y: 0.82, facingDeg: 160 },
            o4: { x: 0.46, y: 0.38, facingDeg: 92 },
            o5: { x: 0.46, y: 0.62, facingDeg: 88 },
          },
        },
        {
          t: T8[2],
          poses: {
            o1: { x: 0.4, y: 0.46, facingDeg: 75 },
            o2: { x: 0.88, y: 0.18, facingDeg: 200 },
            o3: { x: 0.88, y: 0.82, facingDeg: 160 },
            o4: { x: 0.48, y: 0.4, facingDeg: 88 },
            o5: { x: 0.46, y: 0.6, facingDeg: 85 },
          },
        },
        {
          t: T8[3],
          poses: {
            o1: { x: 0.44, y: 0.42, facingDeg: 60 },
            o2: { x: 0.88, y: 0.18, facingDeg: 200 },
            o3: { x: 0.88, y: 0.82, facingDeg: 160 },
            o4: { x: 0.52, y: 0.42, facingDeg: 82 },
            o5: { x: 0.44, y: 0.58, facingDeg: 78 },
          },
        },
        {
          t: T8[4],
          poses: {
            o1: { x: 0.52, y: 0.34, facingDeg: 45 },
            o2: { x: 0.86, y: 0.2, facingDeg: 205 },
            o3: { x: 0.86, y: 0.8, facingDeg: 155 },
            o4: { x: 0.58, y: 0.46, facingDeg: 72 },
            o5: { x: 0.42, y: 0.62, facingDeg: 70 },
          },
        },
        {
          t: T8[5],
          poses: {
            o1: { x: 0.62, y: 0.28, facingDeg: 35 },
            o2: { x: 0.84, y: 0.22, facingDeg: 210 },
            o3: { x: 0.84, y: 0.78, facingDeg: 150 },
            o4: { x: 0.64, y: 0.5, facingDeg: 68 },
            o5: { x: 0.38, y: 0.68, facingDeg: 65 },
          },
        },
        {
          t: T8[6],
          poses: {
            o1: { x: 0.72, y: 0.26, facingDeg: 28 },
            o2: { x: 0.82, y: 0.2, facingDeg: 215 },
            o3: { x: 0.8, y: 0.76, facingDeg: 145 },
            o4: { x: 0.7, y: 0.52, facingDeg: 62 },
            o5: { x: 0.34, y: 0.72, facingDeg: 60 },
          },
        },
        {
          t: T8[7],
          poses: {
            o1: { x: 0.78, y: 0.24, facingDeg: 22 },
            o2: { x: 0.88, y: 0.18, facingDeg: 220 },
            o3: { x: 0.76, y: 0.74, facingDeg: 140 },
            o4: { x: 0.76, y: 0.54, facingDeg: 58 },
            o5: { x: 0.32, y: 0.74, facingDeg: 55 },
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
      meta: { name: "Handoff", durationMs: 10_000 },
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
            o1: { x: 0.26, y: 0.34, facingDeg: 70 },
            o2: { x: 0.52, y: 0.5, facingDeg: 92 },
          },
        },
        {
          t: T8[1],
          poses: {
            o1: { x: 0.34, y: 0.4, facingDeg: 75 },
            o2: { x: 0.52, y: 0.5, facingDeg: 90 },
          },
        },
        {
          t: T8[2],
          poses: {
            o1: { x: 0.42, y: 0.44, facingDeg: 78 },
            o2: { x: 0.51, y: 0.5, facingDeg: 88 },
          },
        },
        {
          t: T8[3],
          poses: {
            o1: { x: 0.48, y: 0.47, facingDeg: 82 },
            o2: { x: 0.5, y: 0.5, facingDeg: 85 },
          },
        },
        {
          t: T8[4],
          poses: {
            o1: { x: 0.54, y: 0.46, facingDeg: 78 },
            o2: { x: 0.49, y: 0.51, facingDeg: 82 },
          },
        },
        {
          t: T8[5],
          poses: {
            o1: { x: 0.62, y: 0.44, facingDeg: 72 },
            o2: { x: 0.47, y: 0.53, facingDeg: 78 },
          },
        },
        {
          t: T8[6],
          poses: {
            o1: { x: 0.74, y: 0.46, facingDeg: 68 },
            o2: { x: 0.44, y: 0.55, facingDeg: 72 },
          },
        },
        {
          t: T8[7],
          poses: {
            o1: { x: 0.86, y: 0.5, facingDeg: 65 },
            o2: { x: 0.4, y: 0.56, facingDeg: 68 },
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
      meta: { name: "1-3-1 Zone", durationMs: 10_000 },
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
            d1: { x: 0.38, y: 0.5, facingDeg: 88 },
            d2: { x: 0.56, y: 0.22, facingDeg: 95 },
            d3: { x: 0.58, y: 0.5, facingDeg: 88 },
            d4: { x: 0.56, y: 0.78, facingDeg: 85 },
            d5: { x: 0.8, y: 0.5, facingDeg: 270 },
            ball: { x: 0.26, y: 0.5 },
          },
        },
        {
          t: T8[1],
          poses: {
            d1: { x: 0.4, y: 0.5, facingDeg: 88 },
            d2: { x: 0.56, y: 0.24, facingDeg: 95 },
            d3: { x: 0.58, y: 0.5, facingDeg: 88 },
            d4: { x: 0.56, y: 0.76, facingDeg: 85 },
            d5: { x: 0.8, y: 0.5, facingDeg: 270 },
            ball: { x: 0.32, y: 0.5 },
          },
        },
        {
          t: T8[2],
          poses: {
            d1: { x: 0.42, y: 0.55, facingDeg: 95 },
            d2: { x: 0.54, y: 0.26, facingDeg: 100 },
            d3: { x: 0.56, y: 0.52, facingDeg: 92 },
            d4: { x: 0.62, y: 0.72, facingDeg: 78 },
            d5: { x: 0.78, y: 0.48, facingDeg: 275 },
            ball: { x: 0.38, y: 0.72 },
          },
        },
        {
          t: T8[3],
          poses: {
            d1: { x: 0.44, y: 0.42, facingDeg: 72 },
            d2: { x: 0.52, y: 0.3, facingDeg: 105 },
            d3: { x: 0.54, y: 0.48, facingDeg: 88 },
            d4: { x: 0.66, y: 0.68, facingDeg: 72 },
            d5: { x: 0.74, y: 0.42, facingDeg: 285 },
            ball: { x: 0.32, y: 0.86 },
          },
        },
        {
          t: T8[4],
          poses: {
            d1: { x: 0.46, y: 0.38, facingDeg: 65 },
            d2: { x: 0.58, y: 0.34, facingDeg: 110 },
            d3: { x: 0.52, y: 0.46, facingDeg: 85 },
            d4: { x: 0.68, y: 0.82, facingDeg: 68 },
            d5: { x: 0.62, y: 0.78, facingDeg: 300 },
            ball: { x: 0.28, y: 0.88 },
          },
        },
        {
          t: T8[5],
          poses: {
            d1: { x: 0.48, y: 0.44, facingDeg: 88 },
            d2: { x: 0.64, y: 0.24, facingDeg: 115 },
            d3: { x: 0.5, y: 0.5, facingDeg: 82 },
            d4: { x: 0.58, y: 0.76, facingDeg: 88 },
            d5: { x: 0.78, y: 0.52, facingDeg: 270 },
            ball: { x: 0.36, y: 0.22 },
          },
        },
        {
          t: T8[6],
          poses: {
            d1: { x: 0.42, y: 0.52, facingDeg: 95 },
            d2: { x: 0.6, y: 0.22, facingDeg: 105 },
            d3: { x: 0.54, y: 0.52, facingDeg: 90 },
            d4: { x: 0.58, y: 0.78, facingDeg: 85 },
            d5: { x: 0.82, y: 0.48, facingDeg: 268 },
            ball: { x: 0.34, y: 0.5 },
          },
        },
        {
          t: T8[7],
          poses: {
            d1: { x: 0.4, y: 0.5, facingDeg: 88 },
            d2: { x: 0.56, y: 0.22, facingDeg: 95 },
            d3: { x: 0.58, y: 0.5, facingDeg: 88 },
            d4: { x: 0.56, y: 0.78, facingDeg: 85 },
            d5: { x: 0.8, y: 0.5, facingDeg: 270 },
            ball: { x: 0.28, y: 0.5 },
          },
        },
      ],
    },
  },
];
