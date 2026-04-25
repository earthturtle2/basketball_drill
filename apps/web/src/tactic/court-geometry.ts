/**
 * FIBA court geometry in decimeters.
 * Half court: viewBox 0 0 140 150 (14m × 15m).
 * Full court: viewBox 0 0 280 150 (28m × 15m).
 * Origin top-left, x right, y down.
 */

export const HALF_W = 140;
export const FULL_W = 280;
export const COURT_H = 150;

export type CourtMode = "half" | "full";

export function courtWidth(mode: CourtMode): number {
  return mode === "full" ? FULL_W : HALF_W;
}

export function tacticToSvg(tx: number, ty: number, mode: CourtMode = "half"): [number, number] {
  return [tx * courtWidth(mode), (1 - ty) * COURT_H];
}

export function svgToTactic(sx: number, sy: number, mode: CourtMode = "half"): [number, number] {
  const w = courtWidth(mode);
  return [
    Math.max(0, Math.min(1, sx / w)),
    Math.max(0, Math.min(1, 1 - sy / COURT_H)),
  ];
}

// FIBA measurements in decimeters
const CY = COURT_H / 2;
const BASKET_OFF = 15.75; // basket center from baseline
const FT_LANE_W = 49;     // 4.9m
const FT_LANE_D = 58;     // 5.8m from baseline
const FT_R = 18;           // 1.8m free-throw circle
const THREE_R = 67.5;      // 6.75m
const THREE_CORNER = 9;    // 0.9m from sideline
const RESTRICTED_R = 12.5; // 1.25m
const CENTER_R = 18;       // 1.8m
const RIM_R = 2.25;        // 0.225m (45cm diameter)
const BB_OFF = 12;          // backboard 1.2m from baseline
const BB_HALF = 9;          // backboard half-width 0.9m

export interface HalfPaths {
  ftLane: string;
  ftCircle: string;
  threePt: string;
  restricted: string;
  rim: { cx: number; cy: number; r: number };
  backboard: string;
}

/**
 * Right-side half court (basket on the right, court extends left).
 * Baseline at `bl`.
 */
function rightHalf(bl: number): HalfPaths {
  const bx = bl - BASKET_OFF;
  const ft = bl - FT_LANE_D;
  const ftT = CY - FT_LANE_W / 2;
  const ftB = CY + FT_LANE_W / 2;
  const dx = Math.sqrt(THREE_R ** 2 - (THREE_CORNER - CY) ** 2);
  const ax = bx - dx;
  const bb = bl - BB_OFF;

  return {
    ftLane: `M ${bl} ${ftT} H ${ft} V ${ftB} H ${bl}`,
    ftCircle: [
      `M ${ft} ${CY - FT_R}`,
      `A ${FT_R} ${FT_R} 0 1 1 ${ft} ${CY + FT_R}`,
      `A ${FT_R} ${FT_R} 0 1 1 ${ft} ${CY - FT_R}`,
    ].join(" "),
    // Arc sweep=0 with right-side center → short arc on LEFT (toward center court)
    threePt: `M ${bl} ${THREE_CORNER} H ${ax} A ${THREE_R} ${THREE_R} 0 0 0 ${ax} ${COURT_H - THREE_CORNER} H ${bl}`,
    // Semi-circle opening LEFT (toward center court).
    restricted: `M ${bx} ${CY - RESTRICTED_R} A ${RESTRICTED_R} ${RESTRICTED_R} 0 0 0 ${bx} ${CY + RESTRICTED_R}`,
    rim: { cx: bx, cy: CY, r: RIM_R },
    backboard: `M ${bb} ${CY - BB_HALF} V ${CY + BB_HALF}`,
  };
}

/**
 * Left-side half court (basket on the left, court extends right).
 * Baseline at `bl`.
 */
function leftHalf(bl: number): HalfPaths {
  const bx = bl + BASKET_OFF;
  const ft = bl + FT_LANE_D;
  const ftT = CY - FT_LANE_W / 2;
  const ftB = CY + FT_LANE_W / 2;
  const dx = Math.sqrt(THREE_R ** 2 - (THREE_CORNER - CY) ** 2);
  const ax = bx + dx;
  const bb = bl + BB_OFF;

  return {
    ftLane: `M ${bl} ${ftT} H ${ft} V ${ftB} H ${bl}`,
    ftCircle: [
      `M ${ft} ${CY - FT_R}`,
      `A ${FT_R} ${FT_R} 0 1 0 ${ft} ${CY + FT_R}`,
      `A ${FT_R} ${FT_R} 0 1 0 ${ft} ${CY - FT_R}`,
    ].join(" "),
    // Arc sweep=1 with left-side center → short arc on RIGHT (toward center court)
    threePt: `M ${bl} ${THREE_CORNER} H ${ax} A ${THREE_R} ${THREE_R} 0 0 1 ${ax} ${COURT_H - THREE_CORNER} H ${bl}`,
    // Semi-circle opening RIGHT (toward center court).
    restricted: `M ${bx} ${CY - RESTRICTED_R} A ${RESTRICTED_R} ${RESTRICTED_R} 0 0 1 ${bx} ${CY + RESTRICTED_R}`,
    rim: { cx: bx, cy: CY, r: RIM_R },
    backboard: `M ${bb} ${CY - BB_HALF} V ${CY + BB_HALF}`,
  };
}

export interface CourtPathSet {
  boundary: string;
  centerLine: string;
  centerCircle: string;
  halves: HalfPaths[];
}

export function courtPaths(mode: CourtMode = "half"): CourtPathSet {
  const w = courtWidth(mode);

  const halves: HalfPaths[] = [rightHalf(w)];
  if (mode === "full") {
    halves.push(leftHalf(0));
  }

  const centerX = mode === "full" ? w / 2 : 0;
  const centerCircle =
    mode === "full"
      ? [
          `M ${centerX} ${CY - CENTER_R}`,
          `A ${CENTER_R} ${CENTER_R} 0 1 1 ${centerX} ${CY + CENTER_R}`,
          `A ${CENTER_R} ${CENTER_R} 0 1 1 ${centerX} ${CY - CENTER_R}`,
        ].join(" ")
      : `M 0 ${CY - CENTER_R} A ${CENTER_R} ${CENTER_R} 0 0 1 0 ${CY + CENTER_R}`;

  return {
    boundary: `M 0 0 H ${w} V ${COURT_H} H 0 Z`,
    centerLine: mode === "full" ? `M ${w / 2} 0 V ${COURT_H}` : `M 0 0 V ${COURT_H}`,
    centerCircle,
    halves,
  };
}
