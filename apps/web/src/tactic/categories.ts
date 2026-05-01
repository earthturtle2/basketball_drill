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
      category: cleanTacticCategory(category),
    },
  };
}
