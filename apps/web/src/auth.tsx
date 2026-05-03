import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  api,
  setAccessToken,
  clearTokens,
  getAccessToken,
  onAuthFailure,
  LOGOUT_MARKER,
} from "./api";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
};

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, inviteCode: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (localStorage.getItem(LOGOUT_MARKER)) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (!getAccessToken()) {
      try {
        const refreshed = await api<{ accessToken: string }>("/api/v1/auth/refresh", {
          method: "POST",
          body: "{}",
        });
        setAccessToken(refreshed.accessToken);
      } catch {
        setUser(null);
        setLoading(false);
        return;
      }
    }
    try {
      const u = await api<AuthUser>("/api/v1/me");
      setUser(u);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  useEffect(() => onAuthFailure(() => setUser(null)), []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ accessToken: string }>(
        "/api/v1/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      setAccessToken(data.accessToken);
      localStorage.removeItem(LOGOUT_MARKER);
      await fetchUser();
    },
    [fetchUser],
  );

  const register = useCallback(
    async (email: string, password: string, inviteCode: string, name?: string) => {
      const data = await api<{ accessToken: string }>(
        "/api/v1/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ email, password, inviteCode: inviteCode.trim() || undefined, name }),
        },
      );
      setAccessToken(data.accessToken);
      localStorage.removeItem(LOGOUT_MARKER);
      await fetchUser();
    },
    [fetchUser],
  );

  const logout = useCallback(() => {
    localStorage.setItem(LOGOUT_MARKER, "1");
    clearTokens();
    setUser(null);
    void fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: "{}",
    })
      .then((res) => {
        if (res.ok) localStorage.removeItem(LOGOUT_MARKER);
      })
      .catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
