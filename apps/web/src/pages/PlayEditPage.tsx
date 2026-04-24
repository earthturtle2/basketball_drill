import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import type { TacticDocumentV1 } from "@basketball/shared";
import { PlayPreview } from "../tactic/PlayPreview";

type Play = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  document: TacticDocumentV1;
  updatedAt: string;
};

export function PlayEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [tMs, setTms] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doc, setDoc] = useState<TacticDocumentV1 | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setErr(null);
    try {
      const p = await api<Play>(`/api/v1/plays/${id}`);
      setName(p.name);
      setDescription(p.description ?? "");
      setJsonText(JSON.stringify(p.document, null, 2));
      setDoc(p.document);
      setTms(0);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "加载失败");
    }
  }, [id]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  // requestAnimationFrame-based playback
  const startRef = useRef(0);
  useEffect(() => {
    if (!doc || !playing) return;
    const duration = doc.meta?.durationMs ?? 8000;
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

  if (!user) return <Navigate to="/login" replace />;
  if (!id) return <p className="error">缺少 id</p>;

  function applyLocalJson() {
    setErr(null);
    try {
      const d = JSON.parse(jsonText) as TacticDocumentV1;
      setDoc(d);
    } catch {
      setErr("JSON 无效");
    }
  }

  async function save() {
    setErr(null);
    let parsed: TacticDocumentV1;
    try {
      parsed = JSON.parse(jsonText) as TacticDocumentV1;
    } catch {
      setErr("JSON 无效，无法保存");
      return;
    }
    try {
      await api<Play>(`/api/v1/plays/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description, document: parsed }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "保存失败");
    }
  }

  async function del() {
    if (!confirm("确定删除该战术？")) return;
    setErr(null);
    try {
      await api(`/api/v1/plays/${id}`, { method: "DELETE" });
      nav("/plays", { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "删除失败");
    }
  }

  async function duplicate() {
    setErr(null);
    try {
      const res = await api<{ id: string }>(`/api/v1/plays/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ name: `${name}（副本）` }),
      });
      nav(`/plays/${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "复制失败");
    }
  }

  async function share() {
    setErr(null);
    setViewUrl(null);
    try {
      const s = await api<{ viewUrl: string }>(`/api/v1/plays/${id}/shares`, {
        method: "POST",
        body: "{}",
      });
      setViewUrl(s.viewUrl);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "生成分享失败");
    }
  }

  const duration = doc?.meta?.durationMs ?? 8000;

  return (
    <div>
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link to="/plays" className="muted">
          ← 我的战术
        </Link>
      </p>
      <h1 style={{ margin: "0 0 0.5rem" }}>编辑战术</h1>
      {err ? <p className="error">{err}</p> : null}
      {viewUrl ? (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p className="hint" style={{ marginTop: 0 }}>
            学员打开（只读）：
          </p>
          <a href={viewUrl} target="_blank" rel="noreferrer">
            {viewUrl}
          </a>
        </div>
      ) : null}
      <div className="row-actions" style={{ marginBottom: "1rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => void save()}>
          保存
        </button>
        <button type="button" className="btn" onClick={() => void duplicate()}>
          复制
        </button>
        <button type="button" className="btn" onClick={() => void share()}>
          生成分享链接
        </button>
        <button type="button" className="btn" onClick={() => void del()}>
          删除
        </button>
      </div>
      <div className="field">
        <label htmlFor="n">名称</label>
        <input id="n" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="d">说明</label>
        <textarea
          id="d"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="j">战术 JSON</label>
        <textarea
          id="j"
          rows={14}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
        />
        <p style={{ margin: "0.4rem 0 0" }}>
          <button type="button" className="btn btn-ghost" onClick={applyLocalJson}>
            应用 JSON 到预览
          </button>
        </p>
      </div>
      {doc ? (
        <div className="card" style={{ marginTop: "1.25rem" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>半场预览</h2>
          <PlayPreview document={doc} tMs={tMs} />
          <div className="controls">
            <label className="muted" htmlFor="range">
              时间 {Math.round(tMs)} ms / {duration} ms
            </label>
            <input
              id="range"
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
      ) : null}
    </div>
  );
}
