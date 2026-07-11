import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { DEFAULT_TACTIC_DOCUMENT } from "@basketball/shared";
import { CreatePlayWizard } from "../components/CreatePlayWizard";
import {
  DEFAULT_TACTIC_CATEGORY,
  TACTIC_CATEGORY_VALUES,
  displayTacticCategory,
  uniqueTacticCategoryOptions,
  withDocumentCategory,
} from "../tactic/categories";

type PlayListItem = { id: string; name: string; category?: string; teamId: string | null; teamIds: string[]; updatedAt: string };
type TeamPlayer = { id: string; name: string; number: number };
type Team = { id: string; name: string; color: string; players: TeamPlayer[] };

export function PlaysPage() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useT();
  const [items, setItems] = useState<PlayListItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tacticCategories, setTacticCategories] = useState<string[]>([]);
  const [filterTeamId, setFilterTeamId] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const categoryOptions = useMemo(
    () => uniqueTacticCategoryOptions([...TACTIC_CATEGORY_VALUES, ...tacticCategories, ...items.map((item) => item.category)]),
    [tacticCategories, items],
  );

  const loadTeams = useCallback(async () => {
    try {
      const res = await api<Team[]>("/api/v1/teams");
      setTeams(res);
    } catch {
      /* ignore */
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api<{ items: string[] }>("/api/v1/tactic-categories");
      setTacticCategories(res.items);
    } catch {
      /* Category presets still keep the page usable. */
    }
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (filterTeamId) params.set("teamId", filterTeamId);
      if (filterCategory) params.set("category", filterCategory);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await api<{ items: PlayListItem[] }>(`/api/v1/plays${qs}`);
      setItems(res.items);
    } catch {
      setErr(t("plays.loadFailed"));
    }
  }, [filterCategory, filterTeamId, t]);

  useEffect(() => {
    if (user) {
      void loadTeams();
      void loadCategories();
    }
  }, [user, loadCategories, loadTeams]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    if (searchParams.get("quickStart") === "1") setShowQuickStart(true);
  }, [searchParams]);

  if (!user) return <Navigate to="/login" replace />;

  function closeQuickStart() {
    setShowQuickStart(false);
    if (searchParams.has("quickStart")) {
      const next = new URLSearchParams(searchParams);
      next.delete("quickStart");
      setSearchParams(next, { replace: true });
    }
  }

  async function create() {
    setErr(null);
    const category = DEFAULT_TACTIC_CATEGORY;
    try {
      const body = {
        name: t("plays.defaultName"),
        description: "",
        category,
        tags: [] as string[],
        document: withDocumentCategory(DEFAULT_TACTIC_DOCUMENT, category),
        teamIds: [] as string[],
      };
      const res = await api<{ id: string }>("/api/v1/plays", {
        method: "POST",
        body: JSON.stringify(body),
      });
      nav(`/plays/${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("plays.createFailed"));
    }
  }

  const teamMap = new Map(teams.map((tm) => [tm.id, tm]));

  return (
    <div className="page-stack">
      <header className="page-header">
        <div className="page-title-block">
          <p className="page-eyebrow">{t("app.myPlays")}</p>
          <h1>{t("plays.title")}</h1>
          <p className="hint">{t("plays.hint")}</p>
        </div>
        <div className="page-header__actions">
          <span className="status-pill page-count-pill">{items.length}</span>
          <button type="button" className="btn btn-primary" onClick={() => setShowQuickStart(true)}>
            {t("plays.createFromTemplate")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void create()}>
            {t("plays.createBlank")}
          </button>
        </div>
      </header>
      {err ? (
        <div className="state-surface state-surface--error state-surface--compact">
          <p>{err}</p>
        </div>
      ) : null}
      <div className="page-toolbar">
        {teams.length > 0 && (
          <select
            className="btn"
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
          >
            <option value="">{t("plays.allTeams")}</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        )}
        {categoryOptions.length > 0 && (
          <select
            className="btn"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">{t("plays.allCategories")}</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {displayTacticCategory(category, t)}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="list">
        {items.map((p) => {
          const assignedTeamIds = p.teamIds?.length ? p.teamIds : p.teamId ? [p.teamId] : [];
          const assignedTeams = assignedTeamIds.map((teamId) => teamMap.get(teamId)).filter((tm): tm is Team => !!tm);
          return (
            <Link key={p.id} to={`/plays/${p.id}`} className="list-item list-item--link">
              <div>
                <h3>
                  <span className="list-item__title">{p.name}</span>
                  {p.category ? (
                    <span className="status-pill">
                      {displayTacticCategory(p.category, t)}
                    </span>
                  ) : null}
                </h3>
                <div className="muted">
                  {assignedTeams.length ? (
                    <span className="team-pill-list">
                      {assignedTeams.map((team) => (
                        <span key={team.id} className="team-pill">
                          <span
                            className="team-swatch"
                            style={{ background: team.color }}
                          />
                          {team.name}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="team-pill-list">{t("plays.availableAllTeams")}</span>
                  )}
                  {t("plays.updatedAt")} {new Date(p.updatedAt).toLocaleString()}
                </div>
              </div>
            </Link>
          );
        })}
        {items.length === 0 && !err ? (
          <div className="state-surface state-surface--empty">
            <p className="muted">{t("plays.empty")}</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowQuickStart(true)}>
              {t("plays.createFromTemplate")}
            </button>
          </div>
        ) : null}
      </div>
      {showQuickStart ? (
        <CreatePlayWizard teams={teams} initialTeamId={filterTeamId} onClose={closeQuickStart} />
      ) : null}
    </div>
  );
}
