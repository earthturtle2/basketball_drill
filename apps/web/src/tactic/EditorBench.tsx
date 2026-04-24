import type { TacticDocumentV1 } from "@basketball/shared";
import type { CourtMode } from "./court-geometry";

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
  return (
    <div className="editor-bench">
      {/* Court mode toggle */}
      <div className="bench-section">
        <div className="bench-label">球场</div>
        <div className="bench-row">
          <button
            type="button"
            className={`btn btn-sm ${courtMode === "half" ? "btn-active" : ""}`}
            onClick={() => onCourtModeChange("half")}
          >
            半场
          </button>
          <button
            type="button"
            className={`btn btn-sm ${courtMode === "full" ? "btn-active" : ""}`}
            onClick={() => onCourtModeChange("full")}
          >
            全场
          </button>
        </div>
      </div>

      {/* Player bench tokens */}
      <div className="bench-section">
        <div className="bench-label">球员</div>
        <div className="bench-row">
          <button
            type="button"
            className={`bench-token bench-token--offense ${tool === "addOffense" ? "bench-token--active" : ""}`}
            onClick={() => onToolChange(tool === "addOffense" ? "select" : "addOffense")}
            title="点击后在球场上放置进攻球员"
          >
            +
          </button>
          <span className="bench-hint">进攻</span>
          <button
            type="button"
            className={`bench-token bench-token--defense ${tool === "addDefense" ? "bench-token--active" : ""}`}
            onClick={() => onToolChange(tool === "addDefense" ? "select" : "addDefense")}
            title="点击后在球场上放置防守球员"
          >
            +
          </button>
          <span className="bench-hint">防守</span>
        </div>
      </div>

      {/* Action tools */}
      <div className="bench-section">
        <div className="bench-label">工具</div>
        <div className="bench-row">
          <button
            type="button"
            className={`btn btn-sm ${tool === "select" ? "btn-active" : ""}`}
            onClick={() => onToolChange("select")}
          >
            选择
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tool === "pass" ? "btn-active" : ""}`}
            onClick={() => onToolChange("pass")}
          >
            传球
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tool === "screen" ? "btn-active" : ""}`}
            onClick={() => onToolChange("screen")}
          >
            挡拆
          </button>
          <button type="button" className="btn btn-sm" onClick={onOpenTemplates}>
            模板
          </button>
        </div>
        {tool === "addOffense" && <p className="bench-tip">点击球场放置进攻球员</p>}
        {tool === "addDefense" && <p className="bench-tip">点击球场放置防守球员</p>}
        {tool === "pass" && !passSource && <p className="bench-tip">点击传球发起者</p>}
        {tool === "pass" && passSource && <p className="bench-tip">点击接球球员</p>}
        {tool === "screen" && <p className="bench-tip">点击设置挡拆的球员</p>}
      </div>

      {/* Selected player editor */}
      {selectedActor && (
        <div className="bench-section">
          <div className="bench-label">球员属性</div>
          <div className="bench-field">
            <label>姓名</label>
            <input
              value={selectedActor.label}
              onChange={(e) => onActorUpdate(selectedActor.id, { label: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>
          <div className="bench-field">
            <label>号码</label>
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
              🏀 持球
            </button>
            <button type="button" className="btn btn-sm" onClick={onRemoveActor}>
              移除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
