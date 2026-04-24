import { forwardRef, useMemo, type ReactNode } from "react";
import {
  courtWidth,
  COURT_H,
  courtPaths,
  type CourtMode,
} from "./court-geometry";

interface Props {
  mode?: CourtMode;
  children?: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}

const LINE = "rgba(255,255,255,0.5)";
const LINE_THIN = "rgba(255,255,255,0.28)";

export const CourtSVG = forwardRef<SVGSVGElement, Props>(
  ({ mode = "half", children, className, onClick }, ref) => {
    const w = courtWidth(mode);
    const p = useMemo(() => courtPaths(mode), [mode]);

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${COURT_H}`}
        className={className ?? "court-svg"}
        preserveAspectRatio="xMidYMid meet"
        onClick={onClick}
      >
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="rgba(255,200,60,0.8)" />
          </marker>
          <linearGradient id="courtGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f3d1f" stopOpacity="0.5" />
            <stop offset="50%" stopColor="transparent" stopOpacity="0" />
            <stop offset="100%" stopColor="#0f3d1f" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* background */}
        <rect width={w} height={COURT_H} fill="#1a5c32" rx="1" />
        <rect width={w} height={COURT_H} fill="url(#courtGrad)" rx="1" />

        {/* boundary + center */}
        <path d={p.boundary} fill="none" stroke={LINE} strokeWidth="0.6" />
        <path d={p.centerLine} stroke={LINE} strokeWidth="0.6" />
        <path d={p.centerCircle} fill="none" stroke={LINE} strokeWidth="0.6" />

        {/* per-half markings */}
        {p.halves.map((h, i) => (
          <g key={i}>
            <path d={h.ftLane} fill="none" stroke={LINE} strokeWidth="0.6" />
            <path d={h.ftCircle} fill="none" stroke={LINE_THIN} strokeWidth="0.5" strokeDasharray="2 2" />
            <path d={h.threePt} fill="none" stroke={LINE} strokeWidth="0.6" />
            <path d={h.restricted} fill="none" stroke={LINE_THIN} strokeWidth="0.5" strokeDasharray="1.5 1.5" />
            <path d={h.backboard} stroke={LINE} strokeWidth="0.8" />
            <circle cx={h.rim.cx} cy={h.rim.cy} r={h.rim.r} fill="none" stroke="#ff6030" strokeWidth="0.6" />
          </g>
        ))}

        {children}
      </svg>
    );
  },
);

CourtSVG.displayName = "CourtSVG";
