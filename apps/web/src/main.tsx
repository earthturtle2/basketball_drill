import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth";
import { ErrorBoundary } from "./ErrorBoundary";
import { LangProvider } from "./i18n";
import { App } from "./App";
import "./styles.css";

function RootApp() {
  return (
    <AuthProvider>
      <LangProvider>
        <App />
      </LangProvider>
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  { path: "*", element: <RootApp /> },
]);

const el = document.getElementById("root");
if (!el) {
  throw new Error("root missing");
}
createRoot(el).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
