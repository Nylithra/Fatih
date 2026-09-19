"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FeedState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  stale: boolean;
  meta: Record<string, unknown>;
  refresh: () => void;
};

/**
 * Bir API uç noktasını belirli aralıklarla sorgular.
 * Sekme arka plandayken sorgulamayı durdurur, öne gelince hemen yeniler.
 */
export function usePoll<T>(url: string, intervalMs: number, enabled = true): FeedState<T> {
  const [state, setState] = useState<Omit<FeedState<T>, "refresh">>({
    data: null,
    loading: false,
    error: null,
    fetchedAt: null,
    stale: false,
    meta: {},
  });
  const inflight = useRef(false);

  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      const { data, fetchedAt, stale, ok: _ok, ...meta } = j;
      setState({ data, fetchedAt, stale, meta, loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    } finally {
      inflight.current = false;
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) return;
    load();
    let timer = setInterval(load, intervalMs);
    const onVis = () => {
      clearInterval(timer);
      if (document.visibilityState === "visible") {
        load();
        timer = setInterval(load, intervalMs);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load, intervalMs, enabled]);

  return { ...state, refresh: load };
}
