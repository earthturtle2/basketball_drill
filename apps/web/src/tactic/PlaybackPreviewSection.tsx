import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import { PlayPreview } from "./PlayPreview";
import { courtModeFromDocument } from "./court-geometry";
import { playbackEndMs } from "./viewer-math";
import { useT } from "../i18n";
import { parseFinishOptionsEvent } from "./finish-options-data";

type Props = {
  document: TacticDocumentV1;
  /** When this value changes, time and playback state reset (e.g. play id or share token). */
  resetPlaybackKey?: string | number;
  rangeInputId?: string;
};

type EventRow = NonNullable<TacticDocumentV1["events"]>[number];

function stringField(event: EventRow, key: string) {
  const value = (event as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function teachingField(event: EventRow, key: "concept" | "explanation") {
  const teaching = (event as { teaching?: Record<string, unknown> }).teaching;
  const value = teaching?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function actorLabel(doc: TacticDocumentV1, actorId: string | undefined) {
  if (!actorId) return "";
  const actor = doc.actors.find((item) => item.id === actorId);
  if (!actor) return actorId;
  if (actor.type === "player") return actor.label || String(actor.number);
  return actor.id;
}

function eventKindLabel(kind: string, t: (key: string) => string) {
  const key = `view.event.${kind}`;
  const label = t(key);
  return label === key ? kind : label;
}

function eventTitle(event: EventRow, doc: TacticDocumentV1, t: (key: string) => string) {
  const from = actorLabel(doc, event.from);
  const to = actorLabel(doc, event.to);
  const label = eventKindLabel(event.kind, t);
  if (event.kind === "pass" && from && to) return `${label}: ${from} -> ${to}`;
  if (event.kind === "handoff" && from && to) return `${label}: ${from} -> ${to}`;
  if (event.kind === "screen" && from) return `${label}: ${from}`;
  if (event.kind === "cut" && from) return `${label}: ${from}`;
  if (event.kind === "possess" && to) return `${label}: ${to}`;
  if (event.kind === "finish_options" && from) return `${label}: ${from}`;
  return label;
}

function eventDetails(event: EventRow) {
  const details = [
    event.note,
    teachingField(event, "explanation"),
    stringField(event, "readTrigger") ?? stringField(event, "read_trigger"),
    stringField(event, "playerTask") ?? stringField(event, "player_task"),
    stringField(event, "commonMistake") ?? stringField(event, "common_mistake"),
  ].filter((item): item is string => Boolean(item?.trim()));
  return [...new Set(details)];
}

function eventTags(event: EventRow) {
  return [
    teachingField(event, "concept"),
    stringField(event, "screenSubtype") ?? stringField(event, "screen_subtype"),
    event.coverage,
    event.cut,
    event.handoff,
  ].filter((item): item is string => Boolean(item));
}

function finishLabels(event: EventRow) {
  const parsed = parseFinishOptionsEvent(event);
  if (!parsed) return [];
  return parsed.options
    .map((option, index) => option.label?.trim() || `${option.kind} ${index + 1}`)
    .filter(Boolean);
}

function hasTeachingValue(event: EventRow) {
  return (
    event.note ||
    teachingField(event, "explanation") ||
    teachingField(event, "concept") ||
    stringField(event, "readTrigger") ||
    stringField(event, "read_trigger") ||
    stringField(event, "playerTask") ||
    stringField(event, "player_task") ||
    stringField(event, "commonMistake") ||
    stringField(event, "common_mistake") ||
    event.kind === "finish_options"
  );
}

export function PlaybackPreviewSection({ document: doc, resetPlaybackKey, rangeInputId = "playback-range" }: Props) {
  const { t } = useT();
  const [tMs, setTms] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frameByFrame, setFrameByFrame] = useState(false);
  const [frameStepTarget, setFrameStepTarget] = useState<{ from: number; to: number } | null>(null);
  const [loop, setLoop] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const tMsRef = useRef(0);
  tMsRef.current = tMs;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;
  const frameStepTargetRef = useRef(frameStepTarget);
  frameStepTargetRef.current = frameStepTarget;

  useEffect(() => {
    setTms(0);
    setPlaying(false);
    setFrameByFrame(false);
    setFrameStepTarget(null);
    setLoop(false);
  }, [resetPlaybackKey]);

  const effectiveEnd = playbackEndMs(doc);

  const startFrameStep = useCallback(() => {
    if (frameStepTargetRef.current) return;
    const endT = playbackEndMs(doc);
    const stops = [...new Set([
      ...doc.keyframes.map((k) => k.t),
      ...(doc.events ?? []).map((event) => event.t),
    ])].sort((a, b) => a - b);
    if (endT > (stops[stops.length - 1] ?? 0)) stops.push(endT);
    if (stops.length === 0) return;
    const E = 0.5;
    const from = tMsRef.current;
    const nextT = stops.find((tm) => tm > from + E);
    if (nextT !== undefined) {
      if (Math.abs(nextT - from) < 0.25) return;
      setFrameStepTarget({ from, to: nextT });
      return;
    }
    if (stops.length < 2) {
      setTms(stops[0]!);
      return;
    }
    const t0 = stops[0]!;
    const t1 = stops[1]!;
    if (Math.abs(t1 - t0) < 0.25) {
      setTms(t0);
      return;
    }
    setTms(t0);
    setFrameStepTarget({ from: t0, to: t1 });
  }, [doc]);

  const startRef = useRef(0);
  useEffect(() => {
    if (frameByFrame) setPlaying(false);
  }, [frameByFrame]);

  useEffect(() => {
    if (!frameByFrame) setFrameStepTarget(null);
  }, [frameByFrame]);

  useEffect(() => {
    if (!frameStepTarget) return;
    const { from, to } = frameStepTarget;
    if (from === to) {
      setFrameStepTarget(null);
      return;
    }
    const total = Math.abs(to - from);
    const dir = to >= from ? 1 : -1;
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const dt = (now - t0) * speedRef.current;
      if (dt >= total) {
        setTms(to);
        setFrameStepTarget(null);
        return;
      }
      setTms(from + dir * dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frameStepTarget]);

  useEffect(() => {
    if (!playing || frameByFrame) return;
    const endT = playbackEndMs(doc);
    const speed = playbackSpeed;
    startRef.current = performance.now() - tMsRef.current / speed;
    let raf: number;
    const tick = (now: number) => {
      const raw = (now - startRef.current) * speed;
      if (loop) {
        setTms(raw % (endT || 1));
      } else {
        if (raw >= endT) {
          setTms(endT);
          setPlaying(false);
          return;
        }
        setTms(raw);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, playing, loop, playbackSpeed, frameByFrame]);

  const previewStopTimes = useMemo(() => {
    const endT = playbackEndMs(doc);
    return [...new Set([0, ...doc.keyframes.map((k) => k.t), ...(doc.events ?? []).map((event) => event.t), endT])]
      .filter((tm) => tm >= 0 && tm <= endT)
      .sort((a, b) => a - b);
  }, [doc]);

  const teachingEvent = useMemo(() => {
    const candidates = (doc.events ?? [])
      .filter(hasTeachingValue)
      .filter((event) => event.t <= tMs + 250)
      .sort((a, b) => a.t - b.t);
    return candidates.at(-1) ?? null;
  }, [doc.events, tMs]);
  const teachingDetails = teachingEvent ? eventDetails(teachingEvent) : [];
  const teachingTags = teachingEvent ? eventTags(teachingEvent) : [];
  const teachingFinishLabels = teachingEvent ? finishLabels(teachingEvent) : [];

  const progressPct = effectiveEnd > 0 ? Math.max(0, Math.min(100, (tMs / effectiveEnd) * 100)) : 0;
  const currentStopIdx = previewStopTimes.findIndex((tm) => Math.abs(tm - tMs) < 1);
  const previousStop =
    [...previewStopTimes].reverse().find((tm) => tm < tMs - 1) ?? previewStopTimes[0];
  const nextStop = previewStopTimes.find((tm) => tm > tMs + 1) ?? previewStopTimes[previewStopTimes.length - 1];
  const seekPreview = (nextT: number) => {
    setPlaying(false);
    setFrameStepTarget(null);
    setTms(nextT);
  };

  const courtMode = courtModeFromDocument(doc);

  return (
    <>
      <PlayPreview document={doc} tMs={tMs} courtMode={courtMode} />
      {teachingEvent ? (
        <section className="teaching-panel" aria-label={t("view.teachingTitle")}>
          <div className="teaching-panel__header">
            <span className="teaching-panel__time">{Math.round(teachingEvent.t)} ms</span>
            <strong>{eventTitle(teachingEvent, doc, t)}</strong>
          </div>
          {teachingTags.length > 0 ? (
            <div className="teaching-panel__tags">
              {teachingTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
          {teachingDetails.length > 0 ? (
            <ul className="teaching-panel__details">
              {teachingDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
          {teachingFinishLabels.length > 0 ? (
            <p className="teaching-panel__reads">
              <span>{t("view.finishReads")}</span>
              {teachingFinishLabels.join(" / ")}
            </p>
          ) : null}
        </section>
      ) : null}
      <div className="preview-controls view-controls">
        <div className="preview-controls__timeline-row">
          <span className="preview-controls__time">
            {Math.round(tMs)} / {effectiveEnd} ms
          </span>
          <div className="preview-controls__timeline">
            <div className="preview-controls__track">
              <div className="preview-controls__progress" style={{ width: `${progressPct}%` }} />
              {previewStopTimes.map((tm, i) => {
                const left = effectiveEnd > 0 ? (tm / effectiveEnd) * 100 : 0;
                const active = currentStopIdx === i;
                return (
                  <button
                    key={`${tm}-${i}`}
                    type="button"
                    className={`preview-controls__mark${active ? " preview-controls__mark--active" : ""}`}
                    style={{ left: `${left}%` }}
                    onClick={() => seekPreview(tm)}
                    title={`${t("kf.frame")} ${i + 1}: ${tm}ms`}
                  />
                );
              })}
            </div>
            <input
              id={rangeInputId}
              className="preview-controls__range"
              type="range"
              min={0}
              max={effectiveEnd}
              value={tMs}
              onChange={(e) => seekPreview(Number(e.target.value))}
              aria-label={t("view.time")}
            />
          </div>
        </div>

        <div className="preview-controls__actions view-controls__actions">
          <div className="view-controls__transport">
            <button
              type="button"
              className="btn btn-sm"
              disabled={previousStop === undefined || tMs <= (previewStopTimes[0] ?? 0)}
              onClick={() => previousStop !== undefined && seekPreview(previousStop)}
              title={t("edit.prevFrame")}
            >
              {t("edit.prevFrame")}
            </button>
            <button
              type="button"
              className="btn btn-primary preview-controls__play"
              disabled={!!(frameByFrame && frameStepTarget !== null)}
              onClick={() => {
                if (frameByFrame) {
                  void startFrameStep();
                  return;
                }
                if (playing) {
                  setPlaying(false);
                } else {
                  if (tMs >= effectiveEnd) setTms(0);
                  setPlaying(true);
                }
              }}
            >
              {frameByFrame ? t("view.play") : playing ? t("view.pause") : t("view.play")}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={nextStop === undefined || tMs >= (previewStopTimes[previewStopTimes.length - 1] ?? effectiveEnd)}
              onClick={() => nextStop !== undefined && seekPreview(nextStop)}
              title={t("edit.nextFrame")}
            >
              {t("edit.nextFrame")}
            </button>
          </div>

          <div className="view-controls__options">
            <label className="preview-controls__toggle">
              <input
                type="checkbox"
                checked={frameByFrame}
                onChange={(e) => setFrameByFrame(e.target.checked)}
              />
              <span>{t("view.frameByFrame")}</span>
            </label>
            <label className="preview-controls__toggle">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                disabled={frameByFrame}
              />
              <span>{t("edit.loop")}</span>
            </label>
          </div>

          <span className="preview-controls__speed view-controls__speed">
            <span>{t("view.speed")}</span>
            {([0.5, 1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm ${playbackSpeed === s ? "btn-active" : ""}`}
                onClick={() => setPlaybackSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </span>
        </div>
      </div>
    </>
  );
}
