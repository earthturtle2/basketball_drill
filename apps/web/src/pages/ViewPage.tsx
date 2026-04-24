import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { TacticDocumentV1 } from "@basketball/shared";
import { PlayPreview } from "../tactic/PlayPreview";
import { playbackEndMs } from "../tactic/viewer-math";
import { useT } from "../i18n";

type SharePayload = {
  play: {
    name: string;
    description: string | null;
    tags: string[];
    document: TacticDocumentV1;
    updatedAt: string;
  };
  share: { id: string; expiresAt: string | null };
};

export function ViewPage() {
  const { token } = useParams();
  const { t } = useT();
  const [data, setData] = useState<SharePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tMs, setTms] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frameByFrame, setFrameByFrame] = useState(true);
  const [frameStepTarget, setFrameStepTarget] = useState<{ from: number; to: number } | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(0.5);
  const tMsRef = useRef(0);
  tMsRef.current = tMs;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;
  const frameStepTargetRef = useRef(frameStepTarget);
  frameStepTargetRef.current = frameStepTarget;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setErr(null);
    void (async () => {
      try {
        const r = await fetch(`/api/v1/shares/${token}`);
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { message?: string };
          if (!cancelled) setErr(j.message ?? t("view.cantOpen"));
          return;
        }
        const j = (await r.json()) as SharePayload;
        if (!cancelled) {
          setData(j);
          setTms(0);
        }
      } catch {
        if (!cancelled) setErr(t("view.networkError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const doc = data?.play.document;
  const duration = doc?.meta?.durationMs ?? 8000;
  const effectiveEnd = doc ? playbackEndMs(doc) : duration;

  const startFrameStep = useCallback(() => {
    if (!doc || frameStepTargetRef.current) return;
    const times = [...new Set(doc.keyframes.map((k) => k.t))].sort((a, b) => a - b);
    if (times.length === 0) return;
    const E = 0.5;
    const from = tMsRef.current;
    const nextT = times.find((tm) => tm > from + E) ?? times[0]!;
    if (Math.abs(nextT - from) < 0.25) return;
    setFrameStepTarget({ from, to: nextT });
  }, [doc]);

  const startRef = useRef(0);
  useEffect(() => {
    if (frameByFrame) setPlaying(false);
  }, [frameByFrame]);

  useEffect(() => {
    if (!frameByFrame) setFrameStepTarget(null);
  }, [frameByFrame]);

  // Frame-by-frame: play sim time from `from` to `to` (same speed rules as full playback, then stop)
  useEffect(() => {
    if (!doc || !frameStepTarget) return;
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
  }, [doc, frameStepTarget]);

  useEffect(() => {
    if (!doc || !playing || frameByFrame) return;
    const speed = playbackSpeed;
    startRef.current = performance.now() - tMsRef.current / speed;
    let raf: number;
    const tick = (now: number) => {
      const elapsed = ((now - startRef.current) * speed) % (effectiveEnd || 1);
      setTms(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, playing, effectiveEnd, playbackSpeed, frameByFrame]);

  if (err) return <p className="error">{err}</p>;
  if (!data || !doc) return <p className="hint">{t("view.loading")}</p>;

  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem" }}>{data.play.name}</h1>
      {data.play.description ? <p className="hint">{data.play.description}</p> : null}
      <PlayPreview document={doc} tMs={tMs} />
      <div className="controls">
        <label className="muted" htmlFor="v">
          {t("view.time")} {Math.round(tMs)} ms / {effectiveEnd} ms
        </label>
        <input
          id="v"
          type="range"
          min={0}
          max={effectiveEnd}
          value={tMs}
          onChange={(e) => {
            setPlaying(false);
            setFrameStepTarget(null);
            setTms(Number(e.target.value));
          }}
        />
        <button
          type="button"
          className="btn"
          disabled={!!(frameByFrame && frameStepTarget !== null)}
          onClick={() => {
            if (frameByFrame) {
              void startFrameStep();
              return;
            }
            setPlaying((p) => !p);
          }}
        >
          {frameByFrame ? t("view.play") : playing ? t("view.pause") : t("view.play")}
        </button>
        <label
          className="muted"
          style={{
            fontSize: "0.82rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={frameByFrame}
            onChange={(e) => setFrameByFrame(e.target.checked)}
          />
          <span>{t("view.frameByFrame")}</span>
        </label>
        <span
          className="muted"
          style={{
            fontSize: "0.82rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            flexWrap: "wrap",
          }}
        >
          {t("view.speed")}
          {([0.5, 1, 2] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm ${playbackSpeed === s ? "btn-active" : ""}`}
              onClick={() => setPlaybackSpeed(s)}
              style={{ minWidth: 44, padding: "0.25rem 0.45rem" }}
            >
              {s}×
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}
