import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import type { TacticDocumentV1 } from "@basketball/shared";
import { tryParseTacticDocumentV1 } from "@basketball/shared";
import { PlaybackPreviewSection } from "../tactic/PlaybackPreviewSection";
import { courtModeFromDocument } from "../tactic/court-geometry";
import { TemplateCardContent } from "../tactic/TemplateCard";
import {
  TEMPLATES,
  localizeTemplateDocument,
  localizedText,
  type Template,
} from "../tactic/templates";

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

function builtInMatchesQuery(
  template: Template,
  q: string,
  lang: "zh" | "en",
  t: (key: string) => string,
) {
  const query = q.trim().toLocaleLowerCase();
  if (!query) return true;
  const haystack = [
    t(template.nameKey),
    t(template.descKey),
    template.document.meta.name ?? "",
    template.document.meta.description ?? "",
    ...(template.document.meta.tags ?? []),
    localizedText(template.coaching.phase, lang),
    localizedText(template.coaching.coverage, lang),
    ...template.coaching.focus.map((item) => localizedText(item, lang)),
    ...template.coaching.reads.map((item) => localizedText(item, lang)),
  ].join(" ").toLocaleLowerCase();
  return haystack.includes(query);
}

function sharedMatchesQuery(item: LibraryListItem, q: string) {
  const query = q.trim().toLocaleLowerCase();
  if (!query) return true;
  return [
    item.name,
    item.description ?? "",
    item.category ?? "",
    item.author.name,
    item.author.email,
    ...item.tags,
  ].join(" ").toLocaleLowerCase().includes(query);
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
  const { lang, t } = useT();
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryListItem[]>([]);
  const [sharedTotal, setSharedTotal] = useState(0);
  const [sharedPage, setSharedPage] = useState(1);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activePage, setActivePage] = useState<"builtin" | "user">("builtin");
  const listRequestRef = useRef<AbortController | null>(null);
  const builtIns = useMemo(
    () => TEMPLATES.filter((tmpl) => builtInMatchesQuery(tmpl, q, lang, t)),
    [lang, q, t],
  );
  const filteredItems = useMemo(
    () => items.filter((item) => sharedMatchesQuery(item, q)),
    [items, q],
  );

  const load = useCallback(async (query: string, page: number, signal: AbortSignal, append: boolean) => {
    setErr(null);
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "100" });
      if (query.trim()) params.set("q", query.trim());
      const res = await api<{ items: LibraryListItem[]; total: number }>(
        `/api/v1/plays/library?${params.toString()}`,
        { signal },
      );
      setItems((current) => append ? [...current, ...res.items] : res.items);
      setSharedTotal(res.total);
      setSharedPage(page);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return false;
      setErr(t("lib.loadFailed"));
      return false;
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (!user) return;
    listRequestRef.current?.abort();
    const controller = new AbortController();
    listRequestRef.current = controller;
    const timer = window.setTimeout(() => {
      void load(q, 1, controller.signal, false);
    }, q.trim() ? 220 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load, q, user]);

  useEffect(() => () => {
    listRequestRef.current?.abort();
  }, []);

  const loadMore = useCallback(() => {
    listRequestRef.current?.abort();
    const controller = new AbortController();
    listRequestRef.current = controller;
    void load(q, sharedPage + 1, controller.signal, true);
  }, [load, q, sharedPage]);

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
          <span className="status-pill page-count-pill">{builtIns.length + sharedTotal}</span>
        </div>
      </header>
      {err ? (
        <div className="state-surface state-surface--error state-surface--compact">
          <p>{err}</p>
        </div>
      ) : null}
      <div className="page-toolbar">
        <label className="sr-only" htmlFor="library-search">{t("lib.search")}</label>
        <input
          id="library-search"
          type="search"
          className="toolbar-search"
          placeholder={t("lib.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        <span className="toolbar-result-count" aria-live="polite">
          {t("lib.results").replace("{count}", String(activePage === "builtin" ? builtIns.length : filteredItems.length))}
        </span>
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
          {t("lib.userTitle")} ({sharedTotal})
        </button>
      </div>

      {activePage === "builtin" ? (
        <div className="template-catalog" role="tabpanel">
          {builtIns.map((tmpl) => (
            <Link
              key={tmpl.id}
              to={`/library/builtin/${tmpl.id}`}
              className="template-card template-card--catalog"
            >
              <TemplateCardContent template={tmpl} />
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
          {loading ? (
            <div className="state-surface state-surface--loading state-surface--compact" role="status">
              <p>{t("view.loading")}</p>
            </div>
          ) : null}
          {filteredItems.map((p) => (
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
          {!loading && filteredItems.length === 0 && !err ? (
            <div className="state-surface state-surface--empty state-surface--compact">
              <p>{t("lib.empty")}</p>
            </div>
          ) : null}
          {!loading && items.length < sharedTotal && !err ? (
            <div className="library-load-more">
              <button type="button" className="btn" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? t("view.loading") : t("lib.loadMore")}
              </button>
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
  const { lang, t } = useT();
  const nav = useNavigate();
  const { user } = useAuth();
  const [copying, setCopying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const template = TEMPLATES.find((tmpl) => tmpl.id === templateId);
  const localizedDocument = useMemo(
    () => (template ? localizeTemplateDocument(template, lang, t) : null),
    [lang, t, template],
  );

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
  const doc = localizedDocument!;

  async function copy() {
    setCopying(true);
    setErr(null);
    try {
      const document = structuredClone(doc);
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
            {localizedText(tmpl.coaching.phase, lang)} · {tmpl.coaching.format} · {t(`tpl.level.${tmpl.coaching.level}`)} · {t("bench.court")}: {courtModeFromDocument(doc) === "full" ? t("bench.full") : t("bench.half")}
          </p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn-primary" onClick={() => void copy()} disabled={copying}>
            {copying ? t("lib.copying") : t("lib.copyToMine")}
          </button>
        </div>
      </header>
      <section className="template-playbook" aria-labelledby="template-playbook-title">
        <div className="template-playbook__heading">
          <p className="page-eyebrow">{t("tpl.playbook")}</p>
          <h2 id="template-playbook-title">{t("tpl.coachingPlan")}</h2>
          <p>{localizedText(tmpl.coaching.coverage, lang)}</p>
        </div>
        <div className="template-playbook__group">
          <h3>{t("tpl.focus")}</h3>
          <ul>
            {tmpl.coaching.focus.map((item) => (
              <li key={item.en}>{localizedText(item, lang)}</li>
            ))}
          </ul>
        </div>
        <div className="template-playbook__group template-playbook__group--reads">
          <h3>{t("tpl.reads")}</h3>
          <ol>
            {tmpl.coaching.reads.map((item) => (
              <li key={item.en}>{localizedText(item, lang)}</li>
            ))}
          </ol>
        </div>
      </section>
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
