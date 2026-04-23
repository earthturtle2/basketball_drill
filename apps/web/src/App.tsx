import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { getAccessToken } from "./api";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PlaysPage } from "./pages/PlaysPage";
import { PlayEditPage } from "./pages/PlayEditPage";
import { ViewPage } from "./pages/ViewPage";

function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const authed = !!getAccessToken();
  if (loc.pathname.startsWith("/view/")) {
    return <div className="app-shell">{children}</div>;
  }
  return (
    <div className="app-shell">
      <header className="top">
        <Link to={authed ? "/plays" : "/"} className="brand">
          篮球战术训练
        </Link>
        <nav className="row-actions">
          {authed ? (
            <>
              <Link to="/plays" className="btn btn-ghost">
                我的战术
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                登录
              </Link>
              <Link to="/register" className="btn btn-primary">
                注册
              </Link>
            </>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
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
        <Route path="/view/:token" element={<ViewPage />} />
        <Route path="*" element={<p className="hint">未找到页面</p>} />
      </Routes>
    </Layout>
  );
}
