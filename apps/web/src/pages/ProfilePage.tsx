import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ApiError, api } from "../api";
import { useAuth, type AuthUser } from "../auth";
import { useT } from "../i18n";
import { AvatarCropModal } from "../components/AvatarCropModal";

/** 上传原图上限（裁剪后会缩放压缩为较小 JPEG） */
const AVATAR_UPLOAD_MAX = 12 * 1024 * 1024;

export function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const { t } = useT();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cropObjectUrl, setCropObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
    setBio(user.bio ?? "");
  }, [user]);

  useEffect(() => {
    return () => {
      if (cropObjectUrl) URL.revokeObjectURL(cropObjectUrl);
    };
  }, [cropObjectUrl]);

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
    setOk(null);
    setSaving(true);
    try {
      const nextName = name.trim() || null;
      const nextAvatar = avatarUrl.trim() || null;
      const nextBio = bio.trim() || null;
      await api<AuthUser>("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: nextName,
          avatarUrl: nextAvatar,
          bio: nextBio,
        }),
      });
      await refreshUser();
      setOk(t("profile.saved"));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : t("profile.failed"));
    } finally {
      setSaving(false);
    }
  }

  function onAvatarFile(ev: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    if (!/^image\/(jpeg|png)$/i.test(f.type)) {
      setErr(t("profile.avatarTypeInvalid"));
      return;
    }
    if (f.size > AVATAR_UPLOAD_MAX) {
      setErr(t("profile.avatarFileTooBig"));
      return;
    }
    setCropObjectUrl(URL.createObjectURL(f));
  }

  function closeCropModal() {
    if (cropObjectUrl) {
      URL.revokeObjectURL(cropObjectUrl);
      setCropObjectUrl(null);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card profile-card">
      {cropObjectUrl ? (
        <AvatarCropModal
          imageSrc={cropObjectUrl}
          onCancel={closeCropModal}
          onConfirm={(jpegDataUrl) => {
            setAvatarUrl(jpegDataUrl);
            closeCropModal();
          }}
        />
      ) : null}
      <h1>{t("profile.title")}</h1>
      <p className="hint">{t("profile.hint")}</p>
      {err ? <p className="error">{err}</p> : null}
      {ok ? <p className="success">{ok}</p> : null}
      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="field">
          <label htmlFor="profile-email">{t("profile.email")}</label>
          <input id="profile-email" type="text" value={user.email} readOnly className="muted" />
        </div>
        <div className="field">
          <label htmlFor="profile-name">{t("profile.nickname")}</label>
          <input
            id="profile-name"
            type="text"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("profile.nicknamePlaceholder")}
          />
        </div>
        <div className="field">
          <label htmlFor="profile-avatar">{t("profile.avatar")}</label>
          <p className="field-help">
            {t("profile.avatarHint")}
          </p>
          <input
            id="profile-avatar"
            type="url"
            value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://"
          />
          {avatarUrl.startsWith("data:") ? (
            <p className="field-help">
              {t("profile.avatarLocalNote")}
            </p>
          ) : null}
          <div className="row-actions profile-avatar-actions">
            <label className="btn btn-ghost">
              {t("profile.avatarUpload")}
              <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={onAvatarFile} />
            </label>
            {avatarUrl ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAvatarUrl("")}
              >
                {t("profile.avatarClear")}
              </button>
            ) : null}
          </div>
          {avatarUrl ? (
            <div className="profile-avatar-frame">
              <img src={avatarUrl} alt="" className="profile-avatar-preview" />
            </div>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="profile-bio">{t("profile.bio")}</label>
          <textarea
            id="profile-bio"
            rows={4}
            maxLength={1000}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("profile.bioPlaceholder")}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
      </form>
      </div>
    </div>
  );
}
