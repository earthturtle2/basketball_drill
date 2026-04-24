import { useCallback } from "react";

interface Keyframe {
  t: number;
  poses: Record<string, { x: number; y: number }>;
}

interface Props {
  keyframes: Keyframe[];
  activeIndex: number;
  durationMs: number;
  currentT: number;
  onSelect: (idx: number) => void;
  onAdd: (t: number) => void;
  onRemove: (idx: number) => void;
  onDurationChange: (ms: number) => void;
}

export function KeyframeTimeline({
  keyframes,
  activeIndex,
  durationMs,
  currentT,
  onSelect,
  onAdd,
  onRemove,
  onDurationChange,
}: Props) {
  const handleAdd = useCallback(() => {
    let newT = Math.round(durationMs / 2);
    const ts = new Set(keyframes.map((k) => k.t));
    while (ts.has(newT)) newT += 100;
    onAdd(Math.min(newT, durationMs));
  }, [durationMs, keyframes, onAdd]);

  const pct = (t: number) => `${(t / Math.max(durationMs, 1)) * 100}%`;

  return (
    <div className="kf-timeline">
      <div className="kf-timeline__bar">
        <div className="kf-timeline__track">
          {/* playhead */}
          <div className="kf-timeline__playhead" style={{ left: pct(currentT) }} />

          {keyframes.map((kf, i) => (
            <button
              key={i}
              type="button"
              className={`kf-timeline__marker ${i === activeIndex ? "kf-timeline__marker--active" : ""}`}
              style={{ left: pct(kf.t) }}
              onClick={() => onSelect(i)}
              title={`${kf.t}ms`}
            />
          ))}
        </div>
      </div>

      <div className="kf-timeline__controls">
        <button type="button" className="btn btn-sm" onClick={handleAdd} title="添加关键帧">
          + 帧
        </button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={keyframes.length <= 1}
          onClick={() => onRemove(activeIndex)}
          title="删除当前关键帧"
        >
          - 帧
        </button>
        <label className="kf-timeline__duration">
          时长
          <input
            type="number"
            min={1000}
            max={60000}
            step={500}
            value={durationMs}
            onChange={(e) => onDurationChange(Number(e.target.value) || 8000)}
          />
          ms
        </label>
        <span className="muted">
          帧 {activeIndex + 1}/{keyframes.length} @ {currentT}ms
        </span>
      </div>
    </div>
  );
}
