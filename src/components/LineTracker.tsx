"use client";

import { useEffect, useState } from "react";
import { Bus, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import type { LineResponse } from "@/app/api/transit/line/route";

export const DIR_COLORS = ["#ff9f1c", "#4cc9f0", "#b388ff", "#06d6a0"];

export type LineTrack = { city: "istanbul" | "izmir"; code: string };

/** Seçili hattın güzergahını ve canlı araçlarını 15 sn'de bir çeker. */
export function useLineTrack(track: LineTrack | null) {
  const [data, setData] = useState<LineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setData(null);
    setError(null);
  }, [track?.city, track?.code]);

  useEffect(() => {
    if (!track) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/transit/line?city=${track.city}&code=${encodeURIComponent(track.code)}`, { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (!j.ok) throw new Error(j.error);
        setData(j.data);
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [track?.city, track?.code, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, refresh: () => setTick((t) => t + 1) };
}

export default function LineTrackerPanel({
  track,
  state,
  onClose,
  onFly,
}: {
  track: LineTrack;
  state: ReturnType<typeof useLineTrack>;
  onClose: () => void;
  onFly: (lon: number, lat: number, zoom?: number) => void;
}) {
  const { data, error, loading } = state;
  const dirIndex = new Map(data?.directions.map((d, i) => [d.id, i]) ?? []);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className={`line-panel ${collapsed ? "collapsed" : ""}`} aria-label={`${track.code} hat takibi`}>
      <header>
        <button className="card-title" onClick={() => setCollapsed((v) => !v)} aria-expanded={!collapsed}>
          <span className="kicker">
            <Bus size={12} /> Hat takibi · {track.city === "istanbul" ? "İETT" : "ESHOT"}
            {data ? ` · ${data.vehicles.length} araç` : ""}
          </span>
          <h3>
            <b className="line-code">{track.code}</b> {data?.name ?? ""}
          </h3>
        </button>
        <div className="cam-actions">
          <button className="icon-btn" onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Genişlet" : "Küçült"} aria-label={collapsed ? "Genişlet" : "Küçült"}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button className="icon-btn" onClick={state.refresh} title="Yenile">
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
          <button className="icon-btn" onClick={onClose} title="Takibi kapat">
            <X size={16} />
          </button>
        </div>
      </header>
      {!collapsed && (
      <div className="detail-body">
        {error && <p className="error">{error}</p>}
        {!data && !error && <p className="muted">Hat verisi yükleniyor…</p>}
        {data && (
          <>
            <div className="legend">
              {data.directions.map((d, i) => (
                <span key={d.id}>
                  <i style={{ background: DIR_COLORS[i % DIR_COLORS.length] }} />
                  {d.label}
                </span>
              ))}
            </div>
            <div className="kv">
              <span>Hattaki araç</span>
              <b>{data.vehicles.length}</b>
            </div>
            <div className="kv">
              <span>Durak</span>
              <b>{data.stops.length}</b>
            </div>
            <h4>Araçlar</h4>
            {data.vehicles.length === 0 && <p className="muted small">Şu anda hatta konum bildiren araç yok.</p>}
            <ul className="mini">
              {data.vehicles.map((v) => (
                <li key={v.id}>
                  <button onClick={() => onFly(v.lon, v.lat, 15)}>
                    <i
                      className="dir-dot"
                      style={{ background: DIR_COLORS[(dirIndex.get(v.dir ?? "") ?? 0) % DIR_COLORS.length] }}
                    />
                    <b>{v.id}</b> {v.dirLabel ? <span className="muted">· {v.dirLabel}</span> : null}
                    {v.nearStop ? <span className="muted"> · yakın durak: {v.nearStop}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
            {data.notes.map((n) => (
              <p key={n} className="muted small">
                {n}
              </p>
            ))}
          </>
        )}
      </div>
      )}
    </section>
  );
}
