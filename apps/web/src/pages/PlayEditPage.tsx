import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
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
  const { t } = useT();
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
  const [frameByFrame, setFrameByFrame] = useState(true);
  const [frameStepTarget, setFrameStepTarget] = useState<{ from: number; to: number } | null>(null);
  const [loop, setLoop] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(0.5);

  const savedSnapshotRef = useRef<string>("");
  const tMsRef = useRef(0);
  tMsRef.current = tMs;
  const speedRef = useRef(playbackSpeed);
  speedRef.current = playbackSpeed;
  const frameStepTargetRef = useRef(frameStepTarget);
  frameStepTargetRef.current = frameStepTarget;
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty = useCallback(() => {
    if (!doc) return false;
    const current = JSON.stringify({ name, description, doc });
    return current !== savedSnapshotRef.current;
  }, [name, description, doc]);

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
      setErr(e instanceof ApiError ? e.message : t("edit.saveFailed"));
      setSaveStatus("unsaved");
    }
  }, [id, name, description, doc, markSaved, t]);

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
      setErr(e instanceof ApiError ? e.message : t("edit.loadFailed"));
    }
  }, [id, t]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

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
    const dur = doc.meta?.durationMs ?? 8000;
    const speed = playbackSpeed;
    startRef.current = performance.now() - tMsRef.current / speed;
    let raf: number;
    const tick = (now: number) => {
      const raw = (now - startRef.current) * speed;
      if (loop) {
        setTms(raw % (dur || 1));
      } else {
        if (raw >= dur) {
          setTms(dur);
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

  if (!user) return <Navigate to="/login" replace />;
  if (!id) return <p className="error">{t("edit.missingId")}</p>;

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
      setErr(t("edit.jsonInvalid"));
    }
  }

  async function del() {
    if (!confirm(t("edit.confirmDelete"))) return;
    setErr(null);
    try {
      await api(`/api/v1/plays/${id}`, { method: "DELETE" });
      nav("/plays", { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("edit.deleteFailed"));
    }
  }

  async function duplicate() {
    setErr(null);
    try {
      const res = await api<{ id: string }>(`/api/v1/plays/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ name: `${name}${t("edit.copySuffix")}` }),
      });
      nav(`/plays/${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("edit.duplicateFailed"));
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
      setErr(e instanceof ApiError ? e.message : t("edit.shareFailed"));
    }
  }

  const duration = doc?.meta?.durationMs ?? 8000;
  const statusLabel = {
    saved: t("edit.statusSaved"),
    saving: t("edit.statusSaving"),
    unsaved: t("edit.statusUnsaved"),
  }[saveStatus];

  return (
    <div>
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link to="/plays" className="muted">
          {t("edit.back")}
        </Link>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>{t("edit.title")}</h1>
        <span className={`save-status save-status--${saveStatus}`}>{statusLabel}</span>
      </div>
      {err ? <p className="error">{err}</p> : null}
      {viewUrl ? (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <p className="hint" style={{ marginTop: 0 }}>
            {t("edit.viewHint")}
          </p>
          <a href={viewUrl} target="_blank" rel="noreferrer">
            {viewUrl}
          </a>
        </div>
      ) : null}
      <div className="row-actions" style={{ marginBottom: "1rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => void doSave()}>
          {t("edit.save")}
        </button>
        <button type="button" className="btn" onClick={() => void duplicate()}>
          {t("edit.duplicate")}
        </button>
        <button type="button" className="btn" onClick={() => void share()}>
          {t("edit.share")}
        </button>
        <button type="button" className="btn" onClick={() => void del()}>
          {t("edit.delete")}
        </button>
      </div>
      <div className="field">
        <label htmlFor="n">{t("edit.name")}</label>
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
        <label htmlFor="d">{t("edit.description")}</label>
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

      {doc ? (
        <TacticEditor
          document={doc}
          onChange={handleDocChange}
          onOpenTemplates={() => setShowTemplates(true)}
          courtMode={courtMode}
          onCourtModeChange={setCourtMode}
        />
      ) : null}

      {doc ? (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>{t("edit.preview")}</h2>
          <PlayPreview document={doc} tMs={tMs} courtMode={courtMode} />
          <div className="controls">
            <span
              className="muted"
              style={{
                minWidth: "10ch",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                fontFamily: "monospace, sans-serif",
                fontSize: "0.85rem",
                flexShrink: 0,
              }}
            >
              {Math.round(tMs)} / {duration} ms
            </span>
            <input
              id="range"
              type="range"
              min={0}
              max={duration}
              value={tMs}
              onChange={(e) => {
                setPlaying(false);
                setFrameStepTarget(null);
                setTms(Number(e.target.value));
              }}
              style={{ flex: 1 }}
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
                if (playing) {
                  setPlaying(false);
                } else {
                  if (tMs >= duration) setTms(0);
                  setPlaying(true);
                }
              }}
            >
              {frameByFrame
                ? t("edit.play")
                : playing
                  ? t("edit.pause")
                  : t("edit.play")}
            </button>
            <label
              className="controls__loop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.85rem",
                color: "var(--muted)",
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              <input
                type="checkbox"
                checked={frameByFrame}
                onChange={(e) => {
                  setFrameByFrame(e.target.checked);
                }}
              />
              <span>{t("edit.frameByFrame")}</span>
            </label>
            <label
              className="controls__loop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.85rem",
                color: "var(--muted)",
                cursor: "pointer",
                flexShrink: 0,
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                disabled={frameByFrame}
              />
              <span>{t("edit.loop")}</span>
            </label>
            <span
              className="muted"
              style={{
                fontSize: "0.82rem",
                flexShrink: 0,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              {t("edit.speed")}
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
      ) : null}

      <details
        style={{ marginTop: "1rem" }}
        open={showJson}
        onToggle={(e) => setShowJson((e.target as HTMLDetailsElement).open)}
      >
        <summary className="muted" style={{ cursor: "pointer" }}>{t("edit.jsonTitle")}</summary>
        <div className="field" style={{ marginTop: "0.5rem" }}>
          <textarea
            rows={12}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
          <p style={{ margin: "0.4rem 0 0" }}>
            <button type="button" className="btn btn-ghost" onClick={applyLocalJson}>
              {t("edit.applyJson")}
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
