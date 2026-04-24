import type { TacticDocumentV1 } from "@basketball/shared";

export interface Template {
  id: string;
  name: string;
  description: string;
  document: TacticDocumentV1;
}

const BASE_TEAMS = {
  offense: { id: "o", label: "进攻", color: "#e53935" },
  defense: { id: "d", label: "防守", color: "#1e88e5" },
};

export const TEMPLATES: Template[] = [
  {
    id: "high-pnr",
    name: "高位挡拆",
    description: "经典高位挡拆配合，5号球员为1号设置掩护后顺下接球",
    document: {
      schemaVersion: 1,
      meta: { name: "高位挡拆", durationMs: 6000 },
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
    name: "快攻 3v2",
    description: "三打二快攻推进，中路持球突破后分球两翼",
    document: {
      schemaVersion: 1,
      meta: { name: "快攻 3v2", durationMs: 5000 },
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
    name: "Horns 进攻体系",
    description: "双高位站位，控卫传球后两侧掩护创造空间",
    document: {
      schemaVersion: 1,
      meta: { name: "Horns 进攻体系", durationMs: 8000 },
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
    name: "手递手",
    description: "两人手递手配合，接球后攻击篮筐",
    document: {
      schemaVersion: 1,
      meta: { name: "手递手", durationMs: 5000 },
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
    name: "1-3-1 联防",
    description: "1-3-1区域联防站位及轮转",
    document: {
      schemaVersion: 1,
      meta: { name: "1-3-1 联防", durationMs: 6000 },
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
