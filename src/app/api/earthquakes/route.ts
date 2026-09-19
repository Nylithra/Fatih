import { NextRequest } from "next/server";
import { cached } from "@/lib/cache";
import { envelope, failure, fetchJson } from "@/lib/http";
import { TR_BBOX, PROVINCE_BY_PLATE, provinceByName } from "@/data/provinces";
import { provinceAt } from "@/lib/pip";
import type { Earthquake } from "@/lib/types";

export const dynamic = "force-dynamic";

type AfadEvent = {
  eventID: string;
  location: string;
  latitude: string;
  longitude: string;
  depth: string;
  type: string;
  magnitude: string;
  province?: string | null;
  date: string;
};

type KandilliResp = {
  result: {
    earthquake_id: string;
    title: string;
    mag: number;
    depth: number;
    geojson: { coordinates: [number, number] };
    date_time: string; // İstanbul yerel saati
  }[];
};

type UsgsResp = {
  features: {
    id: string;
    properties: { mag: number; magType: string; place: string; time: number };
    geometry: { coordinates: [number, number, number] };
  }[];
};

// AFAD tarih biçimi: "YYYY-MM-DD HH:mm:ss" (UTC)
const afadDate = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

async function fromAfad(days: number): Promise<Earthquake[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  const qs = new URLSearchParams({
    start: afadDate(start),
    end: afadDate(end),
    minlat: String(TR_BBOX.minLat),
    maxlat: String(TR_BBOX.maxLat),
    minlon: String(TR_BBOX.minLon),
    maxlon: String(TR_BBOX.maxLon),
    orderby: "timedesc",
    format: "json",
  });
  const rows = await fetchJson<AfadEvent[]>(
    `https://servisnet.afad.gov.tr/apigateway/deprem/apiv2/event/filter?${qs}`,
    { timeoutMs: 20000 },
  );
  return rows.map((r) => ({
    id: `afad-${r.eventID}`,
    source: "AFAD" as const,
    mag: Number(r.magnitude),
    magType: r.type,
    depthKm: Number(r.depth),
    lat: Number(r.latitude),
    lon: Number(r.longitude),
    place: r.location,
    province: provinceByName(r.province)?.name ?? r.province ?? undefined,
    time: new Date(r.date + "Z").toISOString(),
  }));
}

async function fromKandilli(): Promise<Earthquake[]> {
  const j = await fetchJson<KandilliResp>("https://api.orhanaydogdu.com.tr/deprem/kandilli/live?limit=500");
  return j.result.map((r) => ({
    id: `kan-${r.earthquake_id}`,
    source: "Kandilli" as const,
    mag: r.mag,
    depthKm: r.depth,
    lon: r.geojson.coordinates[0],
    lat: r.geojson.coordinates[1],
    place: r.title,
    time: new Date(r.date_time.replace(" ", "T") + "+03:00").toISOString(),
  }));
}

async function fromUsgs(days: number): Promise<Earthquake[]> {
  const start = new Date(Date.now() - days * 86400_000).toISOString();
  const qs = new URLSearchParams({
    format: "geojson",
    starttime: start,
    minlatitude: String(TR_BBOX.minLat),
    maxlatitude: String(TR_BBOX.maxLat),
    minlongitude: String(TR_BBOX.minLon),
    maxlongitude: String(TR_BBOX.maxLon),
    minmagnitude: "2",
  });
  const j = await fetchJson<UsgsResp>(`https://earthquake.usgs.gov/fdsnws/event/1/query?${qs}`);
  return j.features.map((f) => ({
    id: `usgs-${f.id}`,
    source: "USGS" as const,
    mag: f.properties.mag,
    magType: f.properties.magType,
    depthKm: f.geometry.coordinates[2],
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    place: f.properties.place,
    time: new Date(f.properties.time).toISOString(),
  }));
}

export async function GET(req: NextRequest) {
  const days = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 2) || 2));
  try {
    const c = await cached(`eq:${days}`, 60_000, async () => {
      // Birincil: AFAD. Erişilemezse Kandilli, o da yoksa USGS.
      const chain: [string, () => Promise<Earthquake[]>][] = [
        ["AFAD", () => fromAfad(days)],
        ["Kandilli", fromKandilli],
        ["USGS", () => fromUsgs(days)],
      ];
      const errors: string[] = [];
      for (const [name, fn] of chain) {
        try {
          const list = await fn();
          for (const q of list) {
            q.plate = provinceAt(q.lon, q.lat) ?? provinceByName(q.province)?.plate;
            if (q.plate && !q.province) q.province = PROVINCE_BY_PLATE.get(q.plate)?.name;
          }
          list.sort((a, b) => b.time.localeCompare(a.time));
          return { provider: name, events: list, errors };
        } catch (e) {
          errors.push(`${name}: ${e instanceof Error ? e.message : e}`);
        }
      }
      throw new Error(errors.join(" | "));
    });
    return envelope(c, { days });
  } catch (e) {
    return failure(e);
  }
}
