import type { TacticDocumentV1 } from "@basketball/shared";
import { TEMPLATES } from "./templates";

interface Props {
  onSelect: (doc: TacticDocumentV1) => void;
  onClose: () => void;
}

export function TemplateLibrary({ onSelect, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>选择模板</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            关闭
          </button>
        </div>
        <p className="hint">选择一个模板将替换当前战术内容</p>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="template-card"
              onClick={() => onSelect(structuredClone(t.document))}
            >
              <strong>{t.name}</strong>
              <span className="muted">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
