import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { TacticDocumentV1 } from "@basketball/shared";
import { PlayPreview } from "../tactic/PlayPreview";

type SharePayload = {
  play: { name: string; description: string | null; tags: string[]; document: TacticDocumentV1; updatedAt: string };
  share: { id: string; expiresAt: string | null };
};

export function ViewPage() {
  const { token } = useParams();
  const [data, setData] = useState<SharePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tMs, setTms] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!token) return;
    let c = true;
    setErr(null);
    void (async () => {
      try {
        const r = await fetch(`/api/v1/shares/${token}`);
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { message?: string };
          if (!c) return;
          setErr(j.message ?? "无法打开");
          return;
        }
        const j = (await r.json()) as SharePayload;
        if (c) {
          setData(j);
          setTms(0);
        }
      } catch {
        if (c) {
          setErr("网络错误");
        }
      }
    })();
    return () => {
      c = false;
    };
  }, [token]);

  const doc = data?.play.document;
  const duration = doc?.meta?.durationMs ?? 8000;

  useEffect(() => {
    if (!doc || !playing) return;
    const d = duration || 1;
    const id = setInterval(() => {
      setTms((m) => (m + 50) % d);
    }, 50);
    return () => clearInterval(id);
  }, [doc, playing, duration]);

  if (err) {
    return <p className="error">{err}</p>;
  }
  if (!data || !doc) {
    return <p className="hint">加载中…</p>;
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem" }}>{data.play.name}</h1>
      {data.play.description ? <p className="hint">{data.play.description}</p> : null}
      <PlayPreview document={doc} tMs={tMs} />
      <div className="controls">
        <label className="muted" htmlFor="v">
          时间 {Math.round(tMs)} ms / {duration} ms
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
          {playing ? "暂停" : "播放"}
        </button>
      </div>
    </div>
  );
}
