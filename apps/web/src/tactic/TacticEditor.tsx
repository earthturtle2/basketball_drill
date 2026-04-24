import { useState, useCallback, useRef, useMemo } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import { CourtSVG } from "./CourtSVG";
import { PlayerDot } from "./PlayerDot";
import { getActiveScreenEventIndex, resolveBallHolderAt, resolveScreenOverlaysAtT } from "./viewer-math";
import { MovementTrails } from "./MovementTrails";
import { PassLines } from "./PassLines";
import { EditorBench, type EditorTool } from "./EditorBench";
import { KeyframeTimeline } from "./KeyframeTimeline";
import { tacticToSvg, svgToTactic, type CourtMode } from "./court-geometry";

interface Props {
  document: TacticDocumentV1;
  onChange: (doc: TacticDocumentV1) => void;
  onOpenTemplates: () => void;
  courtMode: CourtMode;
  onCourtModeChange: (m: CourtMode) => void;
}

let _nextId = 1;
function genId() {
  return `p${Date.now().toString(36)}${_nextId++}`;
}

/** Evenly space keyframe times from 0 to durationMs (inclusive ends when count >= 2). */
function equalKeyframeTimes(count: number, durationMs: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  return Array.from({ length: count }, (_, i) =>
    Math.round((i * durationMs) / (count - 1)),
  );
}

/**
 * Remap event timestamps when keyframe times change so events stay aligned
 * with the keyframes they were originally placed on.
 *
 * @param events      Current event array
 * @param pairs       Array of [oldTime, newTime] for corresponding keyframes
 * @param allNewTimes All new keyframe times (used as fallback for unmatched events)
 */
function remapEventTimes(
  events: TacticDocumentV1["events"],
  pairs: [number, number][],
  allNewTimes: number[],
): TacticDocumentV1["events"] {
  if (!events?.length || allNewTimes.length === 0) return events;
  const exactMap = new Map<number, number>();
  for (const [oldT, newT] of pairs) exactMap.set(oldT, newT);
  return events.map((e) => {
    const mapped = exactMap.get(e.t);
    if (mapped !== undefined) return mapped === e.t ? e : { ...e, t: mapped };
    let best = allNewTimes[0]!;
    let bestDist = Math.abs(e.t - best);
    for (const nt of allNewTimes) {
      const d = Math.abs(e.t - nt);
      if (d < bestDist) { bestDist = d; best = nt; }
    }
    return best === e.t ? e : { ...e, t: best };
  });
}

export function TacticEditor({ document: doc, onChange, onOpenTemplates, courtMode, onCourtModeChange }: Props) {
  const [activeKfIdx, setActiveKfIdx] = useState(0);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [tool, setTool] = useState<EditorTool>("select");
  const [passSource, setPassSource] = useState<string | null>(null);
  const [draggingCp, setDraggingCp] = useState<{ actorId: string; kfIdx: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const teamColors = {
    offense: doc.teams.offense.color ?? "#e53935",
    defense: doc.teams.defense.color ?? "#1e88e5",
  };

  const kf = doc.keyframes[activeKfIdx];
  const currentT = kf?.t ?? 0;

  const ballHolderId = useMemo(() => resolveBallHolderAt(doc, currentT), [doc, currentT]);

  const selectedPlayer = selectedActorId
    ? doc.actors.find((a) => a.id === selectedActorId && a.type === "player")
    : null;
  const selectedPlayerData =
    selectedPlayer?.type === "player" ? selectedPlayer : null;

  const handleToolChange = useCallback((t: EditorTool) => {
    setTool(t);
    setPassSource(null);
  }, []);

  const handleDrag = useCallback(
    (actorId: string, svgX: number, svgY: number) => {
      const [tx, ty] = svgToTactic(svgX, svgY, courtMode);
      const newKfs = doc.keyframes.map((k, i) => {
        if (i !== activeKfIdx) return k;
        return { ...k, poses: { ...k.poses, [actorId]: { ...k.poses[actorId], x: tx, y: ty } } };
      });
      onChange({ ...doc, keyframes: newKfs });
    },
    [doc, activeKfIdx, onChange, courtMode],
  );

  const handleActorClick = useCallback(
    (actorId: string) => {
      if (tool === "pass") {
        if (!passSource) {
          setPassSource(actorId);
        } else if (passSource !== actorId) {
          const newEvent = { t: currentT, kind: "pass" as const, from: passSource, to: actorId };
          const events = [...(doc.events ?? []), newEvent];
          let newActors = doc.actors;
          if (!newActors.some((a) => a.type === "ball")) {
            newActors = [...newActors, { id: "ball", type: "ball" as const, heldBy: actorId }];
          } else {
            newActors = newActors.map((a) =>
              a.type === "ball" ? { ...a, heldBy: actorId } : a,
            );
          }
          onChange({ ...doc, actors: newActors, events });
          setPassSource(null);
          setTool("select");
        }
      } else if (tool === "screen") {
        const newEvent = { t: currentT, kind: "screen" as const, from: actorId, angle: 0 };
        const events = [...(doc.events ?? []), newEvent];
        onChange({ ...doc, events });
        setTool("select");
      } else {
        setSelectedActorId(actorId);
      }
    },
    [tool, passSource, currentT, doc, onChange],
  );

  const handleCourtClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (tool !== "addOffense" && tool !== "addDefense") return;
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgX = (e.clientX - ctm.e) / ctm.a;
      const svgY = (e.clientY - ctm.f) / ctm.d;
      const [tx, ty] = svgToTactic(svgX, svgY, courtMode);

      const team: "offense" | "defense" = tool === "addOffense" ? "offense" : "defense";
      const existing = doc.actors.filter((a) => a.type === "player" && a.team === team);
      const num = existing.length + 1;
      const id = genId();
      const newActor = {
        id,
        type: "player" as const,
        team,
        number: num,
        label: `${num}`,
      };
      const newKfs = doc.keyframes.map((k) => ({
        ...k,
        poses: { ...k.poses, [id]: { x: tx, y: ty } },
      }));
      onChange({
        ...doc,
        actors: [...doc.actors, newActor],
        keyframes: newKfs,
      });
      setSelectedActorId(id);
      setTool("select");
    },
    [tool, doc, onChange, courtMode],
  );

  const handleRemoveSelected = useCallback(() => {
    if (!selectedActorId) return;
    const newActors = doc.actors.filter((a) => a.id !== selectedActorId);
    if (newActors.length === 0) return;
    const newKfs = doc.keyframes.map((k) => {
      const { [selectedActorId]: _, ...rest } = k.poses;
      return { ...k, poses: rest };
    });
    const updatedActors = newActors.map((a) => {
      if (a.type === "ball" && a.heldBy === selectedActorId) {
        return { ...a, heldBy: undefined };
      }
      return a;
    });
    const updatedEvents = (doc.events ?? []).filter(
      (ev) => ev.from !== selectedActorId && ev.to !== selectedActorId,
    );
    onChange({ ...doc, actors: updatedActors, keyframes: newKfs, events: updatedEvents });
    setSelectedActorId(null);
  }, [selectedActorId, doc, onChange]);

  const handleActorUpdate = useCallback(
    (actorId: string, updates: { label?: string; number?: number }) => {
      const newActors = doc.actors.map((a) => {
        if (a.id !== actorId || a.type !== "player") return a;
        return { ...a, ...updates };
      });
      onChange({ ...doc, actors: newActors });
    },
    [doc, onChange],
  );

  const handleToggleBall = useCallback(
    (actorId: string) => {
      const h = resolveBallHolderAt(doc, currentT);
      const events = [...(doc.events ?? [])];
      if (h === actorId) {
        events.push({ t: currentT, kind: "possess_end" as const });
      } else {
        events.push({ t: currentT, kind: "possess" as const, to: actorId });
      }
      let newActors = doc.actors;
      if (!newActors.some((a) => a.type === "ball")) {
        newActors = [...newActors, { id: "ball", type: "ball" as const }];
      }
      onChange({ ...doc, actors: newActors, events });
    },
    [doc, onChange, currentT],
  );

  const handleAddKeyframe = useCallback(() => {
    const duration = doc.meta.durationMs ?? 8000;
    const sorted = [...doc.keyframes].sort((a, b) => a.t - b.t);
    const oldTimes = sorted.map((k) => k.t);
    const last = sorted[sorted.length - 1];
    const newKf = { t: 0, poses: last ? { ...last.poses } : {} };
    const combined = [...sorted, newKf];
    const times = equalKeyframeTimes(combined.length, duration);
    const newKfs = combined.map((k, i) => ({ ...k, t: times[i]! }));
    const pairs: [number, number][] = oldTimes.map((ot, i) => [ot, times[i]!]);
    const newEvents = remapEventTimes(doc.events, pairs, times);
    onChange({ ...doc, keyframes: newKfs, events: newEvents });
    setActiveKfIdx(newKfs.length - 1);
  }, [doc, onChange]);

  const handleRemoveKeyframe = useCallback(
    (idx: number) => {
      if (doc.keyframes.length <= 1) return;
      const duration = doc.meta.durationMs ?? 8000;
      const oldSorted = [...doc.keyframes].sort((a, b) => a.t - b.t);
      const filtered = doc.keyframes.filter((_, i) => i !== idx);
      const sorted = [...filtered].sort((a, b) => a.t - b.t);
      const times = equalKeyframeTimes(sorted.length, duration);
      const newKfs = sorted.map((k, i) => ({ ...k, t: times[i]! }));
      const pairs: [number, number][] = [];
      for (let i = 0, j = 0; i < oldSorted.length; i++) {
        if (i === idx) continue;
        pairs.push([oldSorted[i].t, times[j]!]);
        j++;
      }
      const newEvents = remapEventTimes(doc.events, pairs, times);
      onChange({ ...doc, keyframes: newKfs, events: newEvents });
      let newActive = activeKfIdx;
      if (idx < activeKfIdx) newActive = activeKfIdx - 1;
      else if (idx > activeKfIdx) newActive = activeKfIdx;
      else newActive = Math.min(activeKfIdx, newKfs.length - 1);
      setActiveKfIdx(newActive);
    },
    [doc, activeKfIdx, onChange],
  );

  const handleMoveKeyframe = useCallback(
    (idx: number, newT: number) => {
      const dur = doc.meta.durationMs ?? 8000;
      const snapped = Math.round(Math.max(0, Math.min(newT, dur)) / 50) * 50;
      if (doc.keyframes.some((k, i) => i !== idx && k.t === snapped)) return;
      const oldT = doc.keyframes[idx].t;
      const newKfs = doc.keyframes
        .map((k, i) => (i === idx ? { ...k, t: snapped } : k))
        .sort((a, b) => a.t - b.t);
      const newIdx = newKfs.findIndex((k) => k.t === snapped);
      const newEvents = remapEventTimes(
        doc.events,
        [[oldT, snapped]],
        newKfs.map((k) => k.t),
      );
      onChange({ ...doc, keyframes: newKfs, events: newEvents });
      setActiveKfIdx(newIdx);
    },
    [doc, onChange],
  );

  const handleScreenAngleChange = useCallback(
    (angle: number) => {
      if (!selectedActorId) return;
      const evs = doc.events ?? [];
      const idx = getActiveScreenEventIndex(evs, selectedActorId, currentT);
      if (idx === null) return;
      const events = evs.map((e, i) => (i === idx ? { ...e, angle } : e));
      onChange({ ...doc, events });
    },
    [selectedActorId, doc, onChange, currentT],
  );

  const handleRemoveScreen = useCallback(() => {
    if (!selectedActorId) return;
    const evs = doc.events ?? [];
    const idx = getActiveScreenEventIndex(evs, selectedActorId, currentT);
    if (idx === null) return;
    const e = evs[idx];
    if (e.kind === "screen" && e.t === currentT) {
      onChange({ ...doc, events: evs.filter((_, i) => i !== idx) });
    } else {
      onChange({
        ...doc,
        events: [...evs, { t: currentT, kind: "screen_end" as const, from: selectedActorId }],
      });
    }
  }, [selectedActorId, doc, onChange, currentT]);

  const handleDurationChange = useCallback(
    (ms: number) => {
      onChange({ ...doc, meta: { ...doc.meta, durationMs: ms } });
    },
    [doc, onChange],
  );

  // --- Control point drag ---
  const handleCpPointerDown = useCallback(
    (actorId: string, kfIdx: number, e: React.PointerEvent) => {
      e.stopPropagation();
      setDraggingCp({ actorId, kfIdx });
      (e.target as SVGElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handleCpPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingCp) return;
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgX = (e.clientX - ctm.e) / ctm.a;
      const svgY = (e.clientY - ctm.f) / ctm.d;
      const [tx, ty] = svgToTactic(svgX, svgY, courtMode);
      const { actorId, kfIdx } = draggingCp;
      const newKfs = doc.keyframes.map((k, i) => {
        if (i !== kfIdx) return k;
        const pose = k.poses[actorId];
        if (!pose) return k;
        return { ...k, poses: { ...k.poses, [actorId]: { ...pose, cpx: tx, cpy: ty } } };
      });
      onChange({ ...doc, keyframes: newKfs });
    },
    [draggingCp, doc, onChange, courtMode],
  );

  const handleCpPointerUp = useCallback(() => {
    setDraggingCp(null);
  }, []);

  const screenMap = resolveScreenOverlaysAtT(doc, currentT);

  const courtCursor =
    tool === "addOffense" || tool === "addDefense"
      ? "crosshair"
      : tool === "pass" || tool === "screen"
        ? "pointer"
        : undefined;

  // Build control point handles for selected actor
  const cpHandles: React.ReactNode[] = [];
  if (selectedActorId) {
    const maxI = Math.min(activeKfIdx, doc.keyframes.length - 1);
    for (let i = 1; i <= maxI; i++) {
      const prevPose = doc.keyframes[i - 1].poses[selectedActorId];
      const currPose = doc.keyframes[i].poses[selectedActorId];
      if (!prevPose || !currPose) continue;

      const [x0, y0] = tacticToSvg(prevPose.x, prevPose.y, courtMode);
      const [x1, y1] = tacticToSvg(currPose.x, currPose.y, courtMode);
      if (Math.abs(x1 - x0) < 0.5 && Math.abs(y1 - y0) < 0.5) continue;

      const hasCp = currPose.cpx !== undefined && currPose.cpy !== undefined;
      const cpx = hasCp ? currPose.cpx! : (prevPose.x + currPose.x) / 2;
      const cpy = hasCp ? currPose.cpy! : (prevPose.y + currPose.y) / 2;
      const [hx, hy] = tacticToSvg(cpx, cpy, courtMode);

      cpHandles.push(
        <g key={`cp-${selectedActorId}-${i}`}>
          {/* Dashed line to endpoints */}
          <line x1={x0} y1={y0} x2={hx} y2={hy} stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" strokeDasharray="1.5 1" />
          <line x1={hx} y1={hy} x2={x1} y2={y1} stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" strokeDasharray="1.5 1" />
          {/* Draggable diamond */}
          <rect
            x={hx - 2.5}
            y={hy - 2.5}
            width={5}
            height={5}
            rx={1}
            fill={hasCp ? "rgba(255,200,60,0.8)" : "rgba(255,255,255,0.3)"}
            stroke="#fff"
            strokeWidth="0.4"
            style={{ cursor: "grab" }}
            transform={`rotate(45,${hx},${hy})`}
            onPointerDown={(e) => handleCpPointerDown(selectedActorId!, i, e)}
            onPointerMove={handleCpPointerMove}
            onPointerUp={handleCpPointerUp}
          />
        </g>,
      );
    }
  }

  return (
    <div className="tactic-editor">
      <EditorBench
        tool={tool}
        onToolChange={handleToolChange}
        courtMode={courtMode}
        onCourtModeChange={onCourtModeChange}
        doc={doc}
        selectedActor={selectedPlayerData}
        ballHolderId={ballHolderId}
        passSource={passSource}
        screenAngle={selectedActorId ? screenMap.get(selectedActorId) : undefined}
        onActorUpdate={handleActorUpdate}
        onToggleBall={handleToggleBall}
        onRemoveActor={handleRemoveSelected}
        onOpenTemplates={onOpenTemplates}
        onScreenAngleChange={handleScreenAngleChange}
        onRemoveScreen={handleRemoveScreen}
      />

      <div className="editor-court">
        <CourtSVG
          ref={svgRef}
          mode={courtMode}
          className={`court-svg court-svg--editor${courtCursor ? ` court-svg--${courtCursor}` : ""}`}
          onClick={handleCourtClick}
        >
          <MovementTrails
            document={doc}
            teamColors={teamColors}
            courtMode={courtMode}
            upToKeyframeIndex={activeKfIdx}
          />
          <PassLines document={doc} courtMode={courtMode} cumulativeUptoKeyframeIndex={activeKfIdx} />

          {/* Control point handles */}
          {cpHandles}

          {doc.actors.map((a) => {
            if (a.type === "ball") {
              if (ballHolderId) return null;
              const p = kf?.poses[a.id] ?? { x: 0.5, y: 0.5 };
              const [sx, sy] = tacticToSvg(p.x, p.y, courtMode);
              return (
                <circle
                  key={a.id}
                  cx={sx}
                  cy={sy}
                  r={2.2}
                  fill="#ffab40"
                  stroke="#3d2200"
                  strokeWidth="0.4"
                />
              );
            }
            const p = kf?.poses[a.id];
            if (!p) return null;
            const [sx, sy] = tacticToSvg(p.x, p.y, courtMode);
            const color = teamColors[a.team] ?? teamColors.offense;
            const isPassSrc = passSource === a.id;
            return (
              <g key={a.id}>
                <PlayerDot
                  actorId={a.id}
                  cx={sx}
                  cy={sy}
                  color={isPassSrc ? "#4caf50" : color}
                  label={a.label}
                  selected={a.id === selectedActorId}
                  hasBall={a.id === ballHolderId}
                  onDrag={handleDrag}
                  onSelect={handleActorClick}
                />
              </g>
            );
          })}
          {/* Screen T-markers above all players so they are never occluded */}
          <g style={{ pointerEvents: "none" }}>
            {doc.actors.map((a) => {
              if (a.type !== "player") return null;
              const p = kf?.poses[a.id];
              if (!p) return null;
              const screenAngle = screenMap.get(a.id);
              if (screenAngle === undefined) return null;
              const [sx, sy] = tacticToSvg(p.x, p.y, courtMode);
              return (
                <g key={`screen-${a.id}`} transform={`translate(${sx}, ${sy}) rotate(${screenAngle})`}>
                  <line x1={-3.5} y1={-9} x2={3.5} y2={-9} stroke="#ffeb3b" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1={0} y1={-9} x2={0} y2={-5} stroke="#ffeb3b" strokeWidth="1.2" strokeLinecap="round" />
                </g>
              );
            })}
          </g>
        </CourtSVG>
      </div>

      <div className="editor-timeline">
        <KeyframeTimeline
          keyframes={doc.keyframes}
          activeIndex={activeKfIdx}
          durationMs={doc.meta.durationMs ?? 8000}
          currentT={currentT}
          onSelect={setActiveKfIdx}
          onAdd={handleAddKeyframe}
          onRemove={handleRemoveKeyframe}
          onMove={handleMoveKeyframe}
          onDurationChange={handleDurationChange}
        />
      </div>
    </div>
  );
}
