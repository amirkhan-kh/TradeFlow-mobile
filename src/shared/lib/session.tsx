import * as SecureStore from "expo-secure-store";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, setUnauthorizedHandler } from "./api";
import type { Role } from "./roles";
import { clearToken, loadToken, saveToken } from "./token";
import { clearApiCache } from "./useApi";

export interface Me {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  region: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
}

type Status = "loading" | "signedOut" | "signedIn";
interface Ctx {
  status: Status;
  user: Me | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads `/auth/me` (after a profile edit) or stores a fresh token (after a password change). */
  refresh: (token?: string) => Promise<void>;
}

const USER_KEY = "tf_user";
const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<Me | null>(null);
  const signingOut = useRef(false);

  const keepUser = useCallback((u: Me) => {
    setUser(u);
    setStatus("signedIn");
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(u)).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    api("/auth/logout", { method: "POST" }).catch(() => {});
    await clearToken();
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    clearApiCache();
    setUser(null);
    setStatus("signedOut");
    signingOut.current = false;
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  useEffect(() => {
    (async () => {
      await loadToken();
      const saved = await SecureStore.getItemAsync(USER_KEY).catch(() => null);
      if (saved) {
        setUser(JSON.parse(saved) as Me);
        setStatus("signedIn");
      }
      try {
        keepUser((await api<{ user: Me }>("/auth/me")).user);
      } catch (e) {
        // Offline start keeps the stored profile; only an auth failure ends the session.
        if (!saved || (e instanceof ApiError && e.status === 401)) setStatus("signedOut");
      }
    })();
  }, [keepUser]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const r = await api<{ user: Me; token?: string }>("/auth/login", { method: "POST", json: { username, password } });
      clearApiCache();
      if (r.token) await saveToken(r.token);
      keepUser(r.user);
    },
    [keepUser],
  );

  const refresh = useCallback(
    async (token?: string) => {
      if (token) await saveToken(token);
      keepUser((await api<{ user: Me }>("/auth/me")).user);
    },
    [keepUser],
  );

  const value = useMemo(() => ({ status, user, signIn, signOut, refresh }), [status, user, signIn, signOut, refresh]);
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

/** Signed-in user; only call inside the authenticated route group. */
export function useMe(): Me {
  const { user } = useSession();
  return user!;
}
