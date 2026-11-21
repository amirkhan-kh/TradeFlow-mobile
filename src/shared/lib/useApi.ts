import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/**
 * Last response per path. Revisiting a screen renders instantly from it while a fresh request runs
 * (stale-while-revalidate). Cleared on sign-in, sign-out and language change.
 */
const cache = new Map<string, unknown>();
const MAX_ENTRIES = 150;

export function remember(path: string, value: unknown) {
  cache.delete(path);
  cache.set(path, value);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
}
export const cached = <T>(path: string) => cache.get(path) as T | undefined;
export const clearApiCache = () => cache.clear();

export function useApi<T>(path: string | null) {
  const [tick, setTick] = useState(0);
  const key = path ? `${path}#${tick}` : null;
  const [res, setRes] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });

  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>(path)
      .then((data) => {
        remember(path, data);
        if (alive) setRes({ key, data });
      })
      .catch((e: Error) => alive && setRes({ key, error: e.message }));
    return () => {
      alive = false;
    };
  }, [path, key]);

  const fresh = res.key === key;
  const data = (fresh ? res.data : undefined) ?? (path ? cached<T>(path) : undefined);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error: fresh ? res.error : undefined, loading: Boolean(path) && !fresh, reload };
}
