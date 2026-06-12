import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const BASE_URL = "";
const TOKEN_KEY = "findash_token";

interface AuthUser {
  id: number;
  email: string;
  avatar: string | null;
  createdAt: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateToken: (newToken: string) => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

async function authPost(path: string, body: object): Promise<{ access_token: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data;
}

function decodeTokenId(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Number(payload.sub);
  } catch {
    return null;
  }
}

function loadToken(): string | null {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t || decodeTokenId(t) === null) return null;
  return t;
}

async function fetchProfile(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      email: data.email,
      avatar: data.avatar ?? null,
      createdAt: data.created_at ?? null,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(loadToken);
  const [user, setUser] = useState<AuthUser | null>(null);

  // On mount (and when token changes from localStorage), fetch the full user profile
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    fetchProfile(token).then((profile) => {
      if (profile) {
        setUser(profile);
      } else {
        // Token invalid/expired — clear it
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    });
  }, [token]);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return;
    const profile = await fetchProfile(t);
    if (profile) setUser(profile);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await authPost("/api/auth/login", { email, password });
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const { access_token } = await authPost("/api/auth/register", { email, password });
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    navigator.credentials?.preventSilentAccess?.();
  }, []);

  const updateToken = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
