import { parseTacticDocumentV1, type TacticDocumentV1 } from "@basketball/shared";

export const DEFAULT_TACTIC_DOCUMENT: TacticDocumentV1 = {
  schemaVersion: 1,
  meta: {
    name: "新战术",
    description: "",
    tags: [],
    court: { preset: "half", orientation: "home_attacks_right", sizeMeters: { length: 14, width: 15 } },
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

function mergeMeta(
  name: string,
  description: string | null,
  tags: string[],
  doc: TacticDocumentV1,
): TacticDocumentV1 {
  return {
    ...doc,
    meta: {
      ...doc.meta,
      name,
      description: description ?? doc.meta?.description,
      tags: tags.length ? tags : (doc.meta?.tags ?? []),
    },
  };
}

export function buildDocumentFromInput(input: {
  name: string;
  description?: string | null;
  tags?: string[];
  document: unknown;
}): TacticDocumentV1 {
  const doc = parseTacticDocumentV1(input.document);
  return mergeMeta(input.name, input.description ?? null, input.tags ?? doc.meta?.tags ?? [], doc);
}

export function buildDocumentOnUpdate(
  existing: TacticDocumentV1,
  rowName: string,
  patch: { name?: string; description?: string | null; tags?: string[]; document?: unknown },
): TacticDocumentV1 {
  const base = patch.document !== undefined ? parseTacticDocumentV1(patch.document) : existing;
  const name =
    (patch.name && patch.name.trim()) ||
    (typeof base.meta?.name === "string" && base.meta.name.trim()) ||
    rowName ||
    "未命名";
  const description =
    patch.description === undefined
      ? (base.meta?.description as string | undefined) ?? null
      : patch.description;
  const tags = (patch.tags ?? (base.meta?.tags as string[] | undefined) ?? []) as string[];
  return mergeMeta(
    name,
    description,
    Array.isArray(tags) ? tags : [],
    base,
  );
}
