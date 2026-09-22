"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Siren } from "lucide-react";
import { fmtNum, kpClass } from "@/lib/format";
import type { Feeds } from "./Dashboard";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tr = now ? now.toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul", hour12: false }) : "--:--:--";
  const utc = now ? now.toISOString().slice(11, 16) : "--:--";
  const date = now ? now.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", weekday: "short" }) : "";
  return (
    <div className="clock" title={now ? now.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "full", timeStyle: "medium" }) : ""}>
      <span className="clock-time">
        {tr} <small>TSİ</small>
      </span>
      <span className="clock-sub">
        {date} · {utc} UTC
      </span>
    </div>
  );
}

export default function TopBar({
  feeds,
  alertCount,
  search,
  onAlerts,
}: {
  feeds: Feeds;
  alertCount: number;
  search: ReactNode;
  onAlerts: () => void;
}) {
  const rates = feeds.markets.data?.rates ?? [];
  const kp = feeds.space.data?.kp ?? null;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle cx="10" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="12.2" cy="12" r="5.4" fill="var(--accent)" />
            <path d="M17.6 9.2l.7 1.9 2 .1-1.6 1.2.6 1.9-1.7-1.1-1.7 1.1.6-1.9-1.6-1.2 2-.1z" fill="currentColor" />
          </svg>
        </span>
        <div className="brand-text">
          <h1>GÖKBERK</h1>
          <p>Türkiye Durum Farkındalığı</p>
        </div>
      </div>

      <div className="topbar-search">{search}</div>

      <div className="topbar-status">
        {/* Sığmayan kur/göstergeler alta kayarak gizlenir: öncelik soldan sağa */}
        <div className="ticker" aria-label="TCMB döviz kurları ve uzay havası">
          {rates.slice(0, 4).map((r) => (
            <span key={r.code} className="tick" title={`${r.name} — TCMB döviz satış`}>
              <span className="tick-code">{r.code}</span>
              <b>{fmtNum(r.sell, 2)}</b>
            </span>
          ))}
          {kp != null && (
            <span className={`tick ${kp >= 5 ? "hot" : ""}`} title={`NOAA gezegensel Kp indeksi — ${kpClass(kp)}`}>
              <span className="tick-code">Kp</span>
              <b>{kp.toFixed(1)}</b>
            </span>
          )}
        </div>
        <Clock />
        <button className={`alert-pill ${alertCount ? "hot" : ""}`} onClick={onAlerts} title="Uyarıları göster">
          <Siren size={15} />
          <span>{alertCount}</span>
          <span className="alert-word">uyarı</span>
        </button>
      </div>
    </header>
  );
}
