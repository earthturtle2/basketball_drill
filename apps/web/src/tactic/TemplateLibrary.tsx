import type { TacticDocumentV1 } from "@basketball/shared";
import { TEMPLATES } from "./templates";
import { useT } from "../i18n";

interface Props {
  onSelect: (doc: TacticDocumentV1) => void;
  onClose: () => void;
}

export function TemplateLibrary({ onSelect, onClose }: Props) {
  const { t } = useT();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>{t("tpl.title")}</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            {t("tpl.close")}
          </button>
        </div>
        <p className="hint">{t("tpl.hint")}</p>
        <div className="template-grid">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              className="template-card"
              onClick={() => onSelect(structuredClone(tmpl.document))}
            >
              <strong>{t(tmpl.nameKey)}</strong>
              <span className="muted">{t(tmpl.descKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
