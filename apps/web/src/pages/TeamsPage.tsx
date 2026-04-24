import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";

type Team = { id: string; name: string; color: string; createdAt: string };

export function TeamsPage() {
  const { user } = useAuth();
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
      setErr("加载失败");
    }
  }, []);

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
      setErr(e instanceof ApiError ? e.message : "创建失败");
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
      setErr(e instanceof ApiError ? e.message : "更新失败");
    }
  }

  async function remove(id: string) {
    if (!confirm("删除该球队？关联的战术不会被删除。")) return;
    setErr(null);
    try {
      await api(`/api/v1/teams/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "删除失败");
    }
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem" }}>球队管理</h1>
      <p className="hint">创建球队后可在战术列表中按球队筛选。</p>
      {err ? <p className="error">{err}</p> : null}

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}>
          <div className="field" style={{ flex: 1, minWidth: 120, margin: 0 }}>
            <label>球队名称</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入名称" />
          </div>
          <div className="field" style={{ margin: 0, width: 60 }}>
            <label>颜色</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ padding: "2px", height: 36 }} />
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void create()}>
            添加
          </button>
        </div>
      </div>

      <div className="list">
        {teams.map((t) => (
          <div key={t.id} className="list-item">
            {editId === t.id ? (
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
                <button type="button" className="btn btn-sm" onClick={() => void update(t.id)}>
                  保存
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditId(null)}>
                  取消
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
                      background: t.color,
                      flexShrink: 0,
                    }}
                  />
                  <h3>{t.name}</h3>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setEditId(t.id);
                      setEditName(t.name);
                      setEditColor(t.color);
                    }}
                  >
                    编辑
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => void remove(t.id)}>
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {teams.length === 0 && !err ? (
          <p className="muted">暂无球队。</p>
        ) : null}
      </div>
    </div>
  );
}
