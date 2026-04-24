import { useState, useCallback, useRef } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import { CourtSVG } from "./CourtSVG";
import { PlayerDot } from "./PlayerDot";
import { MovementTrails } from "./MovementTrails";
import { PassLines } from "./PassLines";
import { EditorToolbar, type EditorTool } from "./EditorToolbar";
import { KeyframeTimeline } from "./KeyframeTimeline";
import { tacticToSvg, svgToTactic } from "./court-geometry";

interface Props {
  document: TacticDocumentV1;
  onChange: (doc: TacticDocumentV1) => void;
  onOpenTemplates: () => void;
}

let _nextId = 1;
function genId() {
  return `p${Date.now().toString(36)}${_nextId++}`;
}

export function TacticEditor({ document: doc, onChange, onOpenTemplates }: Props) {
  const [activeKfIdx, setActiveKfIdx] = useState(0);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [tool, setTool] = useState<EditorTool>("select");
  const svgRef = useRef<SVGSVGElement>(null);

  const teamColors = {
    offense: doc.teams.offense.color ?? "#e53935",
    defense: doc.teams.defense.color ?? "#1e88e5",
  };

  const kf = doc.keyframes[activeKfIdx];
  const currentT = kf?.t ?? 0;

  const handleDrag = useCallback(
    (actorId: string, svgX: number, svgY: number) => {
      const [tx, ty] = svgToTactic(svgX, svgY);
      const newKfs = doc.keyframes.map((k, i) => {
        if (i !== activeKfIdx) return k;
        return { ...k, poses: { ...k.poses, [actorId]: { ...k.poses[actorId], x: tx, y: ty } } };
      });
      onChange({ ...doc, keyframes: newKfs });
    },
    [doc, activeKfIdx, onChange],
  );

  const handleCourtClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (tool === "select") return;
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgX = (e.clientX - ctm.e) / ctm.a;
      const svgY = (e.clientY - ctm.f) / ctm.d;
      const [tx, ty] = svgToTactic(svgX, svgY);

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
    [tool, doc, onChange],
  );

  const handleRemoveSelected = useCallback(() => {
    if (!selectedActorId) return;
    const newActors = doc.actors.filter((a) => a.id !== selectedActorId);
    if (newActors.length === 0) return;
    const newKfs = doc.keyframes.map((k) => {
      const { [selectedActorId]: _, ...rest } = k.poses;
      return { ...k, poses: rest };
    });
    onChange({ ...doc, actors: newActors, keyframes: newKfs });
    setSelectedActorId(null);
  }, [selectedActorId, doc, onChange]);

  const handleAddKeyframe = useCallback(
    (t: number) => {
      const existing = doc.keyframes.find((k) => k.t === t);
      if (existing) return;
      const prevKf = [...doc.keyframes].reverse().find((k) => k.t <= t);
      const newKf = { t, poses: prevKf ? { ...prevKf.poses } : {} };
      const newKfs = [...doc.keyframes, newKf].sort((a, b) => a.t - b.t);
      const newIdx = newKfs.findIndex((k) => k.t === t);
      onChange({ ...doc, keyframes: newKfs });
      setActiveKfIdx(newIdx);
    },
    [doc, onChange],
  );

  const handleRemoveKeyframe = useCallback(
    (idx: number) => {
      if (doc.keyframes.length <= 1) return;
      const newKfs = doc.keyframes.filter((_, i) => i !== idx);
      onChange({ ...doc, keyframes: newKfs });
      setActiveKfIdx(Math.min(activeKfIdx, newKfs.length - 1));
    },
    [doc, activeKfIdx, onChange],
  );

  const handleDurationChange = useCallback(
    (ms: number) => {
      onChange({ ...doc, meta: { ...doc.meta, durationMs: ms } });
    },
    [doc, onChange],
  );

  return (
    <div className="tactic-editor">
      <EditorToolbar
        tool={tool}
        onToolChange={setTool}
        hasSelected={!!selectedActorId}
        onRemoveSelected={handleRemoveSelected}
        onOpenTemplates={onOpenTemplates}
      />

      <CourtSVG ref={svgRef} className="court-svg court-svg--editor" onClick={handleCourtClick}>
        <MovementTrails document={doc} teamColors={teamColors} />
        <PassLines document={doc} />
        {doc.actors.map((a) => {
          if (a.type === "ball") {
            const holder = a.heldBy ? kf?.poses[a.heldBy] : null;
            const p = holder ?? kf?.poses[a.id] ?? { x: 0.5, y: 0.5 };
            const [sx, sy] = tacticToSvg(p.x, p.y);
            return (
              <circle
                key={a.id}
                cx={sx}
                cy={sy}
                r={2.8}
                fill="#ffab40"
                stroke="#3d2200"
                strokeWidth="0.5"
              />
            );
          }
          const p = kf?.poses[a.id];
          if (!p) return null;
          const [sx, sy] = tacticToSvg(p.x, p.y);
          const color = teamColors[a.team] ?? teamColors.offense;
          return (
            <PlayerDot
              key={a.id}
              actorId={a.id}
              cx={sx}
              cy={sy}
              color={color}
              label={a.label}
              selected={a.id === selectedActorId}
              onDrag={handleDrag}
              onSelect={setSelectedActorId}
            />
          );
        })}
      </CourtSVG>

      <KeyframeTimeline
        keyframes={doc.keyframes}
        activeIndex={activeKfIdx}
        durationMs={doc.meta.durationMs ?? 8000}
        currentT={currentT}
        onSelect={setActiveKfIdx}
        onAdd={handleAddKeyframe}
        onRemove={handleRemoveKeyframe}
        onDurationChange={handleDurationChange}
      />
    </div>
  );
}
