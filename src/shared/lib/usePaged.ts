import { useCallback, useEffect, useState } from "react";
import { api, qs, type Page } from "./api";
import { cached, remember } from "./useApi";

const LIMIT = 20;

/** Infinite list: debounced search, status filter, extra filters; `first` keeps page-1 extras (summary, counts). */
export function usePaged<T, Extra = object>(base: string, initialStatus = "", extra: Record<string, string | undefined> = {}) {
  type P = Page<T> & Extra;
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const query = `${base}${qs({ q: debounced, status, limit: LIMIT, ...extra })}`;
  const pageUrl = (n: number) => `${query}${query.includes("?") ? "&" : "?"}page=${n}`;
  const firstPath = pageUrl(1);
  const key = `${firstPath}#${tick}`;
  const [st, setSt] = useState<{ key: string; pages: P[]; error?: string }>({ key: "", pages: [] });

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let alive = true;
    api<P>(firstPath)
      .then((p) => {
        remember(firstPath, p);
        if (alive) setSt({ key, pages: [p] });
      })
      .catch((e: Error) => alive && setSt({ key, pages: [], error: e.message }))
      .finally(() => alive && setRefreshing(false));
    return () => {
      alive = false;
    };
  }, [firstPath, key]);

  const fresh = st.key === key;
  const hit = cached<P>(firstPath);
  const pages = fresh && st.pages.length ? st.pages : hit ? [hit] : [];
  const items = pages.flatMap((p) => p.items);
  const total = pages[0]?.total ?? 0;
  const hasMore = fresh && items.length < total;

  const loaded = pages.length;
  const nextUrl = hasMore ? pageUrl(loaded + 1) : null;
  const loadMore = useCallback(() => {
    if (!nextUrl || loadingMore) return;
    setLoadingMore(true);
    api<P>(nextUrl)
      .then((p) => setSt((s) => (s.key === key && s.pages.length === loaded ? { ...s, pages: [...s.pages, p] } : s)))
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [nextUrl, loadingMore, loaded, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const refresh = useCallback(() => {
    setRefreshing(true);
    setTick((t) => t + 1);
  }, []);

  return {
    items,
    total,
    first: pages[0] as P | undefined,
    loading: !fresh && pages.length === 0,
    loadingMore,
    refreshing,
    error: fresh ? st.error : undefined,
    q,
    setQ,
    status,
    setStatus,
    loadMore,
    reload,
    refresh,
  };
}

export type Paged<T, Extra = object> = ReturnType<typeof usePaged<T, Extra>>;
