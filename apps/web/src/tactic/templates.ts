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

export const TEMPLATES: Template[] = [
  {
    id: "high-pnr",
    nameKey: "tpl.highPnr.name",
    descKey: "tpl.highPnr.desc",
    document: {
      schemaVersion: 1,
      meta: { name: "High Pick & Roll", durationMs: 6000 },
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
          t: 0,
          poses: {
            o1: { x: 0.35, y: 0.5 },
            o2: { x: 0.15, y: 0.8 },
            o3: { x: 0.15, y: 0.2 },
            o4: { x: 0.05, y: 0.75 },
            o5: { x: 0.45, y: 0.5 },
          },
        },
        {
          t: 2000,
          poses: {
            o1: { x: 0.45, y: 0.5 },
            o2: { x: 0.15, y: 0.8 },
            o3: { x: 0.15, y: 0.2 },
            o4: { x: 0.05, y: 0.75 },
            o5: { x: 0.45, y: 0.55 },
          },
        },
        {
          t: 5000,
          poses: {
            o1: { x: 0.6, y: 0.4 },
            o2: { x: 0.15, y: 0.8 },
            o3: { x: 0.15, y: 0.2 },
            o4: { x: 0.05, y: 0.75 },
            o5: { x: 0.7, y: 0.55 },
          },
        },
      ],
      events: [{ t: 4000, kind: "pass", from: "o1", to: "o5" }],
    },
  },
  {
    id: "fast-break",
    nameKey: "tpl.fastBreak.name",
    descKey: "tpl.fastBreak.desc",
    document: {
      schemaVersion: 1,
      meta: { name: "Fast Break 3v2", durationMs: 5000 },
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
          t: 0,
          poses: {
            o1: { x: 0.1, y: 0.5 },
            o2: { x: 0.08, y: 0.2 },
            o3: { x: 0.08, y: 0.8 },
            d1: { x: 0.65, y: 0.4 },
            d2: { x: 0.65, y: 0.6 },
          },
        },
        {
          t: 2500,
          poses: {
            o1: { x: 0.5, y: 0.5 },
            o2: { x: 0.45, y: 0.15 },
            o3: { x: 0.45, y: 0.85 },
            d1: { x: 0.65, y: 0.45 },
            d2: { x: 0.65, y: 0.55 },
          },
        },
        {
          t: 4500,
          poses: {
            o1: { x: 0.6, y: 0.5 },
            o2: { x: 0.7, y: 0.15 },
            o3: { x: 0.7, y: 0.85 },
            d1: { x: 0.7, y: 0.35 },
            d2: { x: 0.7, y: 0.65 },
          },
        },
      ],
      events: [{ t: 3500, kind: "pass", from: "o1", to: "o2" }],
    },
  },
  {
    id: "horns",
    nameKey: "tpl.horns.name",
    descKey: "tpl.horns.desc",
    document: {
      schemaVersion: 1,
      meta: { name: "Horns Offense", durationMs: 8000 },
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
          t: 0,
          poses: {
            o1: { x: 0.3, y: 0.5 },
            o2: { x: 0.1, y: 0.15 },
            o3: { x: 0.1, y: 0.85 },
            o4: { x: 0.45, y: 0.35 },
            o5: { x: 0.45, y: 0.65 },
          },
        },
        {
          t: 2000,
          poses: {
            o1: { x: 0.35, y: 0.5 },
            o2: { x: 0.1, y: 0.15 },
            o3: { x: 0.1, y: 0.85 },
            o4: { x: 0.45, y: 0.42 },
            o5: { x: 0.45, y: 0.58 },
          },
        },
        {
          t: 4500,
          poses: {
            o1: { x: 0.55, y: 0.35 },
            o2: { x: 0.15, y: 0.15 },
            o3: { x: 0.15, y: 0.85 },
            o4: { x: 0.6, y: 0.5 },
            o5: { x: 0.35, y: 0.65 },
          },
        },
        {
          t: 7000,
          poses: {
            o1: { x: 0.65, y: 0.35 },
            o2: { x: 0.2, y: 0.15 },
            o3: { x: 0.2, y: 0.85 },
            o4: { x: 0.75, y: 0.5 },
            o5: { x: 0.3, y: 0.7 },
          },
        },
      ],
      events: [{ t: 3000, kind: "pass", from: "o1", to: "o4" }],
    },
  },
  {
    id: "handoff",
    nameKey: "tpl.handoff.name",
    descKey: "tpl.handoff.desc",
    document: {
      schemaVersion: 1,
      meta: { name: "Handoff", durationMs: 5000 },
      teams: BASE_TEAMS,
      actors: [
        { id: "o1", type: "player", team: "offense", number: 1, label: "1" },
        { id: "o2", type: "player", team: "offense", number: 2, label: "2" },
        { id: "ball", type: "ball", heldBy: "o2" },
      ],
      keyframes: [
        {
          t: 0,
          poses: {
            o1: { x: 0.3, y: 0.3 },
            o2: { x: 0.5, y: 0.5 },
          },
        },
        {
          t: 2000,
          poses: {
            o1: { x: 0.48, y: 0.45 },
            o2: { x: 0.5, y: 0.5 },
          },
        },
        {
          t: 4500,
          poses: {
            o1: { x: 0.7, y: 0.45 },
            o2: { x: 0.5, y: 0.55 },
          },
        },
      ],
      events: [{ t: 2000, kind: "pass", from: "o2", to: "o1" }],
    },
  },
  {
    id: "zone-131",
    nameKey: "tpl.zone131.name",
    descKey: "tpl.zone131.desc",
    document: {
      schemaVersion: 1,
      meta: { name: "1-3-1 Zone", durationMs: 6000 },
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
          t: 0,
          poses: {
            d1: { x: 0.4, y: 0.5 },
            d2: { x: 0.55, y: 0.2 },
            d3: { x: 0.55, y: 0.5 },
            d4: { x: 0.55, y: 0.8 },
            d5: { x: 0.75, y: 0.5 },
            ball: { x: 0.3, y: 0.5 },
          },
        },
        {
          t: 5000,
          poses: {
            d1: { x: 0.45, y: 0.3 },
            d2: { x: 0.6, y: 0.15 },
            d3: { x: 0.55, y: 0.45 },
            d4: { x: 0.6, y: 0.7 },
            d5: { x: 0.75, y: 0.45 },
            ball: { x: 0.3, y: 0.25 },
          },
        },
      ],
    },
  },
];
