import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { DEFAULT_TACTIC_DOCUMENT } from "@basketball/shared";

type PlayListItem = { id: string; name: string; updatedAt: string };

export function PlaysPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<PlayListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<{ items: PlayListItem[] }>("/api/v1/plays");
      setItems(res.items);
    } catch {
      setErr("加载失败");
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!user) return <Navigate to="/login" replace />;

  async function create() {
    setErr(null);
    try {
      const body = {
        name: "新战术",
        description: "",
        tags: [] as string[],
        document: DEFAULT_TACTIC_DOCUMENT,
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

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem" }}>我的战术</h1>
      <p className="hint">
        打开一条战术可编辑说明与 JSON 战术稿，并在下方用简易半场预览动效。后续可接战术板编辑器。
      </p>
      {err ? <p className="error">{err}</p> : null}
      <p style={{ margin: "0 0 1rem" }}>
        <button type="button" className="btn btn-primary" onClick={() => void create()}>
          新建战术
        </button>
      </p>
      <div className="list">
        {items.map((p) => (
          <div key={p.id} className="list-item">
            <div>
              <h3>
                <Link to={`/plays/${p.id}`}>{p.name}</Link>
              </h3>
              <div className="muted">更新于 {new Date(p.updatedAt).toLocaleString()}</div>
            </div>
            <Link to={`/plays/${p.id}`} className="btn btn-ghost">
              打开
            </Link>
          </div>
        ))}
        {items.length === 0 && !err ? (
          <p className="muted">暂无战术，点「新建战术」开始。</p>
        ) : null}
      </div>
    </div>
  );
}
