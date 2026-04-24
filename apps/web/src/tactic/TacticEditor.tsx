import { useState, useCallback, useRef } from "react";
import type { TacticDocumentV1 } from "@basketball/shared";
import { CourtSVG } from "./CourtSVG";
import { PlayerDot } from "./PlayerDot";
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

export function TacticEditor({ document: doc, onChange, onOpenTemplates, courtMode, onCourtModeChange }: Props) {
  const [activeKfIdx, setActiveKfIdx] = useState(0);
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [tool, setTool] = useState<EditorTool>("select");
  const [passSource, setPassSource] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const teamColors = {
    offense: doc.teams.offense.color ?? "#e53935",
    defense: doc.teams.defense.color ?? "#1e88e5",
  };

  const kf = doc.keyframes[activeKfIdx];
  const currentT = kf?.t ?? 0;

  // Ball holder
  const ballActor = doc.actors.find((a) => a.type === "ball");
  const ballHolderId = ballActor?.type === "ball" ? ballActor.heldBy : undefined;

  // Selected actor (player type only)
  const selectedPlayer = selectedActorId
    ? doc.actors.find((a) => a.id === selectedActorId && a.type === "player")
    : null;
  const selectedPlayerData =
    selectedPlayer?.type === "player"
      ? selectedPlayer
      : null;

  // Tool change resets pass state
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
          // Transfer ball to the receiver
          let newActors = doc.actors.map((a) => {
            if (a.type === "ball") return { ...a, heldBy: actorId };
            return a;
          });
          if (!newActors.some((a) => a.type === "ball")) {
            newActors = [...newActors, { id: "ball", type: "ball" as const, heldBy: actorId }];
          }
          onChange({ ...doc, actors: newActors, events });
          setPassSource(null);
          setTool("select");
        }
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
    // Clear ball holder if removed player was holding it
    const updatedActors = newActors.map((a) => {
      if (a.type === "ball" && a.heldBy === selectedActorId) {
        return { ...a, heldBy: undefined };
      }
      return a;
    });
    onChange({ ...doc, actors: updatedActors, keyframes: newKfs });
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
      let newActors = doc.actors.map((a) => {
        if (a.type !== "ball") return a;
        return { ...a, heldBy: a.heldBy === actorId ? undefined : actorId };
      });
      if (!newActors.some((a) => a.type === "ball")) {
        newActors = [...newActors, { id: "ball", type: "ball" as const, heldBy: actorId }];
      }
      onChange({ ...doc, actors: newActors });
    },
    [doc, onChange],
  );

  const handleAddKeyframe = useCallback(
    (t: number) => {
      if (doc.keyframes.find((k) => k.t === t)) return;
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

  const courtCursor =
    tool === "addOffense" || tool === "addDefense"
      ? "crosshair"
      : tool === "pass"
        ? "pointer"
        : undefined;

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
        onActorUpdate={handleActorUpdate}
        onToggleBall={handleToggleBall}
        onRemoveActor={handleRemoveSelected}
        onOpenTemplates={onOpenTemplates}
      />

      <div className="editor-court">
        <CourtSVG
          ref={svgRef}
          mode={courtMode}
          className={`court-svg court-svg--editor${courtCursor ? ` court-svg--${courtCursor}` : ""}`}
          onClick={handleCourtClick}
        >
          <MovementTrails document={doc} teamColors={teamColors} courtMode={courtMode} />
          <PassLines document={doc} courtMode={courtMode} />
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
              <PlayerDot
                key={a.id}
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
            );
          })}
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
          onDurationChange={handleDurationChange}
        />
      </div>
    </div>
  );
}
