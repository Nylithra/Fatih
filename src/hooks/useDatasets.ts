"use client";

import { useEffect, useRef, useState } from "react";
import { DATASETS } from "@/catalog/meta";

export type DatasetState = {
  fc: GeoJSON.FeatureCollection | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
};

const EMPTY: DatasetState = { fc: null, loading: false, error: null, fetchedAt: null };

/**
 * Açık olan katalog veri setlerini yükler. Statik setler bir kez, canlı setler
 * `refreshMs` aralığıyla (sekme görünürken) yenilenir. Kapatılan setin verisi bellekte kalır.
 */
export function useDatasets(enabled: Record<string, boolean>) {
  const [state, setState] = useState<Record<string, DatasetState>>({});
  const inflight = useRef(new Set<string>());

  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];
    const load = async (id: string, url: string) => {
      if (inflight.current.has(id)) return;
      inflight.current.add(id);
      setState((s) => ({ ...s, [id]: { ...(s[id] ?? EMPTY), loading: true } }));
      try {
        const res = await fetch(url, { cache: url.startsWith("/api/") ? "no-store" : "default" });
        const j = await res.json();
        if (url.startsWith("/api/") && !j.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
        const fc: GeoJSON.FeatureCollection = url.startsWith("/api/") ? j.data : j;
        setState((s) => ({ ...s, [id]: { fc, loading: false, error: null, fetchedAt: Date.now() } }));
      } catch (e) {
        setState((s) => ({ ...s, [id]: { ...(s[id] ?? EMPTY), loading: false, error: e instanceof Error ? e.message : String(e) } }));
      } finally {
        inflight.current.delete(id);
      }
    };

    for (const d of DATASETS) {
      if (!enabled[d.id]) continue;
      const cur = state[d.id];
      if (!cur?.fc && !cur?.loading) load(d.id, d.url);
      if (d.refreshMs > 0) {
        timers.push(
          setInterval(() => {
            if (document.visibilityState === "visible") load(d.id, d.url);
          }, d.refreshMs),
        );
      }
    }
    return () => timers.forEach(clearInterval);
    // state bilinçli olarak bağımlılık dışında: yalnızca açık setler değişince yeniden kur
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
