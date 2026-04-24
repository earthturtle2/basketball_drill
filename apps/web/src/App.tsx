import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useT, LangToggle } from "./i18n";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PlaysPage } from "./pages/PlaysPage";
import { PlayEditPage } from "./pages/PlayEditPage";
import { TeamsPage } from "./pages/TeamsPage";
import { ViewPage } from "./pages/ViewPage";

function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, loading, logout } = useAuth();
  const { t } = useT();

  if (loc.pathname.startsWith("/view/")) {
    return <div className="app-shell">{children}</div>;
  }

  return (
    <div className="app-shell">
      <header className="top">
        <Link to={user ? "/plays" : "/"} className="brand">
          {t("app.brand")}
        </Link>
        <nav className="row-actions">
          {loading ? null : user ? (
            <>
              <Link to="/plays" className="btn btn-ghost">
                {t("app.myPlays")}
              </Link>
              <Link to="/teams" className="btn btn-ghost">
                {t("app.teams")}
              </Link>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  logout();
                  nav("/login");
                }}
              >
                {t("app.logout")}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                {t("app.login")}
              </Link>
              <Link to="/register" className="btn btn-primary">
                {t("app.register")}
              </Link>
            </>
          )}
          <LangToggle />
        </nav>
      </header>
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
        <Route path="/plays/:id" element={<PlayEditPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/view/:token" element={<ViewPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
