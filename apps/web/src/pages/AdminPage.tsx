import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError, api } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

type AdminStatus = {
  users: number;
  admins: number;
  teams: number;
  activePlays: number;
  deletedPlays: number;
  shares: number;
  activeSessions: number;
  inviteCodes: number;
  usedInviteCodes: number;
  recentUsers: AdminUser[];
};

type InviteCode = {
  id: string;
  code: string;
  createdBy: string;
  usedBy: string | null;
  expiresAt: string | null;
  createdAt: string;
  usedAt: string | null;
};

function isAdmin(role: string) {
  return role === "admin" || role === "org_admin";
}

function formatTime(v: string | null) {
  return v ? new Date(v).toLocaleString() : "-";
}

export function AdminPage() {
  const { user, loading } = useAuth();
  const { t } = useT();
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [newCode, setNewCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const [nextStatus, nextCodes, nextUsers] = await Promise.all([
        api<AdminStatus>("/api/v1/admin/status"),
        api<InviteCode[]>("/api/v1/admin/invite-codes"),
        api<AdminUser[]>("/api/v1/admin/users"),
      ]);
      setStatus(nextStatus);
      setCodes(nextCodes);
      setUsers(nextUsers);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("admin.loadFailed"));
    }
  }

  useEffect(() => {
    if (user && isAdmin(user.role)) void load();
  }, [user]);

  if (loading) return <p className="hint">{t("view.loading")}</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user.role)) return <p className="error">{t("admin.forbidden")}</p>;

  async function createInvite() {
    setCreating(true);
    setErr(null);
    setOk(null);
    try {
      const code = await api<InviteCode>("/api/v1/admin/invite-codes", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNewCode(code.code);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("admin.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function resetPassword(target: AdminUser) {
    const password = passwords[target.id]?.trim() ?? "";
    if (password.length < 8) {
      setErr(t("admin.passwordTooShort"));
      setOk(null);
      return;
    }
    setResettingUserId(target.id);
    setErr(null);
    setOk(null);
    try {
      await api<{ ok: true }>(`/api/v1/admin/users/${target.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      });
      setPasswords((prev) => ({ ...prev, [target.id]: "" }));
      setOk(`${target.email} ${t("admin.passwordResetDone")}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t("admin.passwordResetFailed"));
    } finally {
      setResettingUserId(null);
    }
  }

  const stats = status
    ? [
        [t("admin.users"), status.users],
        [t("admin.admins"), status.admins],
        [t("admin.teams"), status.teams],
        [t("admin.activePlays"), status.activePlays],
        [t("admin.deletedPlays"), status.deletedPlays],
        [t("admin.shares"), status.shares],
        [t("admin.sessions"), status.activeSessions],
        [t("admin.invites"), `${status.usedInviteCodes}/${status.inviteCodes}`],
      ]
    : [];

  return (
    <div>
      <h1>{t("admin.title")}</h1>
      <p className="hint">{t("admin.hint")}</p>
      {err ? <p className="error">{err}</p> : null}
      {ok ? <p className="success">{ok}</p> : null}

      <section className="card" style={{ marginBottom: "1rem" }}>
        <div className="row-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>{t("admin.inviteTitle")}</h2>
            <p className="hint" style={{ margin: "0.25rem 0 0" }}>
              {t("admin.inviteHint")}
            </p>
          </div>
          <button className="btn btn-primary" type="button" onClick={createInvite} disabled={creating}>
            {creating ? t("admin.creating") : t("admin.createInvite")}
          </button>
        </div>
        {newCode ? (
          <div className="invite-code">
            <code>{newCode}</code>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => void navigator.clipboard.writeText(newCode)}
            >
              {t("admin.copy")}
            </button>
          </div>
        ) : null}
      </section>

      <section className="stats-grid" style={{ marginBottom: "1rem" }}>
        {stats.map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("admin.inviteList")}</h2>
        <div className="list">
          {codes.length === 0 ? <p className="hint">{t("admin.noInvites")}</p> : null}
          {codes.map((code) => (
            <div className="list-item" key={code.id}>
              <div>
                <h3>{code.code}</h3>
                <p className="muted">
                  {t("admin.createdAt")}: {formatTime(code.createdAt)}
                </p>
              </div>
              <span className={code.usedAt ? "status-pill status-pill--used" : "status-pill"}>
                {code.usedAt ? `${t("admin.usedAt")} ${formatTime(code.usedAt)}` : t("admin.unused")}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>{t("admin.userList")}</h2>
        <div className="list">
          {users.map((u) => (
            <div className="list-item" key={u.id}>
              <div>
                <h3>{u.name || u.email}</h3>
                <p className="muted">{u.email}</p>
              </div>
              <div className="admin-user-actions">
                <span className="status-pill">
                  {u.role} · {formatTime(u.createdAt)}
                </span>
                <input
                  type="password"
                  minLength={8}
                  placeholder={t("admin.newPassword")}
                  value={passwords[u.id] ?? ""}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, [u.id]: e.target.value }))}
                />
                <button
                  className="btn btn-sm btn-ghost"
                  type="button"
                  disabled={resettingUserId === u.id}
                  onClick={() => void resetPassword(u)}
                >
                  {resettingUserId === u.id ? t("admin.resetting") : t("admin.resetPassword")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
