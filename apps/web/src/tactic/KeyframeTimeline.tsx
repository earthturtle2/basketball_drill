import { useCallback, useRef } from "react";

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
  onMove: (idx: number, t: number) => void;
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
  onMove,
  onDurationChange,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingIdx = useRef<number | null>(null);

  const handleAdd = useCallback(() => {
    const times = keyframes.map((k) => k.t).sort((a, b) => a - b);
    const boundaries = [0, ...times, durationMs];
    let bestGap = 0;
    let bestMid = Math.round(durationMs / 2);
    for (let i = 1; i < boundaries.length; i++) {
      const gap = boundaries[i] - boundaries[i - 1];
      if (gap > bestGap) {
        bestGap = gap;
        bestMid = Math.round((boundaries[i - 1] + boundaries[i]) / 2);
      }
    }
    const ts = new Set(times);
    while (ts.has(bestMid)) bestMid += 50;
    onAdd(Math.min(bestMid, durationMs));
  }, [durationMs, keyframes, onAdd]);

  const pctFromEvent = useCallback(
    (clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    [],
  );

  const handleMarkerPointerDown = useCallback(
    (idx: number, e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      draggingIdx.current = idx;
      onSelect(idx);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onSelect],
  );

  const handleMarkerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (draggingIdx.current === null) return;
      const pct = pctFromEvent(e.clientX);
      const newT = Math.round(pct * durationMs);
      onMove(draggingIdx.current, newT);
    },
    [durationMs, onMove, pctFromEvent],
  );

  const handleMarkerPointerUp = useCallback(() => {
    draggingIdx.current = null;
  }, []);

  const pct = (t: number) => `${(t / Math.max(durationMs, 1)) * 100}%`;

  return (
    <div className="kf-timeline">
      <div className="kf-timeline__bar">
        <div className="kf-timeline__track" ref={trackRef}>
          <div className="kf-timeline__playhead" style={{ left: pct(currentT) }} />

          {keyframes.map((kf, i) => (
            <button
              key={i}
              type="button"
              className={`kf-timeline__marker ${i === activeIndex ? "kf-timeline__marker--active" : ""}`}
              style={{ left: pct(kf.t), touchAction: "none" }}
              title={`${kf.t}ms — 拖动调整时间`}
              onPointerDown={(e) => handleMarkerPointerDown(i, e)}
              onPointerMove={handleMarkerPointerMove}
              onPointerUp={handleMarkerPointerUp}
            />
          ))}
        </div>
      </div>

      <div className="kf-timeline__controls">
        <button type="button" className="btn btn-sm" onClick={handleAdd} title="添加关键帧（等分间隔）">
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
        <span className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>
          帧 {activeIndex + 1}/{keyframes.length} @ {currentT}ms
        </span>
      </div>
    </div>
  );
}
