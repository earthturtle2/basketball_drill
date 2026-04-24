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

export function resolveBallHolderAt(doc: TacticDocumentV1, t: number): string | undefined {
  const ball = doc.actors.find((a) => a.type === "ball");
  let holder = ball?.type === "ball" ? ball.heldBy : undefined;
  const passes = (doc.events ?? [])
    .filter((e) => e.kind === "pass" && e.from && e.to)
    .sort((a, b) => a.t - b.t);
  for (const p of passes) {
    if (p.t <= t) holder = p.to;
    else break;
  }
  return holder;
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
  const ball = doc.actors.find((a) => a.type === "ball");
  let holder = ball?.type === "ball" ? ball.heldBy : undefined;

  const passes = (doc.events ?? [])
    .filter((e) => e.kind === "pass" && e.from && e.to)
    .sort((a, b) => a.t - b.t);

  for (const p of passes) {
    if (p.t <= tMs) {
      const endT = p.t + PASS_FLY_MS;
      if (tMs < endT) {
        const progress = (tMs - p.t) / PASS_FLY_MS;
        const fp = poses[p.from!];
        const tp = poses[p.to!];
        if (fp && tp) {
          return {
            holder: undefined,
            flight: {
              fromX: fp.x, fromY: fp.y,
              toX: tp.x, toY: tp.y,
              progress,
            },
          };
        }
      }
      holder = p.to;
    } else {
      break;
    }
  }
  return { holder };
}
