import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import type { TacticDocumentV1 } from "@basketball/shared";
import { tryParseTacticDocumentV1 } from "@basketball/shared";
import { PlaybackPreviewSection } from "../tactic/PlaybackPreviewSection";
import { courtModeFromDocument } from "../tactic/court-geometry";
import { TEMPLATES, type Template } from "../tactic/templates";

type LibraryListItem = {
  id: string;
  name: string;
  description: string | null;
  category?: string;
  tags: string[];
  userId: string;
  author: { name: string; email: string; avatarUrl?: string | null };
  updatedAt: string;
};

function playIdSuffix(id: string) {
  const hex = id.replace(/-/g, "");
  return hex.length >= 8 ? hex.slice(-8) : id.slice(0, 8);
}

function builtInMatchesQuery(template: Template, q: string, t: (key: string) => string) {
  const query = q.trim().toLocaleLowerCase();
  if (!query) return true;
  const haystack = [
    t(template.nameKey),
    t(template.descKey),
    template.document.meta.name ?? "",
    template.document.meta.description ?? "",
    ...(template.document.meta.tags ?? []),
  ].join(" ").toLocaleLowerCase();
  return haystack.includes(query);
}

type LibraryDetail = {
  id: string;
  name: string;
  category?: string;
  document: TacticDocumentV1;
  isOwner: boolean;
  author: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
    bio?: string | null;
  };
  updatedAt: string;
};

function LibraryList() {
  const { t } = useT();
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryListItem[]>([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<"builtin" | "user">("builtin");
  const builtIns = useMemo(
    () => TEMPLATES.filter((tmpl) => builtInMatchesQuery(tmpl, q, t)),
    [q, t],
  );

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
    <div className="page-stack">
      <header className="page-header">
        <div className="page-title-block">
          <p className="page-eyebrow">{t("app.library")}</p>
          <h1>{t("lib.title")}</h1>
          <p className="hint">{t("lib.hint")}</p>
        </div>
        <div className="page-header__actions">
          <span className="status-pill page-count-pill">{builtIns.length + items.length}</span>
        </div>
      </header>
      {err ? (
        <div className="state-surface state-surface--error state-surface--compact">
          <p>{err}</p>
        </div>
      ) : null}
      <div className="page-toolbar">
        <input
          type="search"
          className="toolbar-search"
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

      <div className="page-tabs" role="tablist" aria-label={t("lib.title")}>
        <button
          type="button"
          role="tab"
          aria-selected={activePage === "builtin"}
          className={activePage === "builtin" ? "btn btn-primary" : "btn btn-ghost"}
          onClick={() => setActivePage("builtin")}
        >
          {t("lib.builtinTitle")} ({builtIns.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activePage === "user"}
          className={activePage === "user" ? "btn btn-primary" : "btn btn-ghost"}
          onClick={() => setActivePage("user")}
        >
          {t("lib.userTitle")} ({items.length})
        </button>
      </div>

      {activePage === "builtin" ? (
        <div className="list" role="tabpanel">
          {builtIns.map((tmpl) => (
            <Link key={tmpl.id} to={`/library/builtin/${tmpl.id}`} className="list-item list-item--link">
              <div>
                <h3 className="list-title-row">
                  <span className="list-item__title">{t(tmpl.nameKey)}</span>
                  <span className="status-pill">{t("lib.builtinBadge")}</span>
                </h3>
                <p className="muted">
                  {t(tmpl.descKey)}
                  {tmpl.document.meta.tags?.length
                    ? ` · ${tmpl.document.meta.tags.slice(0, 4).join(", ")}${tmpl.document.meta.tags.length > 4 ? "…" : ""}`
                    : null}
                </p>
              </div>
            </Link>
          ))}
          {builtIns.length === 0 ? (
            <div className="state-surface state-surface--empty state-surface--compact">
              <p>{t("lib.builtinEmpty")}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="list" role="tabpanel">
          {items.map((p) => (
            <Link key={p.id} to={`/library/${p.id}`} className="list-item list-item--link">
              <div>
                <h3 className="list-title-row">
                  {p.author.avatarUrl ? (
                    <img src={p.author.avatarUrl} alt="" className="avatar-thumb" width={36} height={36} />
                  ) : null}
                  <span className="list-item__title">{p.name}</span>
                  {p.category ? <span className="status-pill">{p.category}</span> : null}
                  {p.userId === user.id ? <span className="status-pill">{t("lib.mine")}</span> : null}
                </h3>
                <p className="muted">
                  {t("lib.by")} {p.author.name}
                  {p.author.email && p.author.email !== p.author.name ? ` · ${p.author.email}` : null}
                  {" "}
                  · #{playIdSuffix(p.id)}
                  {p.tags.length ? ` · ${p.tags.slice(0, 4).join(", ")}${p.tags.length > 4 ? "…" : ""}` : null}
                  {" "}
                  · {t("plays.updatedAt")} {new Date(p.updatedAt).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
          {items.length === 0 && !err ? (
            <div className="state-surface state-surface--empty state-surface--compact">
              <p>{t("lib.empty")}</p>
            </div>
          ) : null}
        </div>
      )}
      {builtIns.length > 0 || items.length > 0 ? (
        <p className="hint inline-note">
          {t("lib.hintEnd")}
        </p>
      ) : null}
    </div>
  );
}

function BuiltinLibraryDetail({ templateId }: { templateId: string }) {
  const { t } = useT();
  const nav = useNavigate();
  const { user } = useAuth();
  const [copying, setCopying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const template = TEMPLATES.find((tmpl) => tmpl.id === templateId);

  if (!user) return <Navigate to="/login" replace />;
  if (!template) {
    return (
      <div>
        <p className="back-link">
          <Link to="/library" className="muted">
            {t("lib.back")}
          </Link>
        </p>
        <div className="state-surface state-surface--error">
          <p>{t("lib.invalidDoc")}</p>
        </div>
      </div>
    );
  }

  const tmpl = template;
  const doc = tmpl.document;

  async function copy() {
    setCopying(true);
    setErr(null);
    try {
      const document = structuredClone(doc);
      document.meta = {
        ...document.meta,
        name: t(tmpl.nameKey),
        description: t(tmpl.descKey),
      };
      const res = await api<{ id: string }>("/api/v1/plays", {
        method: "POST",
        body: JSON.stringify({
          name: t(tmpl.nameKey),
          description: t(tmpl.descKey),
          category: document.meta.category ?? "",
          tags: document.meta.tags ?? [],
          document,
          teamIds: [] as string[],
        }),
      });
      nav(`/plays/${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("lib.copyFailed"));
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="page-stack">
      <p className="back-link">
        <Link to="/library" className="muted">
          {t("lib.back")}
        </Link>
      </p>
      {err ? (
        <div className="state-surface state-surface--error state-surface--compact">
          <p>{err}</p>
        </div>
      ) : null}
      <header className="page-header">
        <div className="page-title-block">
          <p className="page-eyebrow">{t("lib.builtinBadge")}</p>
          <h1>{t(tmpl.nameKey)}</h1>
          <p className="hint">{t(tmpl.descKey)}</p>
          <p className="muted detail-meta">
            {doc.meta.tags?.length ? `${doc.meta.tags.join(", ")} · ` : ""}
            {t("bench.court")}: {courtModeFromDocument(doc) === "full" ? t("bench.full") : t("bench.half")}
          </p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn-primary" onClick={() => void copy()} disabled={copying}>
            {copying ? t("lib.copying") : t("lib.copyToMine")}
          </button>
        </div>
      </header>
      <PlaybackPreviewSection document={doc} resetPlaybackKey={`builtin-${tmpl.id}`} rangeInputId="builtin-playback-range" />
    </div>
  );
}

function LibraryDetail({ playId }: { playId: string }) {
  const { t } = useT();
  const nav = useNavigate();
  const { user } = useAuth();
  const [row, setRow] = useState<LibraryDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    setRow(null);
    setErr(null);
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

  return (
    <div className="page-stack">
      <p className="back-link">
        <Link to="/library" className="muted">
          {t("lib.back")}
        </Link>
      </p>
      {err ? (
        <div className="state-surface state-surface--error state-surface--compact">
          <p>{err}</p>
        </div>
      ) : null}
      {row && doc ? (
        <>
          <header className="page-header">
            <div className="page-title-block avatar-line">
              {row.author.avatarUrl ? (
                <img
                  src={row.author.avatarUrl}
                  alt=""
                  className="avatar-thumb avatar-thumb--lg"
                  width={48}
                  height={48}
                />
              ) : null}
              <div>
                <p className="page-eyebrow">
                  {t("lib.by")} {row.author.name ?? row.author.email}
                </p>
                <h1>{row.name}</h1>
                <p className="hint">
                  {row.author.name && row.author.email && row.author.name !== row.author.email
                    ? `${row.author.email} · `
                    : ""}
                  #{playIdSuffix(row.id)}
                  {row.isOwner ? ` · ${t("lib.mine")}` : null}
                </p>
                <p className="muted detail-meta">
                  {row.category ? `${t("edit.tacticCategory")}: ${row.category} · ` : ""}
                  {t("bench.court")}: {courtModeFromDocument(doc) === "full" ? t("bench.full") : t("bench.half")}
                </p>
                {row.author.bio ? (
                  <p className="muted library-author-bio">
                    {row.author.bio}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="page-header__actions">
              <button type="button" className="btn btn-primary" onClick={() => void copy()} disabled={copying}>
                {copying ? t("lib.copying") : t("lib.copyToMine")}
              </button>
              {row.isOwner ? (
                <Link to={`/plays/${row.id}`} className="btn">
                  {t("lib.openMine")}
                </Link>
              ) : null}
            </div>
          </header>
          <PlaybackPreviewSection document={doc} resetPlaybackKey={playId} rangeInputId="lib-playback-range" />
        </>
      ) : !err && row === null ? (
        <div className="state-surface state-surface--loading">
          <p>{t("view.loading")}</p>
        </div>
      ) : row && !doc ? (
        <div className="state-surface state-surface--error">
          <p>{t("lib.invalidDoc")}</p>
        </div>
      ) : null}
    </div>
  );
}

export function LibraryPage() {
  const { id } = useParams();
  const location = useLocation();
  if (id && location.pathname.startsWith("/library/builtin/")) {
    return <BuiltinLibraryDetail templateId={id} />;
  }
  if (id) {
    return <LibraryDetail playId={id} />;
  }
  return <LibraryList />;
}
