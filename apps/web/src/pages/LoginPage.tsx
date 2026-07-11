import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ApiError } from "../api";
import { useT } from "../i18n";

export function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t("login.failed"));
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>{t("login.title")}</h1>
        <p className="hint">{t("login.hint")}</p>
        {(location.state as { passwordChanged?: boolean } | null)?.passwordChanged ? (
          <p className="success" role="status">{t("password.changedLogin")}</p>
        ) : null}
        {err ? <p className="error">{err}</p> : null}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="e">{t("login.email")}</label>
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
            <label htmlFor="p">{t("login.password")}</label>
            <input
              id="p"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="auth-link-row">
              <Link to="/forgot-password">{t("login.forgotPassword")}</Link>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              {t("login.submit")}
            </button>
            <Link to="/register" className="btn btn-ghost">
              {t("login.goRegister")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
