"use client";

import { fmtTime } from "@/lib/format";
import type { Feeds } from "./Dashboard";

export default function StatusBar({ cursor, feeds }: { cursor: { lon: number; lat: number; zoom: number } | null; feeds: Feeds }) {
  const sources: [string, { fetchedAt: number | null; error: string | null; meta: Record<string, unknown> }][] = [
    ["Deprem", feeds.quakes],
    ["Uçuş", feeds.flights],
    ["Haber", feeds.news],
    ["Yangın", feeds.fires],
    ["Hava", feeds.weather],
  ];
  const provider = (feeds.quakes.data?.provider ?? "") as string;
  const flightProv = (feeds.flights.data?.provider ?? "") as string;
  return (
    <footer className="statusbar">
      <span className="mono">
        {cursor ? `${cursor.lat.toFixed(4)}°K ${cursor.lon.toFixed(4)}°D · z${cursor.zoom.toFixed(1)}` : "—"}
      </span>
      <span className="grow" />
      {sources.map(([name, f]) => (
        <span key={name} className={`src ${f.error ? "bad" : ""}`} title={f.error ?? ""}>
          {name} {f.fetchedAt ? fmtTime(f.fetchedAt) : "…"}
        </span>
      ))}
      <span className="muted hide-sm">
        Kaynaklar: {provider || "AFAD"} · {flightProv || "ADS-B"} · Open-Meteo · NASA · TCMB · NOAA
      </span>
    </footer>
  );
}
