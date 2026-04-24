/**
 * FIBA half-court geometry in decimeters (viewBox 0 0 140 150).
 * Court: 14m length x 15m width.
 * Origin top-left, x right, y down.
 * Tactic coords (tx,ty) → SVG: (tx*140, (1-ty)*150).
 */

export const COURT_W = 140;
export const COURT_H = 150;

export function tacticToSvg(tx: number, ty: number): [number, number] {
  return [tx * COURT_W, (1 - ty) * COURT_H];
}

export function svgToTactic(sx: number, sy: number): [number, number] {
  return [
    Math.max(0, Math.min(1, sx / COURT_W)),
    Math.max(0, Math.min(1, 1 - sy / COURT_H)),
  ];
}

const BASKET_X = COURT_W - 15.75; // 1.575m from endline
const BASKET_Y = COURT_H / 2;     // center

const FT_LANE_W = 49;  // 4.9m wide
const FT_LANE_L = 58;  // 5.8m from endline
const FT_LEFT = COURT_W - FT_LANE_L;
const FT_TOP = BASKET_Y - FT_LANE_W / 2;
const FT_BOT = BASKET_Y + FT_LANE_W / 2;

const FT_CIRCLE_R = 18; // 1.8m
const THREE_R = 67.5;   // 6.75m
const THREE_CORNER_Y_TOP = 9;  // 0.9m from sideline
const THREE_CORNER_Y_BOT = COURT_H - 9;
const RESTRICTED_R = 12.5; // 1.25m
const CENTER_R = 18;
const RIM_R = 2.25;
const BACKBOARD_X = COURT_W - 12; // 1.2m from endline
const BACKBOARD_HALF = 9; // 0.9m each side

// Three-point arc meets corner straight lines
const dx3 = Math.sqrt(THREE_R ** 2 - (THREE_CORNER_Y_TOP - BASKET_Y) ** 2);
const THREE_ARC_X = BASKET_X - dx3;

export function courtPaths() {
  return {
    boundary: `M 0 0 H ${COURT_W} V ${COURT_H} H 0 Z`,

    ftLane: `M ${COURT_W} ${FT_TOP} H ${FT_LEFT} V ${FT_BOT} H ${COURT_W}`,

    ftCircle: `M ${FT_LEFT} ${BASKET_Y - FT_CIRCLE_R} A ${FT_CIRCLE_R} ${FT_CIRCLE_R} 0 1 1 ${FT_LEFT} ${BASKET_Y + FT_CIRCLE_R} A ${FT_CIRCLE_R} ${FT_CIRCLE_R} 0 1 1 ${FT_LEFT} ${BASKET_Y - FT_CIRCLE_R}`,

    threePt: [
      `M ${COURT_W} ${THREE_CORNER_Y_TOP} H ${THREE_ARC_X}`,
      `A ${THREE_R} ${THREE_R} 0 1 0 ${THREE_ARC_X} ${THREE_CORNER_Y_BOT}`,
      `H ${COURT_W}`,
    ].join(" "),

    restricted: `M ${BASKET_X} ${BASKET_Y - RESTRICTED_R} A ${RESTRICTED_R} ${RESTRICTED_R} 0 0 0 ${BASKET_X} ${BASKET_Y + RESTRICTED_R}`,

    centerCircle: `M 0 ${BASKET_Y - CENTER_R} A ${CENTER_R} ${CENTER_R} 0 0 1 0 ${BASKET_Y + CENTER_R}`,

    halfLine: `M 0 0 V ${COURT_H}`,

    rim: { cx: BASKET_X, cy: BASKET_Y, r: RIM_R },

    backboard: `M ${BACKBOARD_X} ${BASKET_Y - BACKBOARD_HALF} V ${BASKET_Y + BACKBOARD_HALF}`,
  };
}
