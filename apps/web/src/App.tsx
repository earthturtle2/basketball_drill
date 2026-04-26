import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useT, LangToggle } from "./i18n";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PlaysPage } from "./pages/PlaysPage";
import { PlayEditPage } from "./pages/PlayEditPage";
import { LibraryPage } from "./pages/LibraryPage";
import { TeamsPage } from "./pages/TeamsPage";
import { ViewPage } from "./pages/ViewPage";
import { AdminPage } from "./pages/AdminPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { ProfilePage } from "./pages/ProfilePage";

function isAdmin(role: string) {
  return role === "admin" || role === "org_admin";
}

function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, loading, logout } = useAuth();
  const { t } = useT();
  const [topNavOpen, setTopNavOpen] = useState(false);

  useEffect(() => {
    setTopNavOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!topNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTopNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [topNavOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 700px)");
    const onWide = () => {
      if (mq.matches) setTopNavOpen(false);
    };
    mq.addEventListener("change", onWide);
    return () => mq.removeEventListener("change", onWide);
  }, []);

  if (loc.pathname.startsWith("/view/")) {
    return <div className="app-shell">{children}</div>;
  }

  const closeNav = () => setTopNavOpen(false);

  return (
    <div className="app-shell">
      <header className={`top${topNavOpen ? " top--nav-open" : ""}`}>
        <Link to={user ? "/plays" : "/"} className="brand">
          {t("app.brand")}
        </Link>
        <button
          type="button"
          className="top-menu-toggle"
          aria-expanded={topNavOpen}
          aria-controls="site-nav"
          aria-label={t("app.toggleNav")}
          onClick={() => setTopNavOpen((o) => !o)}
        >
          <span className="top-menu-toggle__bar" />
          <span className="top-menu-toggle__bar" />
          <span className="top-menu-toggle__bar" />
        </button>
        <nav id="site-nav" className="top-nav row-actions">
          {loading ? null : user ? (
            <>
              <Link to="/plays" className="btn btn-ghost" onClick={closeNav}>
                {t("app.myPlays")}
              </Link>
              <Link to="/library" className="btn btn-ghost" onClick={closeNav}>
                {t("app.library")}
              </Link>
              <Link to="/teams" className="btn btn-ghost" onClick={closeNav}>
                {t("app.teams")}
              </Link>
              {isAdmin(user.role) ? (
                <Link to="/admin" className="btn btn-ghost" onClick={closeNav}>
                  {t("app.admin")}
                </Link>
              ) : null}
              <Link to="/profile" className="btn btn-ghost" onClick={closeNav}>
                {t("app.profile")}
              </Link>
              <Link to="/password" className="btn btn-ghost" onClick={closeNav}>
                {t("app.password")}
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  closeNav();
                  logout();
                  nav("/login");
                }}
              >
                {t("app.logout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost" onClick={closeNav}>
                {t("app.login")}
              </Link>
              <Link to="/register" className="btn btn-primary" onClick={closeNav}>
                {t("app.register")}
              </Link>
            </>
          )}
          <LangToggle />
        </nav>
      </header>
      {topNavOpen ? (
        <div
          className="top-nav-backdrop"
          aria-hidden="true"
          onClick={() => setTopNavOpen(false)}
        />
      ) : null}
      {children}
    </div>
  );
}

function NotFound() {
  const { t } = useT();
  return <p className="hint">{t("app.notFound")}</p>;
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/plays" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/plays" element={<PlaysPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/:id" element={<LibraryPage />} />
        <Route path="/plays/:id" element={<PlayEditPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/password" element={<ChangePasswordPage />} />
        <Route path="/view/:token" element={<ViewPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
