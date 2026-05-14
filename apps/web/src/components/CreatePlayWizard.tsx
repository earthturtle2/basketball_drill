import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useT } from "../i18n";
import { DEFAULT_TACTIC_CATEGORY, displayTacticCategory, normalizeTacticCategory, withDocumentCategory } from "../tactic/categories";
import { TEMPLATES, type Template } from "../tactic/templates";

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
  const { t } = useT();
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
      const document = structuredClone(selected.document);
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
    <div className="modal-overlay" onClick={creating ? undefined : onClose}>
      <div className="modal-content quick-start-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-start-modal__header">
          <div>
            <p className="home-kicker">{t("quick.kicker")}</p>
            <h2>{t("quick.title")}</h2>
            <p className="hint">{t("quick.hint")}</p>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose} disabled={creating}>
            {t("tpl.close")}
          </button>
        </div>

        {err ? <p className="error">{err}</p> : null}

        <div className="quick-start-layout">
          <section className="quick-start-template-list" aria-label={t("quick.chooseTemplate")}>
            <p className="quick-start-step">{t("quick.stepTemplate")}</p>
            <div className="template-grid">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`template-card quick-start-template-card${template.id === selected?.id ? " quick-start-template-card--active" : ""}`}
                  onClick={() => pickTemplate(template)}
                  disabled={creating}
                >
                  <strong>{t(template.nameKey)}</strong>
                  <span className="muted">{t(template.descKey)}</span>
                  <span className="status-pill">
                    {displayTacticCategory(templateCategory(template), t)}
                  </span>
                </button>
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
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={creating}>
                {t("teams.cancel")}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
