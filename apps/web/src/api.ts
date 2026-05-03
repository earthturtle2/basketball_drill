const base = () => "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const ACCESS = "basketball_access";
const LEGACY_REFRESH = "basketball_refresh";
export const LOGOUT_MARKER = "basketball_logout_pending";

try {
  localStorage.removeItem(LEGACY_REFRESH);
} catch {
  /* Older builds stored refresh tokens in localStorage; clear them when possible. */
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS);
}

export function setAccessToken(access: string) {
  localStorage.setItem(ACCESS, access);
  localStorage.removeItem(LEGACY_REFRESH);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(LEGACY_REFRESH);
}

let _onAuthFailure: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

/** Register a callback for when token refresh fails. Returns a cleanup function. */
export function onAuthFailure(handler: () => void): () => void {
  _onAuthFailure = handler;
  return () => {
    _onAuthFailure = null;
  };
}

async function performRefresh() {
  if (localStorage.getItem(LOGOUT_MARKER)) return null;
  const res = await fetch(`${base()}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: "{}",
  });
  if (!res.ok) {
    clearTokens();
    _onAuthFailure?.();
    return null;
  }
  const data = (await res.json()) as {
    accessToken: string;
  };
  setAccessToken(data.accessToken);
  return data.accessToken;
}

function refreshOnce() {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function shouldTryRefresh(path: string) {
  return !path.startsWith("/api/v1/auth/") && !localStorage.getItem(LOGOUT_MARKER);
}

export async function api<T>(
  path: string,
  init?: RequestInit & { _retry?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${base()}${path}`, { ...init, headers, credentials: "same-origin" });
  if (res.status === 401 && !init?._retry && shouldTryRefresh(path)) {
    const latestToken = getAccessToken();
    if (token && latestToken && latestToken !== token) {
      return api<T>(path, { ...init, _retry: true });
    }
    const newAccess = await refreshOnce();
    if (newAccess) {
      return api<T>(path, { ...init, _retry: true });
    }
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    throw new ApiError(res.status, j.code ?? "HTTP", j.message ?? res.statusText);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
