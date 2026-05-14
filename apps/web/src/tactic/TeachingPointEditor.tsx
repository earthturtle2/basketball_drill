import type { TacticDocumentV1 } from "@basketball/shared";
import { useT } from "../i18n";

type EventRow = NonNullable<TacticDocumentV1["events"]>[number];
type TeachingConcept = "cut" | "handoff" | "screen" | "spacing" | "pass" | "finish" | "defense";

const TEACHING_CONCEPTS: TeachingConcept[] = ["spacing", "pass", "screen", "cut", "handoff", "finish", "defense"];

function isTeachingPoint(event: EventRow) {
  return event.kind === "teaching";
}

function teachingConcept(event: EventRow | undefined) {
  const teaching = (event as { teaching?: { concept?: unknown } } | undefined)?.teaching;
  return typeof teaching?.concept === "string" ? teaching.concept : "";
}

function teachingText(event: EventRow | undefined) {
  if (!event) return "";
  const note = typeof event.note === "string" ? event.note : "";
  if (note.trim()) return note;
  const teaching = (event as { teaching?: { explanation?: unknown } }).teaching;
  return typeof teaching?.explanation === "string" ? teaching.explanation : "";
}

function compactTeachingEvent(event: EventRow): EventRow {
  const note = typeof event.note === "string" ? event.note.trim() : "";
  const teaching = (event as { teaching?: { concept?: unknown } }).teaching;
  const concept = typeof teaching?.concept === "string" ? teaching.concept : "";
  return {
    t: event.t,
    kind: "teaching",
    ...(note ? { note } : {}),
    ...(concept ? { teaching: { concept } } : {}),
  } as EventRow;
}

interface Props {
  document: TacticDocumentV1;
  currentT: number;
  onChange: (doc: TacticDocumentV1) => void;
  onJumpToTime: (tMs: number) => void;
}

export function TeachingPointEditor({ document: doc, currentT, onChange, onJumpToTime }: Props) {
  const { t } = useT();
  const events = doc.events ?? [];
  const currentIndex = events.findIndex((event) => isTeachingPoint(event) && event.t === currentT);
  const currentEvent = currentIndex >= 0 ? events[currentIndex] : undefined;
  const teachingPoints = events
    .filter(isTeachingPoint)
    .map(compactTeachingEvent)
    .filter((event) => event.note || teachingConcept(event))
    .sort((a, b) => a.t - b.t);

  function updateCurrent(nextText: string, nextConcept = teachingConcept(currentEvent)) {
    const text = nextText.slice(0, 1200);
    const concept = TEACHING_CONCEPTS.includes(nextConcept as TeachingConcept)
      ? (nextConcept as TeachingConcept)
      : undefined;
    const nextEvents = [...events];

    if (!text.trim() && !concept) {
      if (currentIndex >= 0) nextEvents.splice(currentIndex, 1);
      onChange({ ...doc, events: nextEvents });
      return;
    }

    const nextEvent = {
      ...(currentEvent ?? {}),
      t: currentT,
      kind: "teaching" as const,
      note: text.trim() || undefined,
      teaching: concept ? { concept } : undefined,
    } as EventRow;

    if (currentIndex >= 0) {
      nextEvents[currentIndex] = nextEvent;
    } else {
      nextEvents.push(nextEvent);
    }
    onChange({ ...doc, events: nextEvents });
  }

  function removeCurrent() {
    if (currentIndex < 0) return;
    onChange({ ...doc, events: events.filter((_, index) => index !== currentIndex) });
  }

  return (
    <section className="teaching-editor">
      <div className="teaching-editor__main">
        <div className="teaching-editor__heading">
          <div>
            <p className="home-kicker">{t("teach.kicker")}</p>
            <h3>{t("teach.title")}</h3>
          </div>
          <span className="status-pill">{Math.round(currentT)} ms</span>
        </div>
        <p className="muted">{t("teach.hint")}</p>
        <div className="teaching-editor__fields">
          <label className="field">
            <span>{t("teach.concept")}</span>
            <select
              value={teachingConcept(currentEvent)}
              onChange={(e) => updateCurrent(teachingText(currentEvent), e.target.value)}
            >
              <option value="">{t("teach.conceptNone")}</option>
              {TEACHING_CONCEPTS.map((concept) => (
                <option key={concept} value={concept}>
                  {t(`teach.concept.${concept}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("teach.note")}</span>
            <textarea
              rows={3}
              maxLength={1200}
              value={teachingText(currentEvent)}
              onChange={(e) => updateCurrent(e.target.value)}
              placeholder={t("teach.placeholder")}
            />
          </label>
        </div>
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={removeCurrent} disabled={currentIndex < 0}>
            {t("teach.remove")}
          </button>
        </div>
      </div>

      <div className="teaching-editor__list" aria-label={t("teach.listTitle")}>
        <div className="teaching-editor__list-heading">
          <strong>{t("teach.listTitle")}</strong>
          <span className="muted">{teachingPoints.length}</span>
        </div>
        {teachingPoints.length > 0 ? (
          teachingPoints.map((event, index) => (
            <button
              key={`${event.t}-${index}`}
              type="button"
              className={`teaching-editor__item${event.t === currentT ? " teaching-editor__item--active" : ""}`}
              onClick={() => onJumpToTime(event.t)}
            >
              <span>{Math.round(event.t)} ms</span>
              <strong>{event.note || t(`teach.concept.${teachingConcept(event)}`)}</strong>
            </button>
          ))
        ) : (
          <p className="muted">{t("teach.empty")}</p>
        )}
      </div>
    </section>
  );
}
