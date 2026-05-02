import type { TacticDocumentV1 } from "@basketball/shared";
import { useMemo, type ReactNode } from "react";
import { tacticToSvg, type CourtMode } from "./court-geometry";
import { samplePoses } from "./viewer-math";

type EventRow = NonNullable<TacticDocumentV1["events"]>[number];
type FinishOptionKind = "shot" | "pass";

type FinishOption = {
  kind: FinishOptionKind;
  label?: string;
  to?: string;
  x?: number;
  y?: number;
  priority?: string;
};

type FinishOptionsEvent = {
  t: number;
  from?: string;
  options: FinishOption[];
};

type Vec = { x: number; y: number };

interface Props {
  document: TacticDocumentV1;
  courtMode?: CourtMode;
  visibleAtTimeMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseFinishOption(value: unknown): FinishOption | null {
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

function parseFinishOptionsEvent(event: EventRow): FinishOptionsEvent | null {
  if (event.kind !== "finish_options") return null;
  const rawOptions = (event as { options?: unknown }).options;
  if (!Array.isArray(rawOptions)) return null;

  const options = rawOptions.map(parseFinishOption).filter((option): option is FinishOption => Boolean(option));
  if (options.length === 0) return null;

  return {
    t: event.t,
    from: event.from,
    options,
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function optionTarget(option: FinishOption, poses: Record<string, Vec>): Vec | null {
  if (option.to && poses[option.to]) return poses[option.to]!;
  if (option.x !== undefined && option.y !== undefined) {
    return { x: clamp01(option.x), y: clamp01(option.y) };
  }
  return null;
}

function labelWidth(label: string) {
  return Math.max(14, label.length * 2.15 + 6);
}

export function FinishOptions({ document, courtMode = "half", visibleAtTimeMs }: Props) {
  const event = useMemo(() => {
    const optionsEvents = (document.events ?? [])
      .map(parseFinishOptionsEvent)
      .filter((item): item is FinishOptionsEvent => Boolean(item))
      .filter((item) => item.t <= visibleAtTimeMs)
      .sort((a, b) => a.t - b.t);
    return optionsEvents.at(-1) ?? null;
  }, [document.events, visibleAtTimeMs]);

  const actorLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const actor of document.actors) {
      if (actor.type === "player") labels.set(actor.id, actor.label);
    }
    return labels;
  }, [document.actors]);

  if (!event) return null;

  const poses = samplePoses(document, visibleAtTimeMs);
  const fromPose = event.from ? poses[event.from] : undefined;
  const fromSvg = fromPose ? tacticToSvg(fromPose.x, fromPose.y, courtMode) : null;
  const nodes: ReactNode[] = [];

  if (fromSvg) {
    nodes.push(
      <g key="finish-source">
        <circle
          cx={fromSvg[0]}
          cy={fromSvg[1]}
          r={8}
          fill="rgba(255, 213, 79, 0.08)"
          stroke="#ffd54f"
          strokeWidth="0.75"
          strokeDasharray="2 1.6"
        />
        <rect
          x={fromSvg[0] - 12}
          y={fromSvg[1] - 16}
          width={24}
          height={6.8}
          rx={3.4}
          fill="rgba(20, 24, 28, 0.72)"
          stroke="rgba(255, 213, 79, 0.7)"
          strokeWidth="0.35"
        />
        <text
          x={fromSvg[0]}
          y={fromSvg[1] - 12.4}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff8c4"
          fontSize={3.1}
          fontWeight="700"
          letterSpacing="0.25"
        >
          FINISH
        </text>
      </g>,
    );
  }

  event.options.forEach((option, idx) => {
    const target = optionTarget(option, poses);
    if (!target) return;

    const [tx, ty] = tacticToSvg(target.x, target.y, courtMode);
    const isShot = option.kind === "shot";
    const isPrimary = option.priority === "primary" || isShot;
    const stroke = isShot ? "#ff7043" : "#4dd0e1";
    const fill = isShot ? "rgba(255, 112, 67, 0.16)" : "rgba(77, 208, 225, 0.14)";
    const label =
      option.label ??
      (isShot ? "Shot" : option.to ? `Pass ${actorLabels.get(option.to) ?? option.to}` : "Pass");
    const width = labelWidth(label);
    const labelX = isShot ? tx - width / 2 : tx + 5;
    const labelY = isShot ? ty - 16 : ty + (idx % 2 === 0 ? -14 : 8);

    nodes.push(
      <g key={`finish-option-${idx}`}>
        {fromSvg ? (
          <line
            x1={fromSvg[0]}
            y1={fromSvg[1]}
            x2={tx}
            y2={ty}
            stroke={stroke}
            strokeWidth={isPrimary ? 0.95 : 0.75}
            strokeDasharray={isShot ? "1.2 1.4" : "3 2"}
            opacity={isPrimary ? 0.82 : 0.68}
            markerEnd={isShot ? undefined : "url(#arrow)"}
          />
        ) : null}

        {isShot ? (
          <g transform={`translate(${tx}, ${ty})`}>
            <circle r={5.6} fill={fill} stroke={stroke} strokeWidth="0.9" />
            <circle r={2.4} fill="none" stroke={stroke} strokeWidth="0.75" />
            <line x1={-7} y1={0} x2={7} y2={0} stroke={stroke} strokeWidth="0.55" strokeLinecap="round" />
            <line x1={0} y1={-7} x2={0} y2={7} stroke={stroke} strokeWidth="0.55" strokeLinecap="round" />
          </g>
        ) : (
          <g transform={`translate(${tx}, ${ty})`}>
            <circle r={4.4} fill={fill} stroke={stroke} strokeWidth="0.75" />
            <path d="M -1.8 -2.1 L 2.3 0 L -1.8 2.1 Z" fill={stroke} opacity="0.95" />
          </g>
        )}

        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            width={width}
            height={7}
            rx={3.5}
            fill="rgba(13, 20, 24, 0.78)"
            stroke={stroke}
            strokeWidth="0.35"
          />
          <text
            x={width / 2}
            y={3.65}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize={3.2}
            fontWeight="700"
          >
            {label}
          </text>
        </g>
      </g>,
    );
  });

  return <g className="finish-options" style={{ pointerEvents: "none" }}>{nodes}</g>;
}
