import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { TacticDocumentV1 } from "@basketball/shared";
import { PlayPreview } from "../tactic/PlayPreview";
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

  const startRef = useRef(0);
  useEffect(() => {
    if (!doc || !playing) return;
    startRef.current = performance.now() - tMs;
    let raf: number;
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) % (duration || 1);
      setTms(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, playing]);

  if (err) return <p className="error">{err}</p>;
  if (!data || !doc) return <p className="hint">{t("view.loading")}</p>;

  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem" }}>{data.play.name}</h1>
      {data.play.description ? <p className="hint">{data.play.description}</p> : null}
      <PlayPreview document={doc} tMs={tMs} />
      <div className="controls">
        <label className="muted" htmlFor="v">
          {t("view.time")} {Math.round(tMs)} ms / {duration} ms
        </label>
        <input
          id="v"
          type="range"
          min={0}
          max={duration}
          value={tMs}
          onChange={(e) => {
            setPlaying(false);
            setTms(Number(e.target.value));
          }}
        />
        <button type="button" className="btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? t("view.pause") : t("view.play")}
        </button>
      </div>
    </div>
  );
}
