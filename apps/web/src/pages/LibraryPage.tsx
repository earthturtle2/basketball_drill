import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import type { TacticDocumentV1 } from "@basketball/shared";
import { tryParseTacticDocumentV1 } from "@basketball/shared";
import { PlayPreview } from "../tactic/PlayPreview";
import { playbackEndMs } from "../tactic/viewer-math";
import type { CourtMode } from "../tactic/court-geometry";

type LibraryListItem = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  userId: string;
  author: { name: string };
  updatedAt: string;
};

type LibraryDetail = {
  id: string;
  name: string;
  document: TacticDocumentV1;
  isOwner: boolean;
  author: { id: string; name: string | null; email: string };
  updatedAt: string;
};

function LibraryList() {
  const { t } = useT();
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryListItem[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    qs.set("pageSize", "100");
    try {
      const res = await api<{ items: LibraryListItem[] }>(`/api/v1/plays/library?${qs.toString()}`);
      setItems(res.items);
    } catch {
      setErr(t("lib.loadFailed"));
    }
  }, [q, t]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem" }}>{t("lib.title")}</h1>
      <p className="hint">{t("lib.hint")}</p>
      {err ? <p className="error">{err}</p> : null}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="search"
          className="btn"
          style={{ minWidth: 200, textAlign: "left" }}
          placeholder={t("lib.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <button type="button" className="btn" onClick={() => void load()}>
          {t("lib.search")}
        </button>
      </div>
      <div className="list">
        {items.map((p) => (
          <div key={p.id} className="list-item">
            <div>
              <h3>
                <Link to={`/library/${p.id}`}>{p.name}</Link>
                {p.userId === user.id ? (
                  <span className="status-pill" style={{ marginLeft: "0.5rem" }}>
                    {t("lib.mine")}
                  </span>
                ) : null}
              </h3>
              <p className="muted">
                {t("lib.by")} {p.author.name} · {t("plays.updatedAt")}{" "}
                {new Date(p.updatedAt).toLocaleString()}
              </p>
            </div>
            <div className="row-actions">
              <Link to={`/library/${p.id}`} className="btn btn-ghost">
                {t("lib.open")}
              </Link>
            </div>
          </div>
        ))}
        {items.length === 0 && !err ? <p className="muted">{t("lib.empty")}</p> : null}
      </div>
      {items.length > 0 ? (
        <p className="hint" style={{ marginTop: "1rem" }}>
          {t("lib.hintEnd")}
        </p>
      ) : null}
    </div>
  );
}

function LibraryDetail({ playId }: { playId: string }) {
  const { t } = useT();
  const nav = useNavigate();
  const { user } = useAuth();
  const [row, setRow] = useState<LibraryDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tMs, setTms] = useState(0);
  const [copying, setCopying] = useState(false);
  const [courtMode, setCourtMode] = useState<CourtMode>("half");

  useEffect(() => {
    setRow(null);
    setErr(null);
    setTms(0);
    (async () => {
      try {
        const p = await api<LibraryDetail>(`/api/v1/plays/library/${playId}`);
        setRow(p);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : t("lib.loadFailed"));
      }
    })();
  }, [playId, t]);

  const doc = useMemo(() => {
    if (!row) return null;
    const r = tryParseTacticDocumentV1(row.document);
    return r.success ? r.data : null;
  }, [row]);

  useEffect(() => {
    if (doc) setTms(0);
  }, [doc]);

  async function copy() {
    setCopying(true);
    setErr(null);
    try {
      const res = await api<{ id: string }>(`/api/v1/plays/library/${playId}/duplicate`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      nav(`/plays/${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("lib.copyFailed"));
    } finally {
      setCopying(false);
    }
  }

  if (!user) return <Navigate to="/login" replace />;

  const endMs = doc ? playbackEndMs(doc) : 0;

  return (
    <div>
      <p style={{ margin: "0 0 0.5rem" }}>
        <Link to="/library" className="muted">
          {t("lib.back")}
        </Link>
      </p>
      {err ? <p className="error">{err}</p> : null}
      {row && doc ? (
        <>
          <h1 style={{ margin: "0 0 0.5rem" }}>{row.name}</h1>
          <p className="hint">
            {t("lib.by")} {row.author.name ?? row.author.email}
            {row.isOwner ? ` · ${t("lib.mine")}` : null}
          </p>
          <div className="row-actions" style={{ margin: "0.75rem 0" }}>
            <button type="button" className="btn btn-primary" onClick={() => void copy()} disabled={copying}>
              {copying ? t("lib.copying") : t("lib.copyToMine")}
            </button>
            {row.isOwner ? (
              <Link to={`/plays/${row.id}`} className="btn">
                {t("lib.openMine")}
              </Link>
            ) : null}
          </div>
          <div className="field" style={{ marginBottom: "0.75rem" }}>
            <label>
              {t("bench.court")}{" "}
              <select
                className="btn"
                value={courtMode}
                onChange={(e) => setCourtMode(e.target.value as CourtMode)}
                style={{ marginLeft: "0.35rem" }}
              >
                <option value="half">{t("bench.half")}</option>
                <option value="full">{t("bench.full")}</option>
              </select>
            </label>
          </div>
          <div className="field" style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="lib-t">{t("view.time")}</label>
            <input
              id="lib-t"
              className="preview-controls__range"
              type="range"
              min={0}
              max={Math.max(0, endMs)}
              value={Math.min(tMs, endMs)}
              onChange={(e) => setTms(Number(e.target.value))}
            />
          </div>
          <PlayPreview document={doc} tMs={tMs} courtMode={courtMode} />
        </>
      ) : !err && row === null ? (
        <p className="hint">{t("view.loading")}</p>
      ) : row && !doc ? (
        <p className="error">{t("lib.invalidDoc")}</p>
      ) : null}
    </div>
  );
}

export function LibraryPage() {
  const { id } = useParams();
  if (id) {
    return <LibraryDetail playId={id} />;
  }
  return <LibraryList />;
}
