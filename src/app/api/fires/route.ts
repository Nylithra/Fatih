import { cached } from "@/lib/cache";
import { envelope, failure, fetchJson, fetchText } from "@/lib/http";
import { provinceAt } from "@/lib/pip";
import { TR_BBOX } from "@/data/provinces";
import type { FireEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Aktif yangınlar:
 *  1) NASA FIRMS VIIRS uydu sıcak noktaları (anahtarsız 24 sa bölgesel CSV'ler; FIRMS_API_KEY varsa alan API'si)
 *  2) NASA EONET doğal olay kayıtları (son 30 gün, açık)
 * Yalnızca Türkiye sınırları içindeki tespitler tutulur ve her birine il atanır.
 */

const FIRMS_PUBLIC = [
  ["S-NPP", "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Russia_Asia_24h.csv"],
  ["NOAA-20", "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Russia_Asia_24h.csv"],
  ["S-NPP", "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Europe_24h.csv"],
  ["NOAA-20", "https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Europe_24h.csv"],
] as const;

const CONF: Record<string, string> = { l: "düşük", n: "normal", h: "yüksek", low: "düşük", nominal: "normal", high: "yüksek" };

function parseFirmsCsv(csv: string, sat: string): FireEvent[] {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const cols = header.split(",");
  const I = (n: string) => cols.indexOf(n);
  const iLat = I("latitude"), iLon = I("longitude"), iDate = I("acq_date"), iTime = I("acq_time"), iConf = I("confidence"), iFrp = I("frp"), iDn = I("daynight");
  const out: FireEvent[] = [];
  for (const line of rows) {
    const v = line.split(",");
    const lat = Number(v[iLat]);
    const lon = Number(v[iLon]);
    if (lat < TR_BBOX.minLat || lat > TR_BBOX.maxLat || lon < TR_BBOX.minLon || lon > TR_BBOX.maxLon) continue;
    const plate = provinceAt(lon, lat);
    if (plate == null) continue;
    const t = (v[iTime] ?? "0000").padStart(4, "0");
    out.push({
      id: `firms-${sat}-${lat}-${lon}-${v[iDate]}${t}`,
      source: "FIRMS",
      title: `Uydu sıcak nokta tespiti (VIIRS ${sat}${v[iDn] === "N" ? ", gece" : ""})`,
      lat,
      lon,
      plate,
      time: `${v[iDate]}T${t.slice(0, 2)}:${t.slice(2)}:00Z`,
      confidence: CONF[v[iConf]] ?? v[iConf],
      frp: Number(v[iFrp]) || undefined,
    });
  }
  return out;
}

async function firmsPublic(): Promise<FireEvent[]> {
  const res = await Promise.allSettled(FIRMS_PUBLIC.map(([sat, url]) => fetchText(url, { timeoutMs: 45000 }).then((csv) => parseFirmsCsv(csv, sat))));
  if (res.every((r) => r.status === "rejected")) throw new Error("FIRMS erişilemedi");
  const seen = new Set<string>();
  return res
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

async function firmsKeyed(key: string): Promise<FireEvent[]> {
  const area = `${TR_BBOX.minLon},${TR_BBOX.minLat},${TR_BBOX.maxLon},${TR_BBOX.maxLat}`;
  const csv = await fetchText(
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/VIIRS_SNPP_NRT/${area}/2`,
    { timeoutMs: 30000 },
  );
  return parseFirmsCsv(csv, "S-NPP");
}

type Eonet = {
  events: { id: string; title: string; link: string; geometry: { date: string; type: string; coordinates: number[] }[] }[];
};

async function eonet(): Promise<FireEvent[]> {
  const bbox = `${TR_BBOX.minLon},${TR_BBOX.maxLat},${TR_BBOX.maxLon},${TR_BBOX.minLat}`;
  const j = await fetchJson<Eonet>(`https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&days=30&bbox=${bbox}`, {
    timeoutMs: 20000,
  });
  return j.events.flatMap((e) => {
    const g = e.geometry.at(-1);
    if (!g || g.type !== "Point") return [];
    const [lon, lat] = g.coordinates;
    const plate = provinceAt(lon, lat);
    if (plate == null) return [];
    return [{ id: e.id, source: "EONET" as const, title: e.title, lat, lon, plate, time: g.date, link: e.link }];
  });
}

export async function GET() {
  try {
    const key = process.env.FIRMS_API_KEY;
    const c = await cached("fires:v2", 15 * 60_000, async () => {
      const [firms, ev] = await Promise.allSettled([key ? firmsKeyed(key).catch(firmsPublic) : firmsPublic(), eonet()]);
      if (firms.status === "rejected" && ev.status === "rejected") throw firms.reason;
      const hotspots = firms.status === "fulfilled" ? firms.value : [];
      return {
        firmsMode: key ? "api-48h" : "public-24h",
        events: [...(ev.status === "fulfilled" ? ev.value : []), ...hotspots],
      };
    });
    return envelope(c);
  } catch (e) {
    return failure(e);
  }
}
