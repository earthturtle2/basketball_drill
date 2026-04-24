import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import type { TacticDocumentV1 } from "@basketball/shared";
import { TacticEditor } from "../tactic/TacticEditor";
import { PlayPreview } from "../tactic/PlayPreview";
import { TemplateLibrary } from "../tactic/TemplateLibrary";
import type { CourtMode } from "../tactic/court-geometry";

type Play = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  document: TacticDocumentV1;
  updatedAt: string;
};

type SaveStatus = "saved" | "saving" | "unsaved";

export function PlayEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [doc, setDoc] = useState<TacticDocumentV1 | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [tMs, setTms] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [courtMode, setCourtMode] = useState<CourtMode>("half");

  const savedSnapshotRef = useRef<string>("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = useCallback(() => {
    if (!doc) return false;
    const current = JSON.stringify({ name, description, doc });
    return current !== savedSnapshotRef.current;
  }, [name, description, doc]);

  // beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const markSaved = useCallback(() => {
    setSaveStatus("saved");
    savedSnapshotRef.current = JSON.stringify({ name, description, doc });
  }, [name, description, doc]);

  const doSave = useCallback(async () => {
    if (!id || !doc) return;
    setSaveStatus("saving");
    setErr(null);
    try {
      await api<Play>(`/api/v1/plays/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description, document: doc }),
      });
      markSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "保存失败");
      setSaveStatus("unsaved");
    }
  }, [id, name, description, doc, markSaved]);

  // Auto-save: 3s debounce after edits
  useEffect(() => {
    if (!doc || saveStatus === "saved" || saveStatus === "saving") return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void doSave();
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [doc, name, description, saveStatus, doSave]);

  const load = useCallback(async () => {
    if (!id) return;
    setErr(null);
    try {
      const p = await api<Play>(`/api/v1/plays/${id}`);
      setName(p.name);
      setDescription(p.description ?? "");
      setDoc(p.document);
      setJsonText(JSON.stringify(p.document, null, 2));
      setTms(0);
      savedSnapshotRef.current = JSON.stringify({
        name: p.name,
        description: p.description ?? "",
        doc: p.document,
      });
      setSaveStatus("saved");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "加载失败");
    }
  }, [id]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  // playback
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

  function handleDocChange(newDoc: TacticDocumentV1) {
    setDoc(newDoc);
    setJsonText(JSON.stringify(newDoc, null, 2));
    setSaveStatus("unsaved");
  }

  function applyLocalJson() {
    setErr(null);
    try {
      const d = JSON.parse(jsonText) as TacticDocumentV1;
      setDoc(d);
      setSaveStatus("unsaved");
    } catch {
      setErr("JSON 无效");
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
  const statusLabel = { saved: "已保存", saving: "保存中…", unsaved: "未保存" }[saveStatus];

  return (
    <div>
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link to="/plays" className="muted">
          ← 我的战术
        </Link>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>编辑战术</h1>
        <span className={`save-status save-status--${saveStatus}`}>{statusLabel}</span>
      </div>
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
        <button type="button" className="btn btn-primary" onClick={() => void doSave()}>
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
        <input
          id="n"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaveStatus("unsaved");
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="d">说明</label>
        <textarea
          id="d"
          rows={2}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setSaveStatus("unsaved");
          }}
        />
      </div>

      {/* Visual editor */}
      {doc ? (
        <TacticEditor
          document={doc}
          onChange={handleDocChange}
          onOpenTemplates={() => setShowTemplates(true)}
          courtMode={courtMode}
          onCourtModeChange={setCourtMode}
        />
      ) : null}

      {/* Playback preview */}
      {doc ? (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>动画预览</h2>
          <PlayPreview document={doc} tMs={tMs} courtMode={courtMode} />
          <div className="controls">
            <label className="muted" htmlFor="range">
              {Math.round(tMs)} ms / {duration} ms
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

      {/* Collapsible JSON fallback */}
      <details
        style={{ marginTop: "1rem" }}
        open={showJson}
        onToggle={(e) => setShowJson((e.target as HTMLDetailsElement).open)}
      >
        <summary className="muted" style={{ cursor: "pointer" }}>JSON 编辑（高级）</summary>
        <div className="field" style={{ marginTop: "0.5rem" }}>
          <textarea
            rows={12}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
          <p style={{ margin: "0.4rem 0 0" }}>
            <button type="button" className="btn btn-ghost" onClick={applyLocalJson}>
              应用 JSON
            </button>
          </p>
        </div>
      </details>

      {showTemplates && doc ? (
        <TemplateLibrary
          onSelect={(tmpl) => {
            handleDocChange(tmpl);
            setShowTemplates(false);
          }}
          onClose={() => setShowTemplates(false)}
        />
      ) : null}
    </div>
  );
}
