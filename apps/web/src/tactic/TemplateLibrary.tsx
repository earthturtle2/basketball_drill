import { useCallback, useEffect, useState } from "react";
import { tryParseTacticDocumentV1, type TacticDocumentV1 } from "@basketball/shared";
import { TEMPLATES } from "./templates";
import { useT } from "../i18n";
import { api, ApiError } from "../api";

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
  const { t } = useT();
  const [tab, setTab] = useState<"builtin" | "shared">("builtin");
  const [shared, setShared] = useState<SharedRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [picking, setPicking] = useState(false);

  const loadShared = useCallback(async () => {
    setLoadErr(null);
    setLoading(true);
    try {
      const res = await api<{ items: SharedRow[] }>("/api/v1/plays/library?pageSize=100");
      setShared(res.items);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : t("lib.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (tab === "shared") void loadShared();
  }, [tab, loadShared]);

  function canReplaceCurrentPlay() {
    return !confirmBeforeSelect || window.confirm(t("tpl.confirmReplace"));
  }

  function applyDocument(doc: TacticDocumentV1, alreadyConfirmed = false) {
    if (!alreadyConfirmed && !canReplaceCurrentPlay()) return;
    onSelect(structuredClone(doc));
    onClose();
  }

  async function applyShared(id: string) {
    if (!canReplaceCurrentPlay()) return;
    setPicking(true);
    setLoadErr(null);
    try {
      const row = await api<{ document: unknown }>(`/api/v1/plays/library/${id}`);
      const p = tryParseTacticDocumentV1(row.document);
      if (!p.success) {
        setLoadErr(t("lib.invalidDoc"));
        return;
      }
      applyDocument(p.data, true);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : t("lib.loadFailed"));
    } finally {
      setPicking(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <h2>{t("tpl.title")}</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            {t("tpl.close")}
          </button>
        </div>
        <div className="page-tabs template-tabs">
          <button
            type="button"
            className={tab === "builtin" ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setTab("builtin")}
          >
            {t("tpl.tabBuiltin")}
          </button>
          <button
            type="button"
            className={tab === "shared" ? "btn btn-primary" : "btn btn-ghost"}
            onClick={() => setTab("shared")}
          >
            {t("tpl.tabShared")}
          </button>
        </div>
        {tab === "builtin" ? (
          <>
            <p className="hint">{t("tpl.hint")}</p>
            <div className="template-grid">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  className="template-card"
                  onClick={() => applyDocument(tmpl.document)}
                >
                  <strong>{t(tmpl.nameKey)}</strong>
                  <span className="muted">{t(tmpl.descKey)}</span>
                </button>
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
            <div className="template-grid">
              {shared.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="template-card"
                  disabled={picking}
                  onClick={() => void applyShared(p.id)}
                >
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
                </button>
              ))}
            </div>
            {!loading && shared.length === 0 && !loadErr ? (
              <div className="state-surface state-surface--empty state-surface--compact">
                <p>{t("lib.empty")}</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
