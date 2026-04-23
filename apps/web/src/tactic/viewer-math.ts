import type { TacticDocumentV1 } from "@basketball/shared";

type Vec = { x: number; y: number; facingDeg?: number };

function lerp(a: number, b: number, s: number) {
  return a + (b - a) * s;
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
      out[id] = {
        x: lerp(pa.x, pb.x, s),
        y: lerp(pa.y, pb.y, s),
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
