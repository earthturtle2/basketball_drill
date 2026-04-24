import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { DEFAULT_TACTIC_DOCUMENT } from "@basketball/shared";

type PlayListItem = { id: string; name: string; teamId: string | null; updatedAt: string };
type Team = { id: string; name: string; color: string };

export function PlaysPage() {
  const nav = useNavigate();
  const { user } = useAuth();
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
        setErr("加载失败");
      }
    },
    [],
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
        name: "新战术",
        description: "",
        tags: [] as string[],
        document: DEFAULT_TACTIC_DOCUMENT,
        teamId: filterTeamId || undefined,
      };
      const res = await api<{ id: string }>("/api/v1/plays", {
        method: "POST",
        body: JSON.stringify(body),
      });
      nav(`/plays/${res.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "创建失败");
    }
  }

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem" }}>我的战术</h1>
      <p className="hint">打开一条战术进行可视化编辑、预览动画或生成分享链接。</p>
      {err ? <p className="error">{err}</p> : null}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
        <button type="button" className="btn btn-primary" onClick={() => void create()}>
          新建战术
        </button>
        {teams.length > 0 && (
          <select
            className="btn"
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
            style={{ minWidth: 120 }}
          >
            <option value="">全部球队</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="list">
        {items.map((p) => {
          const team = p.teamId ? teamMap.get(p.teamId) : null;
          return (
            <div key={p.id} className="list-item">
              <div>
                <h3>
                  <Link to={`/plays/${p.id}`}>{p.name}</Link>
                </h3>
                <div className="muted">
                  {team ? (
                    <span style={{ marginRight: "0.5rem" }}>
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
                  ) : null}
                  更新于 {new Date(p.updatedAt).toLocaleString()}
                </div>
              </div>
              <Link to={`/plays/${p.id}`} className="btn btn-ghost">
                打开
              </Link>
            </div>
          );
        })}
        {items.length === 0 && !err ? (
          <p className="muted">暂无战术，点「新建战术」开始。</p>
        ) : null}
      </div>
    </div>
  );
}
