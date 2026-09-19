import { cached } from "@/lib/cache";
import { envelope, failure, fetchJson } from "@/lib/http";
import { TR_BBOX } from "@/data/provinces";
import type { Aircraft } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Türkiye hava sahası ve çevresi hava trafiği.
 * OpenSky (tek bbox sorgusu) ve adsb.lol (tip, tescil, askerî bayrak) paralel sorgulanır,
 * ICAO24 kimliğine göre birleştirilir.
 */

const EMERGENCY_SQUAWKS = new Set(["7500", "7600", "7700"]);
const inBox = (lat: number, lon: number) =>
  lat >= TR_BBOX.minLat && lat <= TR_BBOX.maxLat && lon >= TR_BBOX.minLon && lon <= TR_BBOX.maxLon;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- OpenSky Network ----------
type OpenSkyState = [
  string, string | null, string, number | null, number, number | null, number | null,
  number | null, boolean, number | null, number | null, number | null, unknown,
  number | null, string | null, boolean, number,
];

let openskyToken: { value: string; exp: number } | null = null;

async function openskyAuthHeader(): Promise<Record<string, string>> {
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return {};
  if (!openskyToken || openskyToken.exp < Date.now() + 30_000) {
    const res = await fetch("https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
    });
    if (!res.ok) return {};
    const j = (await res.json()) as { access_token: string; expires_in: number };
    openskyToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  }
  return { Authorization: `Bearer ${openskyToken.value}` };
}

async function fromOpenSky(): Promise<Aircraft[]> {
  const qs = `lamin=${TR_BBOX.minLat}&lomin=${TR_BBOX.minLon}&lamax=${TR_BBOX.maxLat}&lomax=${TR_BBOX.maxLon}`;
  const j = await fetchJson<{ states: OpenSkyState[] | null }>(`https://opensky-network.org/api/states/all?${qs}`, {
    headers: await openskyAuthHeader(),
    timeoutMs: 15000,
  });
  return (j.states ?? [])
    .filter((s) => s[5] != null && s[6] != null)
    .map((s) => {
      const squawk = s[14] ?? undefined;
      return {
        id: s[0].toLowerCase(),
        callsign: (s[1] ?? "").trim() || s[0].toUpperCase(),
        country: s[2],
        lon: s[5]!,
        lat: s[6]!,
        altM: s[13] ?? s[7],
        onGround: s[8],
        speedKmh: s[9] != null ? Math.round(s[9] * 3.6) : null,
        heading: s[10],
        vrateMs: s[11],
        squawk,
        military: false,
        emergency: squawk ? EMERGENCY_SQUAWKS.has(squawk) : false,
      };
    });
}

// ---------- adsb.lol (ADS-B Exchange uyumlu v2 API) ----------
type AdsbAc = {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  alt_geom?: number;
  gs?: number;
  track?: number;
  baro_rate?: number;
  squawk?: string;
  emergency?: string;
  dbFlags?: number;
};

// Türkiye'yi 250 NM yarıçaplı dairelerle kaplayan noktalar
const ADSB_POINTS: [number, number][] = [
  [40.5, 28.5],
  [38.0, 29.5],
  [39.5, 33.5],
  [37.2, 35.5],
  [40.5, 38.5],
  [38.5, 42.0],
];

async function fromAdsbLol(): Promise<Aircraft[]> {
  // Hız sınırına (HTTP 420) takılmamak için istekler kademeli gönderilir.
  const results = await Promise.allSettled(
    ADSB_POINTS.map(async ([lat, lon], i) => {
      await sleep(i * 350);
      return fetchJson<{ ac: AdsbAc[] }>(`https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/250`, { timeoutMs: 15000 });
    }),
  );
  const seen = new Map<string, Aircraft>();
  let okCount = 0;
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    okCount++;
    for (const a of r.value.ac ?? []) {
      if (a.lat == null || a.lon == null || seen.has(a.hex) || !inBox(a.lat, a.lon)) continue;
      const ground = a.alt_baro === "ground";
      const altFt = typeof a.alt_baro === "number" ? a.alt_baro : a.alt_geom;
      seen.set(a.hex, {
        id: a.hex.toLowerCase(),
        callsign: (a.flight ?? "").trim() || a.r || a.hex.toUpperCase(),
        reg: a.r,
        type: a.t,
        lat: a.lat,
        lon: a.lon,
        altM: ground ? 0 : altFt != null ? Math.round(altFt * 0.3048) : null,
        onGround: ground,
        speedKmh: a.gs != null ? Math.round(a.gs * 1.852) : null,
        heading: a.track ?? null,
        vrateMs: a.baro_rate != null ? +(a.baro_rate * 0.00508).toFixed(1) : null,
        squawk: a.squawk,
        military: ((a.dbFlags ?? 0) & 1) === 1,
        emergency: Boolean(a.emergency && a.emergency !== "none") || (a.squawk ? EMERGENCY_SQUAWKS.has(a.squawk) : false),
      });
    }
  }
  if (okCount === 0) throw new Error("adsb.lol erişilemedi");
  return [...seen.values()];
}

export async function GET() {
  try {
    const c = await cached("flights", 20_000, async () => {
      const [adsb, osky] = await Promise.allSettled([fromAdsbLol(), fromOpenSky()]);
      if (adsb.status === "rejected" && osky.status === "rejected") {
        throw new Error(`adsb.lol: ${adsb.reason} | OpenSky: ${osky.reason}`);
      }
      const merged = new Map<string, Aircraft>();
      // adsb.lol kaydı daha zengin (tip/tescil/askerî) olduğu için öncelikli
      if (adsb.status === "fulfilled") for (const a of adsb.value) merged.set(a.id, a);
      if (osky.status === "fulfilled")
        for (const a of osky.value) {
          const prev = merged.get(a.id);
          merged.set(a.id, prev ? { ...a, ...prev, country: a.country } : a);
        }
      const providers = [adsb.status === "fulfilled" && "adsb.lol", osky.status === "fulfilled" && "OpenSky"].filter(Boolean);
      return { provider: providers.join(" + "), aircraft: [...merged.values()] };
    });
    return envelope(c);
  } catch (e) {
    return failure(e);
  }
}
