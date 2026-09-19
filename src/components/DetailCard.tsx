"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, X } from "lucide-react";
import { PROVINCE_BY_PLATE, haversineKm, nearestProvince } from "@/data/provinces";
import { aqiClass, compass, fmtDateTime, fmtNum, timeAgo, wmoText } from "@/lib/format";
import type { Selection } from "@/lib/layers";
import { MODE_LABEL, type DatasetMeta } from "@/catalog/meta";
import type { LineTrack } from "./LineTracker";
import type { Feeds } from "./Dashboard";

type Props = {
  selection: NonNullable<Selection>;
  feeds: Feeds;
  onClose: () => void;
  onSelect: (s: Selection, fly?: boolean) => void;
  onFly: (lon: number, lat: number, zoom?: number) => void;
  onTrack: (t: LineTrack) => void;
  datasetMeta?: DatasetMeta;
};

const KIND_LABEL = { airport: "Havalimanı", port: "Liman", strait: "Boğaz", energy: "Enerji tesisi", dam: "Baraj" };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="kv">
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}

function Near({ lat, lon }: { lat: number; lon: number }) {
  const n = nearestProvince(lat, lon);
  return <Row k="En yakın il merkezi" v={`${n.province.name} · ${fmtNum(n.distanceKm)} km`} />;
}

// ---- İl brifingi: o ildeki hastaneler (statik dosya, tek sefer yüklenir) ----
type HospitalF = GeoJSON.Feature<GeoJSON.Point, Record<string, unknown> & { ad: string; il: string; tur: string; acil: boolean | null }>;
let hospitalsPromise: Promise<HospitalF[]> | null = null;
const loadHospitals = () =>
  (hospitalsPromise ??= fetch("/geo/hospitals.geojson")
    .then((r) => r.json())
    .then((j: GeoJSON.FeatureCollection) => j.features as HospitalF[])
    .catch(() => {
      hospitalsPromise = null;
      return [];
    }));

function ProvinceHospitals({ name, onPick }: { name: string; onPick: (f: HospitalF) => void }) {
  const [list, setList] = useState<HospitalF[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadHospitals().then((all) => alive && setList(all.filter((h) => h.properties.il === name)));
    return () => {
      alive = false;
    };
  }, [name]);
  if (!list) return <p className="muted small">Hastaneler yükleniyor…</p>;
  const acil = list.filter((h) => h.properties.acil).length;
  const byType = list.reduce<Record<string, number>>((m, h) => ((m[h.properties.tur] = (m[h.properties.tur] ?? 0) + 1), m), {});
  const order = ["Şehir hastanesi", "Eğitim ve araştırma", "Üniversite", "Devlet", "Özel"];
  const sorted = [...list].sort((a, b) => {
    const ia = order.indexOf(a.properties.tur), ib = order.indexOf(b.properties.tur);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.properties.ad.localeCompare(b.properties.ad, "tr");
  });
  return (
    <>
      <h4>Hastaneler ({list.length})</h4>
      <p className="muted small">
        {Object.entries(byType)
          .sort((a, b) => b[1] - a[1])
          .map(([t, n]) => `${t}: ${n}`)
          .join(" · ")}
        {acil ? ` · acil servisi kayıtlı: ${acil}` : ""}
      </p>
      <ul className="mini">
        {sorted.slice(0, 8).map((h) => (
          <li key={String(h.properties._id)}>
            <button onClick={() => onPick(h)}>
              {h.properties.ad} <span className="muted">· {h.properties.tur}{h.properties.acil ? " · acil" : ""}</span>
            </button>
          </li>
        ))}
      </ul>
      {list.length > 8 && <p className="muted small">Tamamı için "Hastaneler" katmanını açıp Filtreler'den il seçin.</p>}
    </>
  );
}

function fmtValue(v: unknown, unit?: string) {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Evet" : "Hayır";
  if (typeof v === "number") return `${v.toLocaleString("tr-TR")}${unit ? " " + unit : ""}`;
  const str = String(v);
  return MODE_LABEL[str] ?? `${str}${unit ? " " + unit : ""}`;
}

export default function DetailCard({ selection: s, feeds, onClose, onSelect, onFly, onTrack, datasetMeta }: Props) {
  let kicker = "";
  let title = "";
  let body: React.ReactNode = null;

  if (s.kind === "quake") {
    const q = s.item;
    const quakes = feeds.quakes.data?.events ?? [];
    const nearby = quakes.filter((o) => o.id !== q.id && haversineKm(q.lat, q.lon, o.lat, o.lon) < 30).length;
    kicker = `Deprem · ${q.source}`;
    title = `M${q.mag.toFixed(1)} ${q.place}`;
    body = (
      <>
        <Row k="Zaman (TSİ)" v={`${fmtDateTime(q.time)} · ${timeAgo(q.time)}`} />
        <Row k="Büyüklük" v={`${q.mag.toFixed(1)} ${q.magType ?? ""}`} />
        <Row k="Derinlik" v={`${q.depthKm.toFixed(1)} km`} />
        <Row k="Koordinat" v={`${q.lat.toFixed(4)}, ${q.lon.toFixed(4)}`} />
        <Near lat={q.lat} lon={q.lon} />
        <Row k="30 km içinde diğer olay" v={`${nearby} (seçili dönem)`} />
      </>
    );
  } else if (s.kind === "flight") {
    const a = (feeds.flights.data?.aircraft ?? []).find((x) => x.id === s.item.id) ?? s.item;
    kicker = a.military ? "Askerî hava aracı" : a.emergency ? "ACİL DURUM" : "Hava aracı";
    title = a.callsign;
    body = (
      <>
        {a.reg && <Row k="Tescil" v={a.reg} />}
        {a.type && <Row k="Tip" v={a.type} />}
        {a.country && <Row k="Tescil ülkesi" v={a.country} />}
        <Row k="ICAO24" v={<span className="mono">{a.id.toUpperCase()}</span>} />
        <Row k="İrtifa" v={a.onGround ? "Yerde" : a.altM != null ? `${fmtNum(a.altM)} m (FL${Math.round(a.altM / 30.48)})` : "—"} />
        <Row k="Yer hızı" v={a.speedKmh != null ? `${fmtNum(a.speedKmh)} km/sa` : "—"} />
        <Row k="Rota" v={a.heading != null ? `${Math.round(a.heading)}° ${compass(a.heading)}` : "—"} />
        <Row k="Dikey hız" v={a.vrateMs != null ? `${a.vrateMs > 0 ? "+" : ""}${a.vrateMs} m/s` : "—"} />
        <Row k="Squawk" v={a.squawk ?? "—"} />
        <Near lat={a.lat} lon={a.lon} />
        <div className="links">
          <a href={`https://adsb.lol/?icao=${a.id}`} target="_blank" rel="noreferrer noopener">
            adsb.lol <ExternalLink size={11} />
          </a>
          <a href={`https://globe.adsbexchange.com/?icao=${a.id}`} target="_blank" rel="noreferrer noopener">
            ADS-B Exchange <ExternalLink size={11} />
          </a>
        </div>
      </>
    );
  } else if (s.kind === "fire") {
    const f = s.item;
    kicker = `Yangın · ${f.source}`;
    title = f.title.replace(/^Wildfire/i, "Orman yangını");
    body = (
      <>
        <Row k="Tespit" v={`${fmtDateTime(f.time)} · ${timeAgo(f.time)}`} />
        {f.frp != null && <Row k="Işınım gücü (FRP)" v={`${f.frp} MW`} />}
        {f.confidence && <Row k="Güven" v={f.confidence} />}
        {f.plate && <Row k="İl" v={PROVINCE_BY_PLATE.get(f.plate)?.name} />}
        <Row k="Koordinat" v={`${f.lat.toFixed(4)}, ${f.lon.toFixed(4)}`} />
        <Near lat={f.lat} lon={f.lon} />
        {f.link && (
          <div className="links">
            <a href={f.link} target="_blank" rel="noreferrer noopener">
              EONET kaydı <ExternalLink size={11} />
            </a>
          </div>
        )}
      </>
    );
  } else if (s.kind === "static") {
    const p = s.item;
    kicker = KIND_LABEL[p.kind];
    title = p.name;
    body = (
      <>
        {p.code && <Row k="IATA" v={p.code} />}
        {p.note && <Row k="Not" v={p.note} />}
        <Row k="Koordinat" v={`${p.lat.toFixed(3)}, ${p.lon.toFixed(3)} (yaklaşık)`} />
        <Near lat={p.lat} lon={p.lon} />
      </>
    );
  } else if (s.kind === "iss") {
    const iss = feeds.space.data?.iss;
    kicker = "Uzay";
    title = "Uluslararası Uzay İstasyonu";
    body = iss ? (
      <>
        <Row k="Konum" v={`${iss.lat.toFixed(2)}, ${iss.lon.toFixed(2)}`} />
        <Row k="İrtifa" v={`${fmtNum(iss.altKm)} km`} />
        <Row k="Hız" v={`${fmtNum(iss.velocityKmh)} km/sa`} />
        <Row k="Görünürlük" v={iss.visibility === "daylight" ? "Gün ışığında" : "Gölgede"} />
      </>
    ) : (
      <p className="muted">Konum alınamadı.</p>
    );
  } else if (s.kind === "feature") {
    const m = datasetMeta;
    const p = s.props;
    kicker = m ? `${m.category} · ${m.city} · ${m.provider}` : s.dataset;
    title = String(p[m?.titleField ?? "name"] ?? "Kayıt");
    const lines = s.dataset === "izmir-stops" ? String(p.hatlar ?? "").split(/,\s*/).filter(Boolean) : [];
    body = (
      <>
        {m?.fields
          .filter((f) => f.show !== false && f.key !== m.titleField)
          .map((f) => {
            const v = p[f.key];
            if (typeof v === "string" && /^https?:\/\//.test(v))
              return (
                <Row
                  key={f.key}
                  k={f.label}
                  v={
                    <a href={v} target="_blank" rel="noreferrer noopener">
                      {v.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)} <ExternalLink size={11} />
                    </a>
                  }
                />
              );
            if (f.key === "telefon" && typeof v === "string" && v) return <Row key={f.key} k={f.label} v={<a href={`tel:${v.replace(/\s/g, "")}`}>{v}</a>} />;
            return <Row key={f.key} k={f.label} v={fmtValue(v, f.unit)} />;
          })}
        {s.dataset === "iett-buses" && (
          <p className="muted small">Filo servisi aracın hattını vermiyor; bir hattı izlemek için arama kutusuna hat kodunu yazın.</p>
        )}
        {lines.length > 0 && (
          <>
            <h4>Bu duraktan geçen hatlar — izlemek için tıklayın</h4>
            <div className="chips">
              {lines.map((l) => (
                <button key={l} className="chip" onClick={() => onTrack({ city: "izmir", code: l })}>
                  {l}
                </button>
              ))}
            </div>
          </>
        )}
        <Row k="Koordinat" v={`${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}`} />
        <Near lat={s.lat} lon={s.lon} />
        <div className="links">
          <button className="link-btn" onClick={() => onFly(s.lon, s.lat, 16)}>
            Yakınlaştır
          </button>
          <a href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=17/${s.lat}/${s.lon}`} target="_blank" rel="noreferrer noopener">
            OSM'de aç <ExternalLink size={11} />
          </a>
          {m?.sourceUrl && (
            <a href={m.sourceUrl} target="_blank" rel="noreferrer noopener">
              Veri kaynağı <ExternalLink size={11} />
            </a>
          )}
        </div>
        {m && <p className="muted small">Lisans: {m.license}</p>}
      </>
    );
  } else if (s.kind === "province") {
    const p = PROVINCE_BY_PLATE.get(s.plate)!;
    const w = feeds.weather.data?.find((x) => x.plate === p.plate);
    const quakes = (feeds.quakes.data?.events ?? []).filter((q) => q.plate === p.plate);
    const news = (feeds.news.data?.items ?? []).filter((n) => n.provinces.includes(p.plate));
    const overhead = (feeds.flights.data?.aircraft ?? []).filter((a) => haversineKm(a.lat, a.lon, p.lat, p.lon) < 75).length;
    const fires = (feeds.fires.data?.events ?? []).filter((f) => f.plate === p.plate);
    const aq = aqiClass(w?.aqi);
    kicker = `İl brifingi · ${p.region} · ${String(p.plate).padStart(2, "0")}`;
    title = p.name;
    body = (
      <>
        <div className="brief-grid">
          <div>
            <span className="muted">Hava</span>
            <b>{fmtNum(w?.temp)}°C</b>
            <small>{wmoText(w?.code)} · hissedilen {fmtNum(w?.apparent)}°</small>
          </div>
          <div>
            <span className="muted">Rüzgâr</span>
            <b>{fmtNum(w?.wind)} km/sa</b>
            <small>{compass(w?.windDir)} · nem %{fmtNum(w?.humidity)}</small>
          </div>
          <div>
            <span className="muted">Hava kalitesi</span>
            <b className={`aq ${aq.tone}`}>{w?.aqi ?? "—"}</b>
            <small>{aq.label} · PM2.5 {fmtNum(w?.pm25)}</small>
          </div>
          <div>
            <span className="muted">Üstündeki uçak</span>
            <b>{overhead}</b>
            <small>75 km yarıçap</small>
          </div>
          <div>
            <span className="muted">Sıcak nokta</span>
            <b>{fires.length}</b>
            <small>uydu tespiti · {fmtNum(fires.reduce((s, f) => s + (f.frp ?? 0), 0))} MW</small>
          </div>
          <div>
            <span className="muted">Deprem</span>
            <b>{quakes.length}</b>
            <small>{quakes.length ? `en büyük M${Math.max(...quakes.map((q) => q.mag)).toFixed(1)}` : "seçili dönem"}</small>
          </div>
        </div>

        <ProvinceHospitals
          name={p.name}
          onPick={(h) => {
            const [lon, lat] = h.geometry.coordinates;
            onSelect({ kind: "feature", dataset: "hospitals", props: h.properties, lon, lat });
            onFly(lon, lat, 15);
          }}
        />

        <h4>Depremler ({quakes.length})</h4>
        {quakes.length === 0 ? (
          <p className="muted small">Seçili dönemde kayıt yok.</p>
        ) : (
          <ul className="mini">
            {quakes.slice(0, 6).map((q) => (
              <li key={q.id}>
                <button onClick={() => onSelect({ kind: "quake", item: q }, true)}>
                  <b>M{q.mag.toFixed(1)}</b> {q.place} <span className="muted">· {timeAgo(q.time)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <h4>Haberler ({news.length})</h4>
        {news.length === 0 ? (
          <p className="muted small">Güncel akışta bu ilden söz eden başlık yok.</p>
        ) : (
          <ul className="mini">
            {news.slice(0, 6).map((n) => (
              <li key={n.id}>
                <a href={n.link} target="_blank" rel="noreferrer noopener">
                  {n.title} <span className="muted">· {n.source}, {timeAgo(n.published)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="links">
          <button className="link-btn" onClick={() => onFly(p.lon, p.lat, 8)}>
            İle odaklan
          </button>
        </div>
      </>
    );
  }

  return <CardShell kicker={kicker} title={title} onClose={onClose} body={body} key={title} />;
}

/** Küçültülebilir kart kabuğu: başlığa ya da ok düğmesine basınca yalnız başlık kalır. */
function CardShell({ kicker, title, onClose, body }: { kicker: string; title: string; onClose: () => void; body: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className={`detail ${collapsed ? "collapsed" : ""}`} role="dialog" aria-label={title}>
      <header>
        <button className="card-title" onClick={() => setCollapsed((v) => !v)} aria-expanded={!collapsed}>
          <span className="kicker">{kicker}</span>
          <h3>{title}</h3>
        </button>
        <div className="cam-actions">
          <button className="icon-btn" onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Genişlet" : "Küçült"} aria-label={collapsed ? "Genişlet" : "Küçült"}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button className="icon-btn" onClick={onClose} title="Kapat (Esc)" aria-label="Kapat">
            <X size={16} />
          </button>
        </div>
      </header>
      {!collapsed && <div className="detail-body">{body}</div>}
    </section>
  );
}
