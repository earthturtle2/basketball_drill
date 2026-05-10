import type { TacticDocumentV1 } from "@basketball/shared";
import { resolveBallHolderAt } from "./viewer-math";

export type FinishOptionKind = "shot" | "pass";

export type FinishOption = {
  kind: FinishOptionKind;
  label?: string;
  to?: string;
  x?: number;
  y?: number;
  priority?: string;
};

export type FinishOptionsEvent = {
  t: number;
  from?: string;
  note?: string;
  durationMs?: number;
  options: FinishOption[];
};

type EventRow = NonNullable<TacticDocumentV1["events"]>[number];

export const DEFAULT_FINISH_OPTIONS_DURATION_MS = 1800;
const MIN_FINISH_OPTIONS_DURATION_MS = 500;
const MAX_FINISH_OPTIONS_DURATION_MS = 6000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function durationMsValue(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.round(Math.max(MIN_FINISH_OPTIONS_DURATION_MS, Math.min(MAX_FINISH_OPTIONS_DURATION_MS, value)));
}

export function finishOptionsDurationMs(event: { durationMs?: unknown }): number {
  return durationMsValue(event.durationMs) ?? DEFAULT_FINISH_OPTIONS_DURATION_MS;
}

export function finishOptionsEndMs(event: { t: number; durationMs?: unknown }): number {
  return event.t + finishOptionsDurationMs(event);
}

export function isFinishOptionsActiveAt(event: { t: number; durationMs?: unknown }, tMs: number): boolean {
  return event.t <= tMs && tMs < finishOptionsEndMs(event);
}

function actorTeam(document: TacticDocumentV1, actorId: string | undefined) {
  if (!actorId) return undefined;
  const actor = document.actors.find((item) => item.id === actorId);
  return actor?.type === "player" ? actor.team : undefined;
}

function finishOptionsEndMatches(event: EventRow, from: string | undefined): boolean {
  return event.kind === "finish_options_end" && (event.from ?? "") === (from ?? "");
}

function hasFinishOptionsEndBetween(
  document: TacticDocumentV1,
  event: { t: number; from?: string },
  tMs: number,
): boolean {
  return (document.events ?? []).some((item) =>
    item.t > event.t && item.t <= tMs && finishOptionsEndMatches(item, event.from),
  );
}

export function isFinishOptionsVisibleAt(
  document: TacticDocumentV1,
  event: { t: number; from?: string; durationMs?: unknown },
  tMs: number,
): boolean {
  if (!isFinishOptionsActiveAt(event, tMs)) return false;
  if (hasFinishOptionsEndBetween(document, event, tMs)) return false;

  const sourceTeam = actorTeam(document, event.from);
  if (!sourceTeam) return true;

  // Hide stale shot/read markers once the other team controls the next possession.
  const holderTeam = actorTeam(document, resolveBallHolderAt(document, tMs));
  return holderTeam === undefined || holderTeam === sourceTeam;
}

export function parseFinishOption(value: unknown): FinishOption | null {
  if (!isRecord(value)) return null;
  const rawKind = value.kind;
  const kind: FinishOptionKind | null = rawKind === "shot" || rawKind === "pass" ? rawKind : null;
  if (!kind) return null;

  const option: FinishOption = {
    kind,
    label: stringValue(value.label),
    to: stringValue(value.to),
    x: finiteNumber(value.x),
    y: finiteNumber(value.y),
    priority: stringValue(value.priority),
  };

  if (option.to || (option.x !== undefined && option.y !== undefined)) return option;
  return null;
}

export function withFinishOptionsClearedAt(document: TacticDocumentV1, tMs: number): TacticDocumentV1 {
  const events = document.events ?? [];
  const sourcesToClear = new Set<string>();
  for (const event of events) {
    const parsed = parseFinishOptionsEvent(event);
    if (!parsed || parsed.t >= tMs) continue;
    if (isFinishOptionsActiveAt(parsed, tMs) && !hasFinishOptionsEndBetween(document, parsed, tMs)) {
      sourcesToClear.add(parsed.from ?? "");
    }
  }
  if (sourcesToClear.size === 0) return document;

  const clearEvents = [...sourcesToClear]
    .filter((sourceKey) => !events.some((event) =>
      event.t === tMs && event.kind === "finish_options_end" && (event.from ?? "") === sourceKey,
    ))
    .map((sourceKey) => ({
      t: tMs,
      kind: "finish_options_end" as const,
      ...(sourceKey ? { from: sourceKey } : {}),
    }));

  if (clearEvents.length === 0) return document;
  return { ...document, events: [...events, ...clearEvents] };
}

export function parseFinishOptionsEvent(event: EventRow): FinishOptionsEvent | null {
  if (event.kind !== "finish_options") return null;
  const rawOptions = (event as { options?: unknown }).options;
  if (!Array.isArray(rawOptions)) return null;

  const options = rawOptions.map(parseFinishOption).filter((option): option is FinishOption => Boolean(option));
  if (options.length === 0) return null;

  return {
    t: event.t,
    from: event.from,
    note: event.note,
    durationMs: durationMsValue((event as { durationMs?: unknown }).durationMs),
    options,
  };
}

export function normalizeFinishOptions(event: EventRow | undefined): FinishOption[] {
  if (!event) return [];
  if (event.kind !== "finish_options") return [];
  const rawOptions = (event as { options?: unknown }).options;
  if (!Array.isArray(rawOptions)) return [];
  return rawOptions.map(parseFinishOption).filter((option): option is FinishOption => Boolean(option));
}

export function getActiveFinishOptionsEventIndex(
  events: TacticDocumentV1["events"],
  fromId: string | null | undefined,
  tMs: number,
  document?: TacticDocumentV1,
): number | null {
  if (!events?.length || !fromId) return null;
  const withIdx = events.map((e, i) => ({ e, i }));
  const candidates = withIdx
    .filter(({ e }) => (
      e.kind === "finish_options" &&
      e.from === fromId &&
      (document ? isFinishOptionsVisibleAt(document, e, tMs) : isFinishOptionsActiveAt(e, tMs))
    ))
    .sort((a, b) => a.e.t - b.e.t || a.i - b.i);
  return candidates.at(-1)?.i ?? null;
}

export function makeFinishOptionsEvent(
  t: number,
  from: string,
  options: FinishOption[] = [],
): EventRow {
  return {
    t,
    kind: "finish_options",
    from,
    durationMs: DEFAULT_FINISH_OPTIONS_DURATION_MS,
    options,
  } as EventRow;
}
