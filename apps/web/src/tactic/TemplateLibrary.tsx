import { useCallback, useEffect, useRef, useState } from "react";
import { tryParseTacticDocumentV1, type TacticDocumentV1 } from "@basketball/shared";
import { TEMPLATES, localizeTemplateDocument } from "./templates";
import { useT } from "../i18n";
import { api, ApiError } from "../api";
import { useModalDialog } from "../components/useModalDialog";
import { TemplateCardContent } from "./TemplateCard";

type SharedRow = {
  id: string;
  name: string;
  category?: string;
  tags?: string[];
  author: { name: string; email?: string; avatarUrl?: string | null };
};

function playIdSuffix(id: string) {
  const hex = id.replace(/-/g, "");
  return hex.length >= 8 ? hex.slice(-8) : id.slice(0, 8);
}

interface Props {
  onSelect: (doc: TacticDocumentV1) => void;
  onClose: () => void;
  confirmBeforeSelect?: boolean;
}

export function TemplateLibrary({ onSelect, onClose, confirmBeforeSelect = false }: Props) {
  const { lang, t } = useT();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const selectionRequestRef = useRef(0);
  const sharedListRequestRef = useRef<AbortController | null>(null);
  const close = useCallback(() => {
    selectionRequestRef.current += 1;
    sharedListRequestRef.current?.abort();
    onClose();
  }, [onClose]);
  const panelRef = useModalDialog(close, closeButtonRef);
  const [tab, setTab] = useState<"builtin" | "shared">("builtin");
  const [shared, setShared] = useState<SharedRow[]>([]);
  const [sharedPage, setSharedPage] = useState(1);
  const [sharedTotal, setSharedTotal] = useState(0);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [picking, setPicking] = useState(false);

  const loadShared = useCallback(async (page = 1, append = false) => {
    sharedListRequestRef.current?.abort();
    const controller = new AbortController();
    sharedListRequestRef.current = controller;
    setLoadErr(null);
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await api<{ items: SharedRow[]; total: number }>(
        `/api/v1/plays/library?page=${page}&pageSize=100`,
        { signal: controller.signal },
      );
      setShared((current) => append ? [...current, ...res.items] : res.items);
      setSharedPage(page);
      setSharedTotal(res.total);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setLoadErr(e instanceof ApiError ? e.message : t("lib.loadFailed"));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (tab === "shared") void loadShared();
  }, [tab, loadShared]);

  useEffect(() => () => {
    selectionRequestRef.current += 1;
    sharedListRequestRef.current?.abort();
  }, []);

  function canReplaceCurrentPlay() {
    return !confirmBeforeSelect || window.confirm(t("tpl.confirmReplace"));
  }

  function applyDocument(doc: TacticDocumentV1, alreadyConfirmed = false) {
    if (!alreadyConfirmed && !canReplaceCurrentPlay()) return;
    onSelect(structuredClone(doc));
    close();
  }

  async function applyShared(id: string) {
    if (!canReplaceCurrentPlay()) return;
    const requestId = ++selectionRequestRef.current;
    setPicking(true);
    setLoadErr(null);
    try {
      const row = await api<{ document: unknown }>(`/api/v1/plays/library/${id}`);
      if (requestId !== selectionRequestRef.current) return;
      const p = tryParseTacticDocumentV1(row.document);
      if (!p.success) {
        setLoadErr(t("lib.invalidDoc"));
        return;
      }
      applyDocument(p.data, true);
    } catch (e) {
      if (requestId !== selectionRequestRef.current) return;
      setLoadErr(e instanceof ApiError ? e.message : t("lib.loadFailed"));
    } finally {
      if (requestId === selectionRequestRef.current) setPicking(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={close} role="presentation">
      <div
        ref={panelRef}
        className="modal-content template-picker-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <h2 id="template-picker-title">{t("tpl.title")}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="btn btn-sm modal-close-button"
            aria-label={t("tpl.close")}
            onClick={close}
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">{t("tpl.close")}</span>
          </button>
        </div>
        <div className="page-tabs template-tabs" role="tablist" aria-label={t("tpl.title")}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "builtin"}
            className={tab === "builtin" ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setTab("builtin")}
          >
            {t("tpl.tabBuiltin")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "shared"}
            className={tab === "shared" ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setTab("shared")}
          >
            {t("tpl.tabShared")}
          </button>
        </div>
        {tab === "builtin" ? (
          <>
            <p className="hint">{t("tpl.hint")}</p>
            <div className="template-grid template-grid--picker" role="tabpanel">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="template-card template-card--compact"
                >
                  <button
                    type="button"
                    className="template-card__action"
                    aria-label={t(tmpl.nameKey)}
                    onClick={() => applyDocument(localizeTemplateDocument(tmpl, lang, t))}
                  />
                  <TemplateCardContent template={tmpl} compact />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="hint">{t("tpl.hintShared")}</p>
            {loadErr ? (
              <div className="state-surface state-surface--error state-surface--compact">
                <p>{loadErr}</p>
              </div>
            ) : null}
            {loading ? (
              <div className="state-surface state-surface--loading state-surface--compact">
                <p>{t("view.loading")}</p>
              </div>
            ) : null}
            <div className="template-grid" role="tabpanel">
              {shared.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="template-card"
                  disabled={picking}
                  onClick={() => void applyShared(p.id)}
                >
                  <span className="template-card__shared-body">
                    {p.author.avatarUrl ? (
                      <img
                        src={p.author.avatarUrl}
                        alt=""
                        className="avatar-thumb"
                        width={40}
                        height={40}
                      />
                    ) : null}
                    <strong>{p.name}</strong>
                    <span className="muted">
                      {p.author.name}
                      {p.author.email && p.author.email !== p.author.name ? ` · ${p.author.email}` : null}
                      {" "}
                      · #{playIdSuffix(p.id)}
                      {p.category ? ` · ${p.category}` : null}
                      {p.tags?.length ? ` · ${p.tags.slice(0, 3).join(", ")}${p.tags.length > 3 ? "…" : ""}` : null}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {!loading && shared.length === 0 && !loadErr ? (
              <div className="state-surface state-surface--empty state-surface--compact">
                <p>{t("lib.empty")}</p>
              </div>
            ) : null}
            {!loading && shared.length < sharedTotal && !loadErr ? (
              <div className="library-load-more">
                <button
                  type="button"
                  className="btn"
                  disabled={loadingMore || picking}
                  onClick={() => void loadShared(sharedPage + 1, true)}
                >
                  {loadingMore ? t("view.loading") : t("lib.loadMore")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
