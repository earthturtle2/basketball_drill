import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useT } from "../i18n";
import { DEFAULT_TACTIC_CATEGORY, normalizeTacticCategory, withDocumentCategory } from "../tactic/categories";
import { TEMPLATES, localizeTemplateDocument, type Template } from "../tactic/templates";
import { TemplateCardContent } from "../tactic/TemplateCard";
import { useModalDialog } from "./useModalDialog";

type TeamOption = {
  id: string;
  name: string;
  color: string;
};

interface Props {
  teams: TeamOption[];
  initialTeamId?: string;
  onClose: () => void;
}

function templateCategory(template: Template) {
  return normalizeTacticCategory(template.document.meta.category) || DEFAULT_TACTIC_CATEGORY;
}

export function CreatePlayWizard({ teams, initialTeamId = "", onClose }: Props) {
  const nav = useNavigate();
  const { lang, t } = useT();
  const firstTemplate = TEMPLATES[0];
  const [selectedId, setSelectedId] = useState(firstTemplate?.id ?? "");
  const selected = useMemo(
    () => TEMPLATES.find((template) => template.id === selectedId) ?? firstTemplate,
    [firstTemplate, selectedId],
  );
  const [name, setName] = useState(() => (firstTemplate ? t(firstTemplate.nameKey) : t("plays.defaultName")));
  const [description, setDescription] = useState(() => (firstTemplate ? t(firstTemplate.descKey) : ""));
  const [category, setCategory] = useState(() => (firstTemplate ? templateCategory(firstTemplate) : DEFAULT_TACTIC_CATEGORY));
  const [teamId, setTeamId] = useState(initialTeamId);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestClose = useCallback(() => {
    if (!creating) onClose();
  }, [creating, onClose]);
  const panelRef = useModalDialog(requestClose, closeButtonRef);

  function pickTemplate(template: Template) {
    setSelectedId(template.id);
    setName(t(template.nameKey));
    setDescription(t(template.descKey));
    setCategory(templateCategory(template));
    setErr(null);
  }

  async function create() {
    if (!selected || creating || !name.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const nextCategory = normalizeTacticCategory(category) || DEFAULT_TACTIC_CATEGORY;
      const document = localizeTemplateDocument(selected, lang, t);
      document.meta = {
        ...document.meta,
        name: name.trim(),
        description: description.trim(),
        category: nextCategory,
      };
      const res = await api<{ id: string }>("/api/v1/plays", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category: nextCategory,
          tags: document.meta.tags ?? [],
          document: withDocumentCategory(document, nextCategory),
          teamIds: teamId ? [teamId] : [],
        }),
      });
      nav(`/plays/${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("quick.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={requestClose} role="presentation">
      <div
        ref={panelRef}
        className="modal-content quick-start-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-start-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quick-start-modal__header">
          <div>
            <p className="home-kicker">{t("quick.kicker")}</p>
            <h2 id="quick-start-title">{t("quick.title")}</h2>
            <p className="hint">{t("quick.hint")}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="btn btn-sm modal-close-button"
            aria-label={t("tpl.close")}
            onClick={requestClose}
            disabled={creating}
          >
            <span aria-hidden="true">×</span>
            <span className="sr-only">{t("tpl.close")}</span>
          </button>
        </div>

        {err ? <p className="error">{err}</p> : null}

        <div className="quick-start-layout">
          <section className="quick-start-template-list" aria-label={t("quick.chooseTemplate")}>
            <p className="quick-start-step">{t("quick.stepTemplate")}</p>
            <label className="quick-start-mobile-picker" htmlFor="quick-template-select">
              <span>{t("quick.chooseTemplate")}</span>
              <select
                id="quick-template-select"
                value={selected?.id ?? ""}
                onChange={(event) => {
                  const template = TEMPLATES.find((item) => item.id === event.target.value);
                  if (template) pickTemplate(template);
                }}
                disabled={creating}
              >
                {TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {t(template.nameKey)}
                  </option>
                ))}
              </select>
            </label>
            <div className="template-grid template-grid--picker">
              {TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`template-card quick-start-template-card${template.id === selected?.id ? " quick-start-template-card--active" : ""}`}
                >
                  <button
                    type="button"
                    className="template-card__action"
                    aria-label={t(template.nameKey)}
                    aria-pressed={template.id === selected?.id}
                    onClick={() => pickTemplate(template)}
                    disabled={creating}
                  />
                  <TemplateCardContent template={template} compact />
                </div>
              ))}
            </div>
          </section>

          <section className="quick-start-form" aria-label={t("quick.configure")}>
            <p className="quick-start-step">{t("quick.stepConfigure")}</p>
            <div className="field">
              <label htmlFor="quick-play-name">{t("edit.name")}</label>
              <input
                id="quick-play-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={160}
                disabled={creating}
              />
            </div>
            <div className="field">
              <label htmlFor="quick-play-description">{t("edit.description")}</label>
              <textarea
                id="quick-play-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                disabled={creating}
              />
            </div>
            <div className="field">
              <label htmlFor="quick-play-team">{t("edit.assignedTeams")}</label>
              <select
                id="quick-play-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={creating}
              >
                <option value="">{t("edit.assignedAllTeamsHint")}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="quick-start-review">
              <strong>{t("quick.afterCreateTitle")}</strong>
              <p className="muted">{t("quick.afterCreateHint")}</p>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={() => void create()} disabled={creating || !name.trim()}>
                {creating ? t("quick.creating") : t("quick.create")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={creating}>
                {t("teams.cancel")}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
