import { useMemo } from "react";
import { useT } from "../i18n";
import { courtModeFromDocument } from "./court-geometry";
import { PlayPreview } from "./PlayPreview";
import {
  localizeTemplateDocument,
  localizedText,
  type Template,
} from "./templates";

type Props = {
  template: Template;
  compact?: boolean;
};

export function TemplateCardContent({ template, compact = false }: Props) {
  const { lang, t } = useT();
  const document = useMemo(
    () => localizeTemplateDocument(template, lang, t),
    [lang, t, template],
  );
  const durationSeconds = Math.round((document.meta.durationMs ?? 0) / 100) / 10;
  const coaching = template.coaching;

  return (
    <>
      <div className="template-card__visual" aria-hidden="true">
        <PlayPreview
          document={document}
          tMs={coaching.previewAtMs}
          courtMode={courtModeFromDocument(document)}
        />
        <span className="template-card__duration">
          {durationSeconds} {t("tpl.seconds")}
        </span>
      </div>
      <div className="template-card__body">
        <div className="template-card__badges">
          <span className="status-pill">{localizedText(coaching.phase, lang)}</span>
          <span>{coaching.format}</span>
          <span>{t(`tpl.level.${coaching.level}`)}</span>
        </div>
        <strong className="template-card__title">{t(template.nameKey)}</strong>
        <p className="template-card__description">{t(template.descKey)}</p>
        <dl className="template-card__facts">
          <div>
            <dt>{t("tpl.coverage")}</dt>
            <dd>{localizedText(coaching.coverage, lang)}</dd>
          </div>
          <div>
            <dt>{t("tpl.steps")}</dt>
            <dd>{document.keyframes.length}</dd>
          </div>
        </dl>
        {!compact ? (
          <div className="template-card__reads">
            <span>{t("tpl.reads")}</span>
            <ol>
              {coaching.reads.slice(0, 2).map((read) => (
                <li key={read.en}>{localizedText(read, lang)}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </>
  );
}
