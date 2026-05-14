import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ApiError } from "../api";
import { useT } from "../i18n";

export function RegisterPage() {
  const nav = useNavigate();
  const { user, register } = useAuth();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await register(email, password, inviteCode);
      nav("/", { replace: true });
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t("register.failed"));
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>{t("register.title")}</h1>
        <p className="hint">{t("register.hint")}</p>
        {err ? <p className="error">{err}</p> : null}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="e">{t("register.email")}</label>
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
            <label htmlFor="p">{t("register.password")}</label>
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
          <div className="field">
            <label htmlFor="invite">{t("register.inviteCode")}</label>
            <input
              id="invite"
              type="text"
              autoComplete="off"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t("register.inviteCodePlaceholder")}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              {t("register.submit")}
            </button>
            <Link to="/login" className="btn btn-ghost">
              {t("register.goLogin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
