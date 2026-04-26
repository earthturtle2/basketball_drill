import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { DEFAULT_TACTIC_DOCUMENT } from "@basketball/shared";

type PlayListItem = { id: string; name: string; teamId: string | null; teamIds: string[]; updatedAt: string };
type TeamPlayer = { id: string; name: string; number: number };
type Team = { id: string; name: string; color: string; players: TeamPlayer[] };

export function PlaysPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { t } = useT();
  const [items, setItems] = useState<PlayListItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filterTeamId, setFilterTeamId] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      const res = await api<Team[]>("/api/v1/teams");
      setTeams(res);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(
    async (teamId?: string) => {
      setErr(null);
      try {
        const qs = teamId ? `?teamId=${teamId}` : "";
        const res = await api<{ items: PlayListItem[] }>(`/api/v1/plays${qs}`);
        setItems(res.items);
      } catch {
        setErr(t("plays.loadFailed"));
      }
    },
    [t],
  );

  useEffect(() => {
    if (user) {
      void loadTeams();
      void load();
    }
  }, [user, load, loadTeams]);

  useEffect(() => {
    if (user) void load(filterTeamId || undefined);
  }, [user, filterTeamId, load]);

  if (!user) return <Navigate to="/login" replace />;

  async function create() {
    setErr(null);
    try {
      const body = {
        name: t("plays.defaultName"),
        description: "",
        tags: [] as string[],
        document: DEFAULT_TACTIC_DOCUMENT,
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
    <div>
      <h1 style={{ margin: "0 0 0.5rem" }}>{t("plays.title")}</h1>
      <p className="hint">{t("plays.hint")}</p>
      {err ? <p className="error">{err}</p> : null}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
        <button type="button" className="btn btn-primary" onClick={() => void create()}>
          {t("plays.create")}
        </button>
        {teams.length > 0 && (
          <select
            className="btn"
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
            style={{ minWidth: 120 }}
          >
            <option value="">{t("plays.allTeams")}</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
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
                </h3>
                <div className="muted">
                  {assignedTeams.length ? (
                    <span style={{ marginRight: "0.5rem" }}>
                      {assignedTeams.map((team) => (
                        <span key={team.id} style={{ marginRight: "0.45rem" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: team.color,
                              marginRight: 4,
                            }}
                          />
                          {team.name}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span style={{ marginRight: "0.5rem" }}>{t("plays.availableAllTeams")}</span>
                  )}
                  {t("plays.updatedAt")} {new Date(p.updatedAt).toLocaleString()}
                </div>
              </div>
            </Link>
          );
        })}
        {items.length === 0 && !err ? (
          <p className="muted">{t("plays.empty")}</p>
        ) : null}
      </div>
    </div>
  );
}
