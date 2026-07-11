import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const { t } = useT();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="state-surface state-surface--loading">
        <p>{t("view.loading")}</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (newPassword !== confirmPassword) {
      setErr(t("password.mismatch"));
      return;
    }
    setSaving(true);
    try {
      await api<{ ok: true }>("/api/v1/me/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      logout();
      navigate("/login", { replace: true, state: { passwordChanged: true } });
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t("password.failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>{t("password.title")}</h1>
        <p className="hint">{t("password.hint")}</p>
        {err ? <p className="error">{err}</p> : null}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="currentPassword">{t("password.current")}</label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="newPassword">{t("password.new")}</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">{t("password.confirm")}</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? t("password.saving") : t("password.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
