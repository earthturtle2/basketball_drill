import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { matchPreparations, plays, tacticCategories } from "../db/schema.js";

export const MAX_TACTIC_CATEGORY_LENGTH = 64;
export const HALF_COURT_PRACTICE_CATEGORY = "半场训练";
export const FULL_PRACTICE_CATEGORY = "全场训练";

const CATEGORY_ALIASES = new Map<string, string>([
  ["fu", FULL_PRACTICE_CATEGORY],
  ["full court practice", FULL_PRACTICE_CATEGORY],
  ["full-court practice", FULL_PRACTICE_CATEGORY],
  ["full court training", FULL_PRACTICE_CATEGORY],
  ["full-court training", FULL_PRACTICE_CATEGORY],
  ["full session practice", FULL_PRACTICE_CATEGORY],
  ["full-session practice", FULL_PRACTICE_CATEGORY],
  ["全程训练", FULL_PRACTICE_CATEGORY],
  ["half court practice", HALF_COURT_PRACTICE_CATEGORY],
  ["half-court practice", HALF_COURT_PRACTICE_CATEGORY],
  ["half court training", HALF_COURT_PRACTICE_CATEGORY],
  ["half-court training", HALF_COURT_PRACTICE_CATEGORY],
]);

const CATEGORY_FILTER_ALIASES = new Map<string, string[]>([
  [
    FULL_PRACTICE_CATEGORY,
    [
      "fu",
      "FU",
      "full court practice",
      "Full Court Practice",
      "full-court practice",
      "Full-Court Practice",
      "full court training",
      "Full Court Training",
      "full-court training",
      "Full-Court Training",
      "full session practice",
      "Full Session Practice",
      "full-session practice",
      "Full-Session Practice",
      "全程训练",
    ],
  ],
  [
    HALF_COURT_PRACTICE_CATEGORY,
    [
      "half court practice",
      "Half Court Practice",
      "half-court practice",
      "Half-Court Practice",
      "half court training",
      "Half Court Training",
      "half-court training",
      "Half-Court Training",
    ],
  ],
]);

export function cleanTacticCategory(value: string | null | undefined) {
  const name = (value ?? "").trim().slice(0, MAX_TACTIC_CATEGORY_LENGTH);
  return CATEGORY_ALIASES.get(name.toLocaleLowerCase()) ?? name;
}

export function tacticCategoryFilterValues(value: string | null | undefined) {
  const name = cleanTacticCategory(value);
  if (!name) return [];
  const seen = new Set<string>();
  const values = [name, ...(CATEGORY_FILTER_ALIASES.get(name) ?? [])];
  return values.filter((item) => {
    const key = item.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueCategories(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const name = cleanTacticCategory(value);
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export async function ensureTacticCategories(userId: string, values: Array<string | null | undefined>) {
  const names = uniqueCategories(values);
  if (names.length === 0) return;

  const existingRows = await db
    .select({ name: tacticCategories.name })
    .from(tacticCategories)
    .where(eq(tacticCategories.userId, userId));
  const existing = new Set(existingRows.map((row) => row.name.toLocaleLowerCase()));

  for (const name of names) {
    const key = name.toLocaleLowerCase();
    if (existing.has(key)) continue;
    try {
      await db.insert(tacticCategories).values({ userId, name });
      existing.add(key);
    } catch {
      // Another request may have inserted the same category first.
    }
  }
}

export async function ensureTacticCategory(userId: string, value: string | null | undefined) {
  const name = cleanTacticCategory(value);
  await ensureTacticCategories(userId, [name]);
  return name;
}

export async function listTacticCategories(userId: string) {
  const [categoryRows, playRows, prepRows] = await Promise.all([
    db
      .select({ name: tacticCategories.name })
      .from(tacticCategories)
      .where(eq(tacticCategories.userId, userId))
      .orderBy(asc(tacticCategories.createdAt)),
    db
      .select({ category: plays.category })
      .from(plays)
      .where(and(eq(plays.userId, userId), isNull(plays.deletedAt))),
    db
      .select({ entries: matchPreparations.entries })
      .from(matchPreparations)
      .where(eq(matchPreparations.userId, userId)),
  ]);

  return uniqueCategories([
    ...categoryRows.map((row) => row.name),
    ...playRows.map((row) => row.category),
    ...prepRows.flatMap((row) => row.entries.map((entry) => entry.category)),
  ]);
}
