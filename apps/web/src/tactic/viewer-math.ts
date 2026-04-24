import type { TacticDocumentV1 } from "@basketball/shared";

type Vec = { x: number; y: number; facingDeg?: number };

function lerp(a: number, b: number, s: number) {
  return a + (b - a) * s;
}

function quadBezier(a: number, cp: number, b: number, t: number) {
  const u = 1 - t;
  return u * u * a + 2 * u * t * cp + t * t * b;
}

function lerpAngle(a: number, b: number, s: number) {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return a + d * s;
}

export function samplePoses(
  document: TacticDocumentV1,
  tMs: number,
): Record<string, Vec> {
  const kf = document.keyframes;
  if (kf.length === 0) return {};
  if (tMs <= kf[0]!.t) {
    return { ...kf[0]!.poses };
  }
  if (tMs >= kf[kf.length - 1]!.t) {
    return { ...kf[kf.length - 1]!.poses };
  }
  let i = 0;
  for (let j = 0; j < kf.length - 1; j++) {
    if (kf[j]!.t <= tMs && tMs < kf[j + 1]!.t) {
      i = j;
      break;
    }
  }
  const a = kf[i]!;
  const b = kf[i + 1]!;
  const s = (tMs - a.t) / (b.t - a.t);
  const ids = new Set([...Object.keys(a.poses), ...Object.keys(b.poses)]);
  const out: Record<string, Vec> = {};
  for (const id of ids) {
    const pa = a.poses[id];
    const pb = b.poses[id];
    if (pa && pb) {
      const hasCp = pb.cpx !== undefined && pb.cpy !== undefined;
      out[id] = {
        x: hasCp ? quadBezier(pa.x, pb.cpx!, pb.x, s) : lerp(pa.x, pb.x, s),
        y: hasCp ? quadBezier(pa.y, pb.cpy!, pb.y, s) : lerp(pa.y, pb.y, s),
        facingDeg:
          pa.facingDeg !== undefined && pb.facingDeg !== undefined
            ? lerpAngle(pa.facingDeg, pb.facingDeg, s)
            : (pa.facingDeg ?? pb.facingDeg),
      };
    } else {
      out[id] = (pa ?? pb)!;
    }
  }
  return out;
}

export const PASS_FLY_MS = 400;

/** The pass currently in the air (ball not held) at tMs, if any. */
export function findInFlightPass(
  doc: TacticDocumentV1,
  tMs: number,
): { t: number; from: string; to: string } | null {
  const passes = (doc.events ?? [])
    .filter((e) => e.kind === "pass" && e.from && e.to)
    .sort((a, b) => a.t - b.t);
  let best: (typeof passes)[0] | null = null;
  for (const p of passes) {
    if (p.t > tMs) break;
    const endT = p.t + PASS_FLY_MS;
    if (tMs < endT) {
      if (!best || p.t > best.t) best = p;
    }
  }
  if (!best) return null;
  return { t: best.t, from: best.from!, to: best.to! };
}

/**
 * Who holds the ball at t (ignoring in-flight; use resolveBallState for that).
 * Applies `ball.heldBy` as t=0 baseline, then all `pass`, `possess`, and `possess_end` with e.t &lt;= t in time (then index) order.
 */
export function resolveBallHolderAt(doc: TacticDocumentV1, tMs: number): string | undefined {
  const ball = doc.actors.find((a) => a.type === "ball");
  let holder = ball?.type === "ball" ? ball.heldBy : undefined;
  const all = doc.events ?? [];
  const withIdx = all.map((e, i) => ({ e, i }));
  const chain = withIdx
    .filter(
      ({ e }) =>
        (e.kind === "pass" && e.from && e.to) ||
        (e.kind === "possess" && e.to) ||
        e.kind === "possess_end",
    )
    .filter(({ e }) => e.t <= tMs)
    .sort((a, b) => a.e.t - b.e.t || a.i - b.i);
  for (const { e } of chain) {
    if (e.kind === "pass") holder = e.to;
    else if (e.kind === "possess") holder = e.to;
    else if (e.kind === "possess_end") holder = undefined;
  }
  return holder;
}

/**
 * For each screener (`from`), apply `screen` and `screen_end` events in time order
 * up to tMs. `screen` sets the overlay; `screen_end` clears it from that moment
 * (later `screen` can set again).
 */
export function resolveScreenOverlaysAtT(document: TacticDocumentV1, tMs: number): Map<string, number> {
  const out = new Map<string, number>();
  const all = document.events ?? [];
  const withIdx = all.map((e, i) => ({ e, i }));
  const fromIds = new Set<string>();
  for (const { e } of withIdx) {
    if ((e.kind === "screen" || e.kind === "screen_end") && e.from) fromIds.add(e.from);
  }
  for (const fromId of fromIds) {
    const chain = withIdx
      .filter(
        ({ e }) =>
          (e.kind === "screen" || e.kind === "screen_end") && e.from === fromId && e.t <= tMs,
      )
      .sort((a, b) => a.e.t - b.e.t || a.i - b.i);
    let angle: number | null = null;
    for (const { e } of chain) {
      if (e.kind === "screen") angle = e.angle ?? 0;
      else if (e.kind === "screen_end") angle = null;
    }
    if (angle !== null) out.set(fromId, angle);
  }
  return out;
}

/**
 * The `doc.events` index of the `screen` row that is active at tMs for `fromId`, or null.
 */
export function getActiveScreenEventIndex(
  events: NonNullable<TacticDocumentV1["events"]> | undefined,
  fromId: string,
  tMs: number,
): number | null {
  if (!events?.length) return null;
  const withIdx = events.map((e, i) => ({ e, i }));
  const chain = withIdx
    .filter(
      ({ e }) =>
        (e.kind === "screen" || e.kind === "screen_end") && e.from === fromId && e.t <= tMs,
    )
    .sort((a, b) => a.e.t - b.e.t || a.i - b.i);
  let activeIdx: number | null = null;
  for (const { e, i } of chain) {
    if (e.kind === "screen") activeIdx = i;
    else if (e.kind === "screen_end") activeIdx = null;
  }
  return activeIdx;
}

export interface BallFlightInfo {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
}

export function resolveBallState(
  doc: TacticDocumentV1,
  tMs: number,
  poses: Record<string, Vec>,
): { holder: string | undefined; flight?: BallFlightInfo } {
  const inflight = findInFlightPass(doc, tMs);
  if (inflight) {
    const progress = (tMs - inflight.t) / PASS_FLY_MS;
    const fp = poses[inflight.from];
    const tp = poses[inflight.to];
    if (fp && tp) {
      return {
        holder: undefined,
        flight: {
          fromX: fp.x,
          fromY: fp.y,
          toX: tp.x,
          toY: tp.y,
          progress,
        },
      };
    }
  }
  return { holder: resolveBallHolderAt(doc, tMs) };
}
