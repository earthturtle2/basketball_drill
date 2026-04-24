import { forwardRef, type ReactNode } from "react";
import { COURT_W, COURT_H, courtPaths } from "./court-geometry";

interface Props {
  children?: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}

const p = courtPaths();
const LINE = "rgba(255,255,255,0.45)";
const LINE_THIN = "rgba(255,255,255,0.25)";

export const CourtSVG = forwardRef<SVGSVGElement, Props>(
  ({ children, className, onClick }, ref) => (
    <svg
      ref={ref}
      viewBox={`0 0 ${COURT_W} ${COURT_H}`}
      className={className ?? "court-svg"}
      preserveAspectRatio="xMidYMid meet"
      onClick={onClick}
    >
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="rgba(255,200,60,0.8)" />
        </marker>
      </defs>

      {/* background */}
      <rect width={COURT_W} height={COURT_H} fill="#1a5c32" rx="1" />
      <rect width={COURT_W} height={COURT_H} fill="url(#courtGrad)" rx="1" />
      <defs>
        <linearGradient id="courtGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0f3d1f" stopOpacity="0.5" />
          <stop offset="50%" stopColor="transparent" stopOpacity="0" />
          <stop offset="100%" stopColor="#0f3d1f" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* court lines */}
      <path d={p.boundary} fill="none" stroke={LINE} strokeWidth="0.6" />
      <path d={p.halfLine} stroke={LINE} strokeWidth="0.6" />
      <path d={p.ftLane} fill="none" stroke={LINE} strokeWidth="0.6" />
      <path d={p.ftCircle} fill="none" stroke={LINE_THIN} strokeWidth="0.5" strokeDasharray="2 2" />
      <path d={p.threePt} fill="none" stroke={LINE} strokeWidth="0.6" />
      <path d={p.restricted} fill="none" stroke={LINE_THIN} strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      <path d={p.centerCircle} fill="none" stroke={LINE} strokeWidth="0.6" />

      {/* basket */}
      <path d={p.backboard} stroke={LINE} strokeWidth="0.8" />
      <circle cx={p.rim.cx} cy={p.rim.cy} r={p.rim.r} fill="none" stroke="#ff6030" strokeWidth="0.6" />

      {children}
    </svg>
  ),
);

CourtSVG.displayName = "CourtSVG";
