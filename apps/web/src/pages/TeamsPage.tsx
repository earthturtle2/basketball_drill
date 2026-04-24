import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";

type Team = { id: string; name: string; color: string; createdAt: string };

export function TeamsPage() {
  const { user } = useAuth();
  const { t } = useT();
  const [teams, setTeams] = useState<Team[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2e7d32");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<Team[]>("/api/v1/teams");
      setTeams(res);
    } catch {
      setErr(t("teams.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!user) return <Navigate to="/login" replace />;

  async function create() {
    if (!name.trim()) return;
    setErr(null);
    try {
      await api("/api/v1/teams", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), color }),
      });
      setName("");
      setColor("#2e7d32");
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
        body: JSON.stringify({ name: editName, color: editColor }),
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
    <div>
      <h1 style={{ margin: "0 0 0.5rem" }}>{t("teams.title")}</h1>
      <p className="hint">{t("teams.hint")}</p>
      {err ? <p className="error">{err}</p> : null}

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}>
          <div className="field" style={{ flex: 1, minWidth: 120, margin: 0 }}>
            <label>{t("teams.name")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("teams.namePlaceholder")} />
          </div>
          <div className="field" style={{ margin: 0, width: 60 }}>
            <label>{t("teams.color")}</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ padding: "2px", height: 36 }} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void create()}>
            {t("teams.add")}
          </button>
        </div>
      </div>

      <div className="list">
        {teams.map((tm) => (
          <div key={tm.id} className="list-item">
            {editId === tm.id ? (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", flex: 1 }}>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ flex: 1, minWidth: 100 }}
                />
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  style={{ width: 40, padding: "2px", height: 32 }}
                />
                <button type="button" className="btn btn-sm" onClick={() => void update(tm.id)}>
                  {t("teams.save")}
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditId(null)}>
                  {t("teams.cancel")}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: tm.color,
                      flexShrink: 0,
                    }}
                  />
                  <h3>{tm.name}</h3>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setEditId(tm.id);
                      setEditName(tm.name);
                      setEditColor(tm.color);
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
          <p className="muted">{t("teams.empty")}</p>
        ) : null}
      </div>
    </div>
  );
}
