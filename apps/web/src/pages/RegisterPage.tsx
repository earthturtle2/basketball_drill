import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ApiError } from "../api";

export function RegisterPage() {
  const nav = useNavigate();
  const { user, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (user) return <Navigate to="/plays" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await register(email, password);
      nav("/plays", { replace: true });
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "注册失败");
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 0.5rem" }}>注册教练账号</h1>
      <p className="hint">密码至少 8 位。注册后可创建战术、生成分享链接给学员观看。</p>
      {err ? <p className="error">{err}</p> : null}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="e">邮箱</label>
          <input
            id="e"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="p">密码</label>
          <input
            id="p"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            注册并登录
          </button>
          <Link to="/login" className="btn btn-ghost">
            已有账号
          </Link>
        </div>
      </form>
    </div>
  );
}
