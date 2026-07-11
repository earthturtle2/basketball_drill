import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api } from "../api";
import { useT } from "../i18n";

type ForgotPasswordResponse = {
  ok: true;
  retryAfterSeconds: number;
  expiresInMinutes: number;
};

export function ForgotPasswordPage() {
  const { lang, t } = useT();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [expiresInMinutes, setExpiresInMinutes] = useState(30);
  const [now, setNow] = useState(Date.now());
  const retryIn = Math.max(0, Math.ceil((retryAt - now) / 1000));

  useEffect(() => {
    if (retryAt <= Date.now()) return;
    const updateNow = () => setNow(Date.now());
    const timer = window.setInterval(updateNow, 1000);
    document.addEventListener("visibilitychange", updateNow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateNow);
    };
  }, [retryAt]);

  async function sendResetLink() {
    setErr(null);
    setSending(true);
    try {
      const response = await api<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
      setExpiresInMinutes(response.expiresInMinutes);
      const nextRetryAt = Date.now() + response.retryAfterSeconds * 1000;
      setNow(Date.now());
      setRetryAt(nextRetryAt);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        setErr(t("forgot.rateLimited"));
      } else if (error instanceof ApiError && error.code === "RESET_EMAIL_UNAVAILABLE") {
        setErr(t("forgot.unavailable"));
      } else {
        setErr(t("forgot.failed"));
      }
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendResetLink();
  }

  const expiryHint = lang === "zh"
    ? `链接将在 ${expiresInMinutes} 分钟后失效。`
    : `The link expires in ${expiresInMinutes} minutes.`;

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <h1>{sent ? t("forgot.sentTitle") : t("forgot.title")}</h1>
        <p className="hint" id="forgot-hint">
          {sent ? t("forgot.sentHint") : t("forgot.hint")}
        </p>
        {err ? <p className="error" role="alert">{err}</p> : null}
        {sent ? (
          <div>
            <p className="success" role="status" aria-live="polite">
              {t("forgot.sentStatus")} {expiryHint}
            </p>
            <p className="auth-sent-email">
              <span>{t("forgot.sentTo")}</span>
              <strong>{email}</strong>
            </p>
            <div className="form-actions auth-status-actions">
              <Link to="/login" className="btn btn-primary">
                {t("forgot.backLogin")}
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={retryIn > 0 || sending}
                aria-label={t("forgot.retry")}
                onClick={() => void sendResetLink()}
              >
                <span aria-hidden="true">
                  {sending
                    ? t("forgot.sending")
                    : `${t("forgot.retry")}${retryIn > 0 ? ` · ${retryIn}s` : ""}`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} aria-busy={sending}>
            <div className="field">
              <label htmlFor="forgot-email">{t("forgot.email")}</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                aria-describedby="forgot-hint"
                autoFocus
                required
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={sending}>
                {sending ? t("forgot.sending") : t("forgot.submit")}
              </button>
              <Link to="/login" className="btn btn-ghost">
                {t("forgot.backLogin")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
