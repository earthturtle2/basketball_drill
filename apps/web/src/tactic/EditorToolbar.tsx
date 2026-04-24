export type EditorTool = "select" | "addOffense" | "addDefense";

interface Props {
  tool: EditorTool;
  onToolChange: (t: EditorTool) => void;
  hasSelected: boolean;
  onRemoveSelected: () => void;
  onOpenTemplates: () => void;
}

export function EditorToolbar({
  tool,
  onToolChange,
  hasSelected,
  onRemoveSelected,
  onOpenTemplates,
}: Props) {
  return (
    <div className="editor-toolbar">
      <button
        type="button"
        className={`btn btn-sm ${tool === "select" ? "btn-active" : ""}`}
        onClick={() => onToolChange("select")}
      >
        选择
      </button>
      <button
        type="button"
        className={`btn btn-sm ${tool === "addOffense" ? "btn-active" : ""}`}
        onClick={() => onToolChange("addOffense")}
      >
        +进攻球员
      </button>
      <button
        type="button"
        className={`btn btn-sm ${tool === "addDefense" ? "btn-active" : ""}`}
        onClick={() => onToolChange("addDefense")}
      >
        +防守球员
      </button>
      <button
        type="button"
        className="btn btn-sm"
        disabled={!hasSelected}
        onClick={onRemoveSelected}
      >
        删除选中
      </button>
      <button
        type="button"
        className="btn btn-sm"
        onClick={onOpenTemplates}
      >
        模板
      </button>
    </div>
  );
}
