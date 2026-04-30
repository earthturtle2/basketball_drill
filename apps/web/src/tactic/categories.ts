import type { TacticDocumentV1 } from "@basketball/shared";

export const TACTIC_CATEGORY_KEYS = [
  "playCategory.halfCourtOffense",
  "playCategory.halfCourtDefense",
  "playCategory.frontcourtSideline",
  "playCategory.frontcourtBaseline",
  "playCategory.backcourtSideline",
  "playCategory.backcourtBaseline",
  "playCategory.fullCourtPress",
  "playCategory.transition",
  "playCategory.afterTimeout",
  "playCategory.endGame",
  "playCategory.zoneOffense",
] as const;

export function cleanTacticCategory(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, 64);
}

export function uniqueCategoryOptions(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const value of values) {
    const category = cleanTacticCategory(value);
    if (!category) continue;
    const key = category.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(category);
  }
  return options;
}

export function withDocumentCategory(document: TacticDocumentV1, category: string) {
  return {
    ...document,
    meta: {
      ...document.meta,
      category: cleanTacticCategory(category),
    },
  };
}
