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

export type TacticCategoryKey = (typeof TACTIC_CATEGORY_KEYS)[number];

export const TACTIC_CATEGORY_LABELS_ZH: Record<TacticCategoryKey, string> = {
  "playCategory.halfCourtOffense": "半场进攻",
  "playCategory.halfCourtDefense": "半场防守",
  "playCategory.frontcourtSideline": "前场边线球",
  "playCategory.frontcourtBaseline": "前场底线球",
  "playCategory.backcourtSideline": "后场边线球",
  "playCategory.backcourtBaseline": "后场底线球",
  "playCategory.fullCourtPress": "全场压迫",
  "playCategory.transition": "快攻转换",
  "playCategory.afterTimeout": "暂停后战术",
  "playCategory.endGame": "最后一攻",
  "playCategory.zoneOffense": "破联防",
};

const TACTIC_CATEGORY_LABELS_EN: Record<TacticCategoryKey, string> = {
  "playCategory.halfCourtOffense": "Half-court offense",
  "playCategory.halfCourtDefense": "Half-court defense",
  "playCategory.frontcourtSideline": "Frontcourt sideline out",
  "playCategory.frontcourtBaseline": "Frontcourt baseline out",
  "playCategory.backcourtSideline": "Backcourt sideline out",
  "playCategory.backcourtBaseline": "Backcourt baseline out",
  "playCategory.fullCourtPress": "Full-court press",
  "playCategory.transition": "Transition",
  "playCategory.afterTimeout": "After timeout",
  "playCategory.endGame": "End game",
  "playCategory.zoneOffense": "Zone offense",
};

export const TACTIC_CATEGORY_VALUES = TACTIC_CATEGORY_KEYS.map((key) => TACTIC_CATEGORY_LABELS_ZH[key]);
export const DEFAULT_TACTIC_CATEGORY = TACTIC_CATEGORY_VALUES[0] ?? "";

const CATEGORY_KEY_BY_VALUE = new Map<string, TacticCategoryKey>();
for (const key of TACTIC_CATEGORY_KEYS) {
  for (const label of [key, TACTIC_CATEGORY_LABELS_ZH[key], TACTIC_CATEGORY_LABELS_EN[key]]) {
    CATEGORY_KEY_BY_VALUE.set(label.toLocaleLowerCase(), key);
  }
}

export function cleanTacticCategory(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, 64);
}

export function normalizeTacticCategory(value: string | null | undefined) {
  const category = cleanTacticCategory(value);
  const key = CATEGORY_KEY_BY_VALUE.get(category.toLocaleLowerCase());
  return key ? TACTIC_CATEGORY_LABELS_ZH[key] : category;
}

export function displayTacticCategory(category: string | null | undefined, t: (key: string) => string) {
  const value = normalizeTacticCategory(category);
  const key = CATEGORY_KEY_BY_VALUE.get(value.toLocaleLowerCase());
  return key ? t(key) : value;
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

export function uniqueTacticCategoryOptions(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const value of values) {
    const category = normalizeTacticCategory(value);
    if (!category) continue;
    const key = category.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(category);
  }
  return options;
}

function suggestedCategoryLetter(category: string) {
  const text = category.toLocaleLowerCase();
  if (/trap|夹击/.test(text)) return "T";
  if (/after|ato|暂停/.test(text)) return "A";
  if (/baseline|底线/.test(text)) return "B";
  if (/sideline|边线/.test(text)) return "S";
  if (/press|压迫/.test(text)) return "P";
  if (/transition|快攻|转换/.test(text)) return "R";
  if (/end|最后|绝杀|末节/.test(text)) return "E";
  if (/zone|联防/.test(text)) return "Z";
  if (/defense|defence|防守/.test(text)) return "D";
  if (/offense|offence|进攻/.test(text)) return "O";
  const ascii = category.match(/[a-z]/i)?.[0];
  return ascii?.toUpperCase() ?? null;
}

const CATEGORY_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function buildCategoryLetterMap(categories: string[]) {
  const result = new Map<string, string>();
  const used = new Set<string>();
  const normalized = uniqueCategoryOptions(categories);

  function nextAvailableLetter() {
    for (const letter of CATEGORY_LETTERS) {
      if (!used.has(letter)) return letter;
    }
    return "Z";
  }

  for (const category of normalized) {
    const key = category.toLocaleLowerCase();
    const suggested = suggestedCategoryLetter(category);
    const letter = suggested && !used.has(suggested) ? suggested : nextAvailableLetter();
    used.add(letter);
    result.set(key, letter);
  }

  return result;
}

export function formatCategoryCode(
  entry: { category: string; code: string },
  categoryLetters: Map<string, string>,
) {
  const category = cleanTacticCategory(entry.category);
  const code = entry.code.trim();
  const letter = categoryLetters.get(category.toLocaleLowerCase()) ?? suggestedCategoryLetter(category) ?? "X";
  if (code.toLocaleUpperCase().startsWith(letter)) return code;
  return `${letter}${code}`;
}

export function withDocumentCategory(document: TacticDocumentV1, category: string) {
  return {
    ...document,
    meta: {
      ...document.meta,
      category: normalizeTacticCategory(category),
    },
  };
}
