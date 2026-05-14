import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";

type TeamPlayer = { id: string; name: string; number: number };
type Team = { id: string; name: string; color: string; players: TeamPlayer[]; createdAt: string };

function newPlayer(number: number): TeamPlayer {
  return {
    id: `tp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${number}`,
    name: "",
    number,
  };
}

function defaultPlayers(): TeamPlayer[] {
  return [1, 2, 3, 4, 5].map(newPlayer);
}

function normalizePlayers(players: TeamPlayer[]): TeamPlayer[] {
  return players
    .map((p) => ({
      id: p.id,
      name: p.name.trim(),
      number: Math.max(0, Math.min(99, Math.round(p.number || 0))),
    }))
    .filter((p) => p.id && p.number >= 0);
}

function PlayerRosterEditor({
  players,
  onChange,
}: {
  players: TeamPlayer[];
  onChange: (players: TeamPlayer[]) => void;
}) {
  const { t } = useT();

  return (
    <div className="team-roster">
      <div className="team-roster__header">
        <label>{t("teams.players")}</label>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => onChange([...players, newPlayer((players.at(-1)?.number ?? players.length) + 1)])}
        >
          {t("teams.addPlayer")}
        </button>
      </div>
      <div className="team-roster__rows">
        {players.map((p, idx) => (
          <div key={p.id} className="team-roster__row">
            <input
              type="number"
              min={0}
              max={99}
              value={p.number}
              aria-label={t("teams.playerNumber")}
              onChange={(e) => {
                const next = [...players];
                next[idx] = { ...p, number: Number(e.target.value) || 0 };
                onChange(next);
              }}
            />
            <input
              value={p.name}
              placeholder={t("teams.playerNamePlaceholder")}
              aria-label={t("teams.playerName")}
              onChange={(e) => {
                const next = [...players];
                next[idx] = { ...p, name: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => onChange(players.filter((_, i) => i !== idx))}
            >
              {t("teams.removePlayer")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamsPage() {
  const { user, loading } = useAuth();
  const { t } = useT();
  const [teams, setTeams] = useState<Team[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2e7d32");
  const [players, setPlayers] = useState<TeamPlayer[]>(() => defaultPlayers());
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editPlayers, setEditPlayers] = useState<TeamPlayer[]>([]);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<Team[]>("/api/v1/teams");
      setTeams(res);
    } catch (e) {
      setErr(e instanceof ApiError && e.status === 401 ? t("teams.loginRequired") : t("teams.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (loading) {
    return (
      <div className="state-surface state-surface--loading">
        <p>{t("view.loading")}</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <h1>{t("teams.title")}</h1>
          <div className="state-surface state-surface--error state-surface--compact">
            <p>{t("teams.loginRequired")}</p>
          </div>
          <Link to="/login" className="btn btn-primary">
            {t("app.login")}
          </Link>
        </div>
      </div>
    );
  }

  async function create() {
    if (!name.trim()) return;
    setErr(null);
    try {
      await api("/api/v1/teams", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), color, players: normalizePlayers(players) }),
      });
      setName("");
      setColor("#2e7d32");
      setPlayers(defaultPlayers());
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("teams.createFailed"));
    }
  }

  async function update(id: string) {
    setErr(null);
    try {
      await api(`/api/v1/teams/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName, color: editColor, players: normalizePlayers(editPlayers) }),
      });
      setEditId(null);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("teams.updateFailed"));
    }
  }

  async function remove(id: string) {
    if (!confirm(t("teams.confirmDelete"))) return;
    setErr(null);
    try {
      await api(`/api/v1/teams/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("teams.deleteFailed"));
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div className="page-title-block">
          <p className="page-eyebrow">{t("app.teams")}</p>
          <h1>{t("teams.title")}</h1>
          <p className="hint">{t("teams.hint")}</p>
        </div>
        <div className="page-header__actions">
          <span className="status-pill page-count-pill">{teams.length}</span>
        </div>
      </header>
      {err ? (
        <div className="state-surface state-surface--error state-surface--compact">
          <p>{err}</p>
        </div>
      ) : null}

      <div className="card form-card">
        <div className="form-inline">
          <div className="field field--grow">
            <label>{t("teams.name")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("teams.namePlaceholder")} />
          </div>
          <div className="field field--color">
            <label>{t("teams.color")}</label>
            <input className="color-input" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void create()}>
            {t("teams.add")}
          </button>
        </div>
        <PlayerRosterEditor players={players} onChange={setPlayers} />
      </div>

      <div className="list">
        {teams.map((tm) => (
          <div key={tm.id} className="list-item">
            {editId === tm.id ? (
              <div className="team-edit-panel">
                <div className="form-inline">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="toolbar-search"
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="color-input"
                  />
                  <button type="button" className="btn btn-sm" onClick={() => void update(tm.id)}>
                    {t("teams.save")}
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditId(null)}>
                    {t("teams.cancel")}
                  </button>
                </div>
                <PlayerRosterEditor players={editPlayers} onChange={setEditPlayers} />
              </div>
            ) : (
              <>
                <div>
                  <div className="team-heading">
                    <span
                      className="team-swatch team-swatch--lg"
                      style={{ background: tm.color }}
                    />
                    <h3>{tm.name}</h3>
                  </div>
                  <p className="muted detail-meta">
                    {(tm.players?.length ? tm.players : defaultPlayers())
                      .map((p) => `${p.number}${p.name ? ` ${p.name}` : ""}`)
                      .join(" / ")}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setEditId(tm.id);
                      setEditName(tm.name);
                      setEditColor(tm.color);
                      setEditPlayers(tm.players?.length ? tm.players : defaultPlayers());
                    }}
                  >
                    {t("teams.edit")}
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => void remove(tm.id)}>
                    {t("teams.delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {teams.length === 0 && !err ? (
          <div className="state-surface state-surface--empty">
            <p>{t("teams.empty")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
