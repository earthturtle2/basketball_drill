import type { TacticDocumentV1 } from "@basketball/shared";
import type { CourtMode } from "./court-geometry";
import { useT } from "../i18n";

export type EditorTool = "select" | "addOffense" | "addDefense" | "pass" | "screen";

type PlayerActor = {
  id: string;
  type: "player";
  team: "offense" | "defense";
  number: number;
  label: string;
};

interface Props {
  tool: EditorTool;
  onToolChange: (t: EditorTool) => void;
  courtMode: CourtMode;
  onCourtModeChange: (m: CourtMode) => void;
  doc: TacticDocumentV1;
  selectedActor: PlayerActor | null;
  ballHolderId: string | undefined;
  passSource: string | null;
  onActorUpdate: (id: string, updates: { label?: string; number?: number }) => void;
  onToggleBall: (actorId: string) => void;
  onRemoveActor: () => void;
  onOpenTemplates: () => void;
}

export function EditorBench({
  tool,
  onToolChange,
  courtMode,
  onCourtModeChange,
  selectedActor,
  ballHolderId,
  passSource,
  onActorUpdate,
  onToggleBall,
  onRemoveActor,
  onOpenTemplates,
}: Props) {
  const { t } = useT();

  return (
    <div className="editor-bench">
      <div className="bench-section">
        <div className="bench-label">{t("bench.court")}</div>
        <div className="bench-row">
          <button
            type="button"
            className={`btn btn-sm ${courtMode === "half" ? "btn-active" : ""}`}
            onClick={() => onCourtModeChange("half")}
          >
            {t("bench.half")}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${courtMode === "full" ? "btn-active" : ""}`}
            onClick={() => onCourtModeChange("full")}
          >
            {t("bench.full")}
          </button>
        </div>
      </div>

      <div className="bench-section">
        <div className="bench-label">{t("bench.players")}</div>
        <div className="bench-row">
          <button
            type="button"
            className={`bench-token bench-token--offense ${tool === "addOffense" ? "bench-token--active" : ""}`}
            onClick={() => onToolChange(tool === "addOffense" ? "select" : "addOffense")}
            title={t("bench.addOffenseTitle")}
          >
            +
          </button>
          <span className="bench-hint">{t("bench.offense")}</span>
          <button
            type="button"
            className={`bench-token bench-token--defense ${tool === "addDefense" ? "bench-token--active" : ""}`}
            onClick={() => onToolChange(tool === "addDefense" ? "select" : "addDefense")}
            title={t("bench.addDefenseTitle")}
          >
            +
          </button>
          <span className="bench-hint">{t("bench.defense")}</span>
        </div>
      </div>

      <div className="bench-section">
        <div className="bench-label">{t("bench.tools")}</div>
        <div className="bench-row">
          <button
            type="button"
            className={`btn btn-sm ${tool === "select" ? "btn-active" : ""}`}
            onClick={() => onToolChange("select")}
          >
            {t("bench.select")}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tool === "pass" ? "btn-active" : ""}`}
            onClick={() => onToolChange("pass")}
          >
            {t("bench.pass")}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tool === "screen" ? "btn-active" : ""}`}
            onClick={() => onToolChange("screen")}
          >
            {t("bench.screen")}
          </button>
          <button type="button" className="btn btn-sm" onClick={onOpenTemplates}>
            {t("bench.template")}
          </button>
        </div>
        {tool === "addOffense" && <p className="bench-tip">{t("bench.tipAddOffense")}</p>}
        {tool === "addDefense" && <p className="bench-tip">{t("bench.tipAddDefense")}</p>}
        {tool === "pass" && !passSource && <p className="bench-tip">{t("bench.tipPassFrom")}</p>}
        {tool === "pass" && passSource && <p className="bench-tip">{t("bench.tipPassTo")}</p>}
        {tool === "screen" && <p className="bench-tip">{t("bench.tipScreen")}</p>}
      </div>

      {selectedActor && (
        <div className="bench-section">
          <div className="bench-label">{t("bench.playerProps")}</div>
          <div className="bench-field">
            <label>{t("bench.playerName")}</label>
            <input
              value={selectedActor.label}
              onChange={(e) => onActorUpdate(selectedActor.id, { label: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>
          <div className="bench-field">
            <label>{t("bench.playerNumber")}</label>
            <input
              type="number"
              min={0}
              max={99}
              value={selectedActor.number}
              onChange={(e) => onActorUpdate(selectedActor.id, { number: Number(e.target.value) || 0 })}
              style={{ width: 70 }}
            />
          </div>
          <div className="bench-row" style={{ marginTop: "0.4rem" }}>
            <button
              type="button"
              className={`btn btn-sm ${ballHolderId === selectedActor.id ? "btn-active" : ""}`}
              onClick={() => onToggleBall(selectedActor.id)}
            >
              {t("bench.holdBall")}
            </button>
            <button type="button" className="btn btn-sm" onClick={onRemoveActor}>
              {t("bench.remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
