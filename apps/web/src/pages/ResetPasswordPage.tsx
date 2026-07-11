import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";

function readResetToken() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return hashParams.get("token") ?? "";
}

export function ResetPasswordPage() {
  const { logout } = useAuth();
  const { t } = useT();
  const token = useRef(readResetToken()).current;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(!token);
  const [saving, setSaving] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  useLayoutEffect(() => {
    if (!window.location.hash && !window.location.search) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (newPassword !== confirmPassword) {
      setErr(t("reset.mismatch"));
      return;
    }
    setSaving(true);
    try {
      await api<{ ok: true }>("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      logout();
      setSucceeded(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "INVALID_RESET_TOKEN"
      ) {
        setInvalid(true);
        setErr(null);
      } else if (error instanceof ApiError && error.status === 429) {
        setErr(t("reset.rateLimited"));
      } else {
        setErr(t("reset.failed"));
      }
    } finally {
      setSaving(false);
    }
  }

  if (succeeded) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card" role="status" aria-live="polite">
          <h1>{t("reset.successTitle")}</h1>
          <p className="success">{t("reset.successHint")}</p>
          <div className="form-actions">
            <Link to="/login" className="btn btn-primary">
              {t("reset.backLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <h1>{t("reset.invalidTitle")}</h1>
          <p className="error" role="alert">{t("reset.invalid")}</p>
          <div className="form-actions">
            <Link to="/forgot-password" className="btn btn-primary">
              {t("reset.requestNew")}
            </Link>
            <Link to="/login" className="btn btn-ghost">
              {t("reset.backLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>{t("reset.title")}</h1>
        <p className="hint" id="reset-password-rule">{t("reset.hint")}</p>
        {err ? <p className="error" role="alert">{err}</p> : null}
        <form onSubmit={onSubmit} aria-busy={saving}>
          <div className="field">
            <label htmlFor="reset-new-password">{t("reset.new")}</label>
            <input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              maxLength={128}
              aria-describedby="reset-password-rule"
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="reset-confirm-password">{t("reset.confirm")}</label>
            <input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              maxLength={128}
              aria-describedby="reset-password-rule"
              required
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? t("reset.saving") : t("reset.submit")}
            </button>
            <Link to="/login" className="btn btn-ghost">
              {t("reset.backLogin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
