import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ApiError } from "../api";

export function LoginPage() {
  const nav = useNavigate();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (user) return <Navigate to="/plays" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      nav("/plays", { replace: true });
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "登录失败");
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 0.5rem" }}>教练登录</h1>
      <p className="hint">使用邮箱与密码。学员无需登录，通过教练分享的链接观战。</p>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            登录
          </button>
          <Link to="/register" className="btn btn-ghost">
            去注册
          </Link>
        </div>
      </form>
    </div>
  );
}
