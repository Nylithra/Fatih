import { PROVINCE_BY_PLATE, nearestProvince } from "@/data/provinces";
import { aqiClass, isSevereWeather, wmoText } from "./format";
import type { Selection } from "./layers";
import type { Aircraft, Earthquake, FireEvent, ProvinceWeather, SpaceWeather } from "./types";

export type Alert = {
  id: string;
  level: "critical" | "warning" | "info";
  category: "Deprem" | "Havacılık" | "Yangın" | "Hava" | "Hava Kalitesi" | "Uzay";
  title: string;
  detail: string;
  time?: string;
  target?: Selection;
  at?: [number, number];
};

const RANK = { critical: 0, warning: 1, info: 2 } as const;

export function buildAlerts(input: {
  quakes: Earthquake[];
  flights: Aircraft[];
  fires: FireEvent[];
  weather: ProvinceWeather[];
  space: SpaceWeather | null;
}): Alert[] {
  const out: Alert[] = [];
  const now = Date.now();

  for (const q of input.quakes) {
    const ageH = (now - new Date(q.time).getTime()) / 3_600_000;
    const level = q.mag >= 5 && ageH < 72 ? "critical" : q.mag >= 4 && ageH < 24 ? "warning" : q.mag >= 3.5 && ageH < 6 ? "info" : null;
    if (!level) continue;
    const near = q.province ?? nearestProvince(q.lat, q.lon).province.name;
    out.push({
      id: `q-${q.id}`,
      level,
      category: "Deprem",
      title: `M${q.mag.toFixed(1)} — ${q.place}`,
      detail: `${near} · derinlik ${q.depthKm.toFixed(1)} km · ${q.source}`,
      time: q.time,
      target: { kind: "quake", item: q },
      at: [q.lon, q.lat],
    });
  }

  for (const a of input.flights) {
    if (!a.emergency) continue;
    const meaning = a.squawk === "7500" ? "yasadışı müdahale" : a.squawk === "7600" ? "telsiz arızası" : "acil durum";
    out.push({
      id: `f-${a.id}`,
      level: "critical",
      category: "Havacılık",
      title: `${a.callsign} — squawk ${a.squawk ?? "?"}`,
      detail: `Transponder ${meaning} bildiriyor · ${nearestProvince(a.lat, a.lon).province.name} yakını`,
      target: { kind: "flight", item: a },
      at: [a.lon, a.lat],
    });
  }

  const eonet = input.fires.filter((f) => f.source === "EONET");
  for (const f of eonet) {
    out.push({
      id: `fire-${f.id}`,
      level: "warning",
      category: "Yangın",
      title: f.title.replace(/^Wildfire/i, "Orman yangını"),
      detail: `${nearestProvince(f.lat, f.lon).province.name} yakını · NASA EONET`,
      time: f.time,
      target: { kind: "fire", item: f },
      at: [f.lon, f.lat],
    });
  }
  // Uydu sıcak noktaları il bazında toplanır; yoğun kümeler uyarıya dönüşür.
  const byProv = new Map<number, { n: number; frp: number; last: string; lat: number; lon: number; maxFrp: number }>();
  for (const f of input.fires) {
    if (f.source !== "FIRMS" || !f.plate) continue;
    const e = byProv.get(f.plate) ?? { n: 0, frp: 0, last: "", lat: f.lat, lon: f.lon, maxFrp: -1 };
    e.n++;
    e.frp += f.frp ?? 0;
    if (f.time > e.last) e.last = f.time;
    if ((f.frp ?? 0) > e.maxFrp) Object.assign(e, { maxFrp: f.frp ?? 0, lat: f.lat, lon: f.lon });
    byProv.set(f.plate, e);
  }
  for (const [plate, e] of byProv) {
    const level = e.n >= 25 || e.frp >= 300 ? "warning" : e.n >= 8 || e.frp >= 80 ? "info" : null;
    if (!level) continue;
    out.push({
      id: `firms-${plate}`,
      level,
      category: "Yangın",
      title: `${PROVINCE_BY_PLATE.get(plate)!.name}: ${e.n} uydu sıcak noktası`,
      detail: `Toplam ışınım ${Math.round(e.frp)} MW · sanayi/anız kaynaklı da olabilir`,
      time: e.last,
      target: { kind: "province", plate },
      at: [e.lon, e.lat],
    });
  }

  for (const w of input.weather) {
    const p = PROVINCE_BY_PLATE.get(w.plate)!;
    if (isSevereWeather(w.code)) {
      out.push({
        id: `wx-${w.plate}`,
        level: "warning",
        category: "Hava",
        title: `${p.name}: ${wmoText(w.code)}`,
        detail: `${w.temp?.toFixed(0) ?? "—"}°C · rüzgâr ${w.wind?.toFixed(0) ?? "—"} km/sa`,
        target: { kind: "province", plate: w.plate },
        at: [p.lon, p.lat],
      });
    }
    if (w.wind != null && w.wind >= 60) {
      out.push({
        id: `wind-${w.plate}`,
        level: "warning",
        category: "Hava",
        title: `${p.name}: kuvvetli rüzgâr ${w.wind.toFixed(0)} km/sa`,
        detail: "Fırtına seviyesine yakın rüzgâr",
        target: { kind: "province", plate: w.plate },
        at: [p.lon, p.lat],
      });
    }
    if (w.aqi != null && w.aqi > 80) {
      out.push({
        id: `aq-${w.plate}`,
        level: w.aqi > 100 ? "warning" : "info",
        category: "Hava Kalitesi",
        title: `${p.name}: hava kalitesi ${aqiClass(w.aqi).label.toLocaleLowerCase("tr-TR")}`,
        detail: `AQI ${w.aqi} · PM2.5 ${w.pm25?.toFixed(0) ?? "—"} µg/m³`,
        target: { kind: "province", plate: w.plate },
        at: [p.lon, p.lat],
      });
    }
  }

  const kp = input.space?.kp;
  if (kp != null && kp >= 5) {
    out.push({
      id: "kp",
      level: kp >= 7 ? "critical" : "warning",
      category: "Uzay",
      title: `Jeomanyetik fırtına (Kp ${kp.toFixed(1)})`,
      detail: "HF radyo, GNSS ve enerji şebekelerinde aksama riski",
      time: input.space?.kpTime ?? undefined,
    });
  }

  return out.sort((a, b) => RANK[a.level] - RANK[b.level] || (b.time ?? "").localeCompare(a.time ?? ""));
}
