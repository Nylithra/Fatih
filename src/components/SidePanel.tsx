"use client";

import { useMemo, useState } from "react";
import { Activity, ChevronRight, ExternalLink, Newspaper, Search, Siren, Map as MapIcon, Video, Grid2x2, Play, Plus } from "lucide-react";
import { CAMERAS, isWatchable } from "./camera/cameras";
import { PROVINCES, PROVINCE_BY_PLATE, REGIONS, trNorm } from "@/data/provinces";
import { aqiClass, fmtDateTime, fmtNum, timeAgo, wmoText } from "@/lib/format";
import type { Alert } from "@/lib/alerts";
import type { Selection } from "@/lib/layers";
import type { Earthquake } from "@/lib/types";
import type { Feeds } from "./Dashboard";

type Tab = "ozet" | "deprem" | "haber" | "iller" | "kamera";

type Props = {
  onToggleOpen: () => void;
  feeds: Feeds;
  quakes: Earthquake[];
  alerts: Alert[];
  onSelect: (s: Selection, fly?: boolean) => void;
  onFly: (lon: number, lat: number, zoom?: number) => void;
  wall: string[];
  onCamera: (id: string) => void;
  onAddToWall: (id: string) => void;
  onOpenWall: () => void;
};

export default function SidePanel(p: Props) {
  const [tab, setTab] = useState<Tab>("ozet");
  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "ozet", label: "Özet", icon: <Siren size={16} />, badge: p.alerts.filter((a) => a.level !== "info").length },
    { id: "deprem", label: "Deprem", icon: <Activity size={16} /> },
    { id: "haber", label: "Haber", icon: <Newspaper size={16} /> },
    { id: "iller", label: "İller", icon: <MapIcon size={16} /> },
    { id: "kamera", label: "Kamera", icon: <Video size={16} /> },
  ];

  return (
    <>
      <div className="drawer-head">
        <div className="tabbar" role="tablist" aria-label="Bilgi paneli">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              <span className="tab-icon">
                {t.icon}
                {!!t.badge && <span className="badge">{t.badge}</span>}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={p.onToggleOpen} title="Paneli gizle ( ] )" aria-label="Paneli gizle">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="drawer-body">
        {tab === "ozet" && <Summary {...p} />}
        {tab === "deprem" && <QuakeList {...p} />}
        {tab === "haber" && <NewsList {...p} />}
        {tab === "iller" && <ProvinceTable {...p} />}
        {tab === "kamera" && <CameraList {...p} />}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Summary({ feeds, quakes, alerts, onSelect, onFly }: Props) {
  const now = Date.now();
  const q24 = quakes.filter((q) => now - new Date(q.time).getTime() < 86_400_000);
  const biggest = q24.reduce<Earthquake | null>((m, q) => (!m || q.mag > m.mag ? q : m), null);
  const flights = feeds.flights.data?.aircraft ?? [];
  const airborne = flights.filter((a) => !a.onGround);
  const mil = flights.filter((a) => a.military).length;
  const weather = feeds.weather.data ?? [];
  const withTemp = weather.filter((w) => w.temp != null);
  const hottest = withTemp.reduce((m, w) => (!m || w.temp! > m.temp! ? w : m), withTemp[0]);
  const coldest = withTemp.reduce((m, w) => (!m || w.temp! < m.temp! ? w : m), withTemp[0]);
  const worstAq = weather.filter((w) => w.aqi != null).reduce((m, w) => (!m || w.aqi! > m.aqi! ? w : m), undefined as (typeof weather)[number] | undefined);
  const newsItems = feeds.news.data?.items ?? [];
  const news1h = newsItems.filter((n) => now - new Date(n.published).getTime() < 3_600_000).length;
  const fires = feeds.fires.data?.events ?? [];
  const fireCount = fires.length;
  const firmsWindow = feeds.fires.data?.firmsMode === "api-48h" ? "48 sa" : "24 sa";
  const fireByPlate = new Map<number, number>();
  for (const f of fires) if (f.plate) fireByPlate.set(f.plate, (fireByPlate.get(f.plate) ?? 0) + 1);
  const topFireEntry = [...fireByPlate].sort((a, b) => b[1] - a[1])[0];
  const topFirePlate = topFireEntry?.[0];
  const topFire = topFireEntry ? ([PROVINCE_BY_PLATE.get(topFireEntry[0])!.name, topFireEntry[1]] as const) : null;

  return (
    <>
      <div className="stats">
        <Stat label="Deprem (24 sa)" value={fmtNum(q24.length)} sub={biggest ? `En büyük M${biggest.mag.toFixed(1)} · ${biggest.place}` : "—"}
          onClick={biggest ? () => onSelect({ kind: "quake", item: biggest }, true) : undefined} tone="quake" />
        <Stat label="Havadaki uçak" value={fmtNum(airborne.length)} sub={`${fmtNum(flights.length)} izli · ${mil} askerî`} tone="flight" />
        <Stat label="Haber (son 1 sa)" value={fmtNum(news1h)} sub={`${fmtNum(newsItems.length)} başlık · ${feeds.news.data?.sources.filter((s) => s.ok).length ?? 0} kaynak`} tone="news" />
        <Stat
          label="Yangın sıcak noktası"
          value={fmtNum(fireCount)}
          sub={topFire ? `En yoğun: ${topFire[0]} (${topFire[1]}) · ${firmsWindow}` : `NASA FIRMS · ${firmsWindow}`}
          onClick={topFirePlate ? () => onSelect({ kind: "province", plate: topFirePlate }) : undefined}
          tone="fire"
        />
        <Stat
          label="Sıcaklık aralığı"
          value={hottest && coldest ? `${fmtNum(coldest.temp)}° / ${fmtNum(hottest.temp)}°` : "—"}
          sub={hottest && coldest ? `${PROVINCE_BY_PLATE.get(coldest.plate)!.name} – ${PROVINCE_BY_PLATE.get(hottest.plate)!.name}` : ""}
          tone="weather"
        />
        <Stat
          label="En kötü hava kalitesi"
          value={worstAq ? `AQI ${worstAq.aqi}` : "—"}
          sub={worstAq ? `${PROVINCE_BY_PLATE.get(worstAq.plate)!.name} · ${aqiClass(worstAq.aqi).label}` : ""}
          onClick={worstAq ? () => onSelect({ kind: "province", plate: worstAq.plate }) : undefined}
          tone="aq"
        />
      </div>

      <h3 className="section-title">Uyarılar</h3>
      {alerts.length === 0 && <p className="empty">Şu anda eşik üstü bir olay yok.</p>}
      <ul className="alerts">
        {alerts.slice(0, 60).map((a) => (
          <li key={a.id} className={`alert ${a.level}`}>
            <button
              onClick={() => {
                if (a.target) onSelect(a.target);
                if (a.at) onFly(a.at[0], a.at[1], 7.5);
              }}
            >
              <span className="alert-cat">{a.category}</span>
              <span className="alert-title">{a.title}</span>
              <span className="alert-detail">
                {a.detail}
                {a.time ? ` · ${timeAgo(a.time)}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Stat({ label, value, sub, onClick, tone }: { label: string; value: string; sub?: string; onClick?: () => void; tone: string }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`stat tone-${tone}`} onClick={onClick}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </Tag>
  );
}

// ---------------------------------------------------------------------------

function magTone(m: number) {
  return m >= 5 ? "m5" : m >= 4 ? "m4" : m >= 3 ? "m3" : m >= 2 ? "m2" : "m1";
}

function QuakeList({ quakes, feeds, onSelect }: Props) {
  const [sort, setSort] = useState<"time" | "mag">("time");
  const list = useMemo(
    () => (sort === "time" ? quakes : [...quakes].sort((a, b) => b.mag - a.mag)).slice(0, 300),
    [quakes, sort],
  );
  return (
    <>
      <div className="list-head">
        <span className="muted">
          {fmtNum(quakes.length)} olay · kaynak {feeds.quakes.data?.provider ?? "…"}
        </span>
        <div className="seg small">
          <button className={sort === "time" ? "on" : ""} onClick={() => setSort("time")}>Zaman</button>
          <button className={sort === "mag" ? "on" : ""} onClick={() => setSort("mag")}>Büyüklük</button>
        </div>
      </div>
      {feeds.quakes.error && !feeds.quakes.data && <p className="error">Deprem verisi alınamadı: {feeds.quakes.error}</p>}
      <ul className="rows">
        {list.map((q) => (
          <li key={q.id}>
            <button className="row" onClick={() => onSelect({ kind: "quake", item: q }, true)}>
              <span className={`mag ${magTone(q.mag)}`}>{q.mag.toFixed(1)}</span>
              <span className="row-main">
                <span className="row-title">{q.place}</span>
                <span className="row-sub">
                  {fmtDateTime(q.time)} · {q.depthKm.toFixed(1)} km
                </span>
              </span>
              <span className="row-meta">{timeAgo(q.time)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------

function NewsList({ feeds, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("");
  const [onlyGeo, setOnlyGeo] = useState(false);
  const items = feeds.news.data?.items ?? [];
  const sources = feeds.news.data?.sources ?? [];
  const needle = trNorm(q.trim());
  const list = items
    .filter((n) => (!src || n.source === src) && (!onlyGeo || n.provinces.length))
    .filter((n) => !needle || trNorm(n.title + " " + (n.summary ?? "")).includes(needle))
    .slice(0, 200);
  return (
    <>
      <div className="filters">
        <label className="search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Haberlerde ara…" />
        </label>
        <select value={src} onChange={(e) => setSrc(e.target.value)}>
          <option value="">Tüm kaynaklar</option>
          {sources.map((s) => (
            <option key={s.source} value={s.source} disabled={!s.ok}>
              {s.source} ({s.count}){s.ok ? "" : " — erişilemedi"}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={onlyGeo} onChange={() => setOnlyGeo((v) => !v)} /> Yalnız il içerenler
        </label>
      </div>
      {feeds.news.error && !feeds.news.data && <p className="error">Haberler alınamadı: {feeds.news.error}</p>}
      <ul className="rows news">
        {list.map((n) => (
          <li key={n.id} className="news-item">
            <div className="news-meta">
              <span className="news-src">{n.source}</span>
              <span className="muted">{timeAgo(n.published)}</span>
            </div>
            <a href={n.link} target="_blank" rel="noreferrer noopener" className="news-title">
              {n.title} <ExternalLink size={11} />
            </a>
            {n.provinces.length > 0 && (
              <div className="chips">
                {n.provinces.map((pl) => (
                  <button key={pl} className="chip" onClick={() => onSelect({ kind: "province", plate: pl })}>
                    {PROVINCE_BY_PLATE.get(pl)?.name}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------------------

type SortKey = "plate" | "name" | "temp" | "aqi" | "wind";

function ProvinceTable({ feeds, onSelect, onFly }: Props) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "plate", dir: 1 });
  const wx = new Map((feeds.weather.data ?? []).map((w) => [w.plate, w]));
  const needle = trNorm(q.trim());
  const rows = PROVINCES.filter((p) => (!region || p.region === region) && (!needle || trNorm(p.name).includes(needle) || String(p.plate) === needle))
    .map((p) => ({ p, w: wx.get(p.plate) }))
    .sort((a, b) => {
      const k = sort.k;
      const v = (r: typeof a): number | string =>
        k === "plate" ? r.p.plate : k === "name" ? r.p.name : ((k === "temp" ? r.w?.temp : k === "aqi" ? r.w?.aqi : r.w?.wind) ?? -999);
      const va = v(a), vb = v(b);
      return (typeof va === "string" ? va.localeCompare(vb as string, "tr") : va - (vb as number)) * sort.dir;
    });
  const th = (k: SortKey, label: string) => (
    <th onClick={() => setSort((s) => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : k === "name" || k === "plate" ? 1 : -1 }))} className={sort.k === k ? "on" : ""}>
      {label}
      {sort.k === k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );
  return (
    <>
      <div className="filters">
        <label className="search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İl adı veya plaka…" />
        </label>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Tüm bölgeler</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <table className="ptable">
        <thead>
          <tr>
            {th("plate", "#")}
            {th("name", "İl")}
            {th("temp", "°C")}
            <th>Durum</th>
            {th("wind", "Rüzgâr")}
            {th("aqi", "AQI")}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, w }) => (
            <tr
              key={p.plate}
              onClick={() => {
                onSelect({ kind: "province", plate: p.plate });
                onFly(p.lon, p.lat, 7.2);
              }}
            >
              <td className="mono muted">{String(p.plate).padStart(2, "0")}</td>
              <td>{p.name}</td>
              <td className="mono">{fmtNum(w?.temp)}</td>
              <td className="muted">{wmoText(w?.code)}</td>
              <td className="mono">{fmtNum(w?.wind)}</td>
              <td>
                <span className={`aq ${aqiClass(w?.aqi).tone}`}>{w?.aqi ?? "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

// ---------------------------------------------------------------------------

function CameraList({ wall, onCamera, onAddToWall, onOpenWall, onFly }: Props) {
  const [q, setQ] = useState("");
  const [onlyLive, setOnlyLive] = useState(false);
  const needle = trNorm(q.trim());
  const list = CAMERAS.filter((c) => (!onlyLive || isWatchable(c)) && (!needle || trNorm(`${c.name} ${c.city} ${c.category ?? ""}`).includes(needle)));
  const cities = [...new Set(list.map((c) => c.city))].sort((a, b) => a.localeCompare(b, "tr"));
  const live = CAMERAS.filter(isWatchable);
  return (
    <>
      <div className="list-head">
        <span className="muted">
          {CAMERAS.length} kamera · {new Set(CAMERAS.map((c) => c.city)).size} il · {live.length} burada izlenebilir
        </span>
        <button className="link-btn small" onClick={onOpenWall}>
          <Grid2x2 size={13} /> Duvar ({wall.length})
        </button>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kamera, şehir veya yer ara…" />
        </label>
        <label className="check">
          <input type="checkbox" checked={onlyLive} onChange={() => setOnlyLive((v) => !v)} /> Yalnız FATİH içinde izlenebilenler
        </label>
      </div>
      {wall.length === 0 && (
        <button
          className="link-btn small"
          onClick={() => {
            live.slice(0, 4).forEach((c) => onAddToWall(c.id));
            onOpenWall();
          }}
        >
          İlk 4 canlı kamerayla duvar oluştur
        </button>
      )}
      {cities.map((city) => {
        const cams = list.filter((c) => c.city === city);
        return (
          <section key={city}>
            <h3 className="section-title">
              {city} <span className="muted">({cams.length})</span>
            </h3>
            <ul className="rows">
              {cams.map((c) => (
                <li key={c.id} className="cam-row">
                  <button
                    className="row"
                    onClick={() => {
                      onCamera(c.id);
                      if (c.lat != null && c.lon != null) onFly(c.lon, c.lat, 14);
                    }}
                  >
                    <span className={`cam-kind ${c.kind}`}>{isWatchable(c) ? <Play size={12} /> : <ExternalLink size={12} />}</span>
                    <span className="row-main">
                      <span className="row-title">{c.name}</span>
                      <span className="row-sub">
                        {c.note
                          ? "Yayın geçici olarak kapalı"
                          : c.kind === "hls"
                            ? "Canlı · FATİH içinde"
                            : c.kind === "embed"
                              ? "Canlı · belediyenin resmî oynatıcısı"
                              : "Resmî sayfada izlenir"}
                        {c.category ? ` · ${c.category}` : ""}
                      </span>
                    </span>
                  </button>
                  {isWatchable(c) && (
                    <button className="icon-btn" disabled={wall.includes(c.id)} onClick={() => onAddToWall(c.id)} title="Duvara ekle">
                      <Plus size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {list.length === 0 && <p className="empty">Eşleşen kamera yok.</p>}
    </>
  );
}
