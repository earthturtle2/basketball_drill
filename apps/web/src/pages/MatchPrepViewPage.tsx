import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { TacticDocumentV1 } from "@basketball/shared";
import { useT } from "../i18n";
import { PlaybackPreviewSection } from "../tactic/PlaybackPreviewSection";

type SharedPrepEntryPlay = {
  id: string;
  name: string;
  description: string | null;
  category?: string;
  tags: string[];
  document: TacticDocumentV1;
  updatedAt: string;
};

type SharedPrepEntry = {
  id: string;
  playId: string;
  code: string;
  category: string;
  cue?: string;
  notes?: string;
  sortOrder: number;
  play: SharedPrepEntryPlay | null;
};

type SharedPrepPayload = {
  prep: {
    id: string;
    title: string;
    opponent: string | null;
    gameDate: string | null;
    notes: string | null;
    entryCount: number;
    categories: string[];
    entries: SharedPrepEntry[];
    updatedAt: string;
  };
  share: { id: string; expiresAt: string | null };
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

function sortEntries(entries: SharedPrepEntry[]) {
  return [...entries].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
}

export function MatchPrepViewPage() {
  const { token } = useParams();
  const { t } = useT();
  const stageRef = useRef<HTMLElement | null>(null);
  const [data, setData] = useState<SharedPrepPayload | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setErr(null);
    void (async () => {
      try {
        const r = await fetch(`/api/v1/match-prep-shares/${token}`);
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { message?: string };
          if (!cancelled) setErr(j.message ?? t("view.cantOpen"));
          return;
        }
        const j = (await r.json()) as SharedPrepPayload;
        if (!cancelled) {
          setData(j);
          setSelectedEntryId(sortEntries(j.prep.entries)[0]?.id ?? null);
          setCategoryFilter("");
          setSearch("");
        }
      } catch {
        if (!cancelled) setErr(t("view.networkError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const sortedEntries = useMemo(() => sortEntries(data?.prep.entries ?? []), [data]);
  const categories = useMemo(
    () => [...new Set(sortedEntries.map((entry) => entry.category).filter(Boolean))],
    [sortedEntries],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredEntries = sortedEntries.filter((entry) => {
    if (categoryFilter && entry.category !== categoryFilter) return false;
    if (!normalizedSearch) return true;
    const haystack = [
      entry.code,
      entry.category,
      entry.cue ?? "",
      entry.notes ?? "",
      entry.play?.name ?? "",
      entry.play?.description ?? "",
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(normalizedSearch);
  });
  const selectedEntry = sortedEntries.find((entry) => entry.id === selectedEntryId) ?? sortedEntries[0] ?? null;

  function selectEntry(id: string) {
    setSelectedEntryId(id);
    if (window.matchMedia("(max-width: 979px)").matches) {
      window.requestAnimationFrame(() => {
        stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  if (err) return <p className="error">{err}</p>;
  if (!data) return <p className="hint">{t("view.loading")}</p>;

  return (
    <div className="match-prep-public">
      <header className="match-prep-public-hero card">
        <div>
          <p className="match-prep-kicker">{t("matchPrep.publicKicker")}</p>
          <h1>{data.prep.title}</h1>
          <p className="hint">{t("matchPrep.publicHint")}</p>
        </div>
        <div className="match-prep-public-meta">
          {data.prep.opponent ? <span>{`${t("matchPrep.vs")} ${data.prep.opponent}`}</span> : null}
          {data.prep.gameDate ? <span>{formatDate(data.prep.gameDate)}</span> : null}
          <span>{t("matchPrep.entryCount").replace("{count}", String(data.prep.entryCount))}</span>
        </div>
        {data.prep.notes ? (
          <div className="match-prep-public-notes">
            <strong>{t("matchPrep.publicNotes")}</strong>
            <p>{data.prep.notes}</p>
          </div>
        ) : null}
      </header>

      <div className="match-prep-public-layout">
        <aside className="match-prep-public-picker card">
          <div className="match-prep-call-sheet__top">
            <p className="match-prep-kicker">{t("matchPrep.publicChoose")}</p>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("matchPrep.quickSearch")} />
          </div>
          <div className="match-prep-category-tabs">
            <button type="button" className={`btn btn-sm ${!categoryFilter ? "btn-active" : ""}`} onClick={() => setCategoryFilter("")}>
              {t("matchPrep.allCategories")}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`btn btn-sm ${categoryFilter === category ? "btn-active" : ""}`}
                onClick={() => setCategoryFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="match-prep-card-grid match-prep-card-grid--public">
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`match-prep-call-card${selectedEntry?.id === entry.id ? " match-prep-call-card--active" : ""}`}
                onClick={() => selectEntry(entry.id)}
              >
                <span className="match-prep-call-card__code">#{entry.code}</span>
                <strong>{entry.play?.name ?? t("matchPrep.unavailablePlay")}</strong>
                <small>{entry.category}</small>
                {entry.cue ? <span>{entry.cue}</span> : null}
              </button>
            ))}
            {filteredEntries.length === 0 ? <p className="muted">{t("matchPrep.noEntriesMatched")}</p> : null}
          </div>
        </aside>

        <section ref={stageRef} className="match-prep-stage match-prep-public-stage card">
          <div className="match-prep-stage__header">
            <div>
              <p className="match-prep-kicker">{t("matchPrep.publicCurrent")}</p>
              <h2>{selectedEntry ? selectedEntry.play?.name ?? t("matchPrep.unavailablePlay") : t("matchPrep.noSelected")}</h2>
              {selectedEntry ? (
                <p className="muted">
                  <span className="match-code">#{selectedEntry.code}</span>
                  <span> {selectedEntry.category}</span>
                  {selectedEntry.cue ? <span> · {selectedEntry.cue}</span> : null}
                </p>
              ) : null}
            </div>
          </div>
          {selectedEntry?.notes ? <p className="hint">{selectedEntry.notes}</p> : null}
          {selectedEntry?.play?.description ? <p className="hint">{selectedEntry.play.description}</p> : null}
          {selectedEntry?.play ? (
            <PlaybackPreviewSection
              document={selectedEntry.play.document}
              resetPlaybackKey={selectedEntry.id}
              rangeInputId={`match-prep-view-${selectedEntry.id}`}
            />
          ) : (
            <div className="match-prep-empty-stage">
              <p>{selectedEntry ? t("matchPrep.unavailablePlay") : t("matchPrep.addFirst")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
