import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cached } from "@/lib/cache";
import { fetchJson, fetchText } from "@/lib/http";
import { allStops, fleetPositions } from "@/lib/iett";
import cameras from "@/data/cameras.json";

/**
 * Veri seti yükleyicileri. Her biri normalize edilmiş bir GeoJSON FeatureCollection döndürür.
 * Özellik adları meta.ts'deki `fields` anahtarlarıyla eşleşir; `_id` benzersiz kimliktir.
 */

type FC = GeoJSON.FeatureCollection<GeoJSON.Point>;
type Props = Record<string, string | number | boolean | null>;

const point = (lon: number, lat: number, props: Props): GeoJSON.Feature<GeoJSON.Point> => ({
  type: "Feature",
  properties: props,
  geometry: { type: "Point", coordinates: [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5] },
});
const fc = (features: GeoJSON.Feature<GeoJSON.Point>[]): FC => ({ type: "FeatureCollection", features });
const okCoord = (lon: number, lat: number) => Number.isFinite(lon) && Number.isFinite(lat) && lon > 25 && lon < 45.5 && lat > 35 && lat < 42.5;

function parseCsv(text: string, sep: string) {
  const [head, ...rows] = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const cols = head.split(sep).map((c) => c.trim());
  return rows.map((r) => {
    const v = r.split(sep);
    return Object.fromEntries(cols.map((c, i) => [c, (v[i] ?? "").trim()])) as Record<string, string>;
  });
}

// ---------------------------------------------------------------------------

type Loader = { ttlMs: number; load: () => Promise<FC> };

export const LOADERS: Record<string, Loader> = {
  "iett-buses": {
    ttlMs: 20_000,
    async load() {
      const { data } = await fleetPositions();
      return fc(
        data.flatMap((v) => {
          const lon = Number(v.Boylam), lat = Number(v.Enlem);
          if (!okCoord(lon, lat)) return [];
          const hiz = Number(v.Hiz) || 0;
          return [
            point(lon, lat, {
              _id: v.KapiNo,
              kapiNo: v.KapiNo,
              plaka: v.Plaka,
              operator: v.Operator,
              hiz,
              hareketli: hiz > 0,
              saat: v.Saat,
            }),
          ];
        }),
      );
    },
  },

  "iett-stops": {
    ttlMs: 24 * 3_600_000,
    async load() {
      const { data } = await allStops();
      return fc(
        data.flatMap((s) => {
          const m = s.KOORDINAT.match(/POINT \(([\d.]+) ([\d.]+)\)/);
          if (!m) return [];
          const lon = Number(m[1]), lat = Number(m[2]);
          if (!okCoord(lon, lat)) return [];
          return [
            point(lon, lat, {
              _id: String(s.SDURAKKODU),
              kod: String(s.SDURAKKODU),
              ad: s.SDURAKADI,
              ilce: s.ILCEADI,
              yon: s.SYON,
              tip: s.DURAK_TIPI,
              engelli: s.ENGELLIKULLANIM,
              akilli: s.AKILLI,
            }),
          ];
        }),
      );
    },
  },

  "izmir-stops": {
    ttlMs: 24 * 3_600_000,
    async load() {
      const file = path.join(process.cwd(), "public", "transit", "izmir", "stops.json");
      const rows = JSON.parse(readFileSync(file, "utf8")) as [number, string, number, number, string][];
      return fc(rows.map(([id, ad, lat, lon, hatlar]) => point(lon, lat, { _id: String(id), kod: String(id), ad, hatlar: hatlar.replace(/-/g, ", ") })));
    },
  },

  ispark: {
    ttlMs: 120_000,
    async load() {
      type P = {
        parkID: number; parkName: string; lat: string; lng: string; capacity: number; emptyCapacity: number;
        workHours: string; parkType: string; freeTime: number; district: string; isOpen: number;
      };
      const rows = await fetchJson<P[]>("https://api.ibb.gov.tr/ispark/Park", { timeoutMs: 20000 });
      return fc(
        rows.flatMap((p) => {
          const lon = Number(p.lng), lat = Number(p.lat);
          if (!okCoord(lon, lat)) return [];
          const doluluk = p.capacity > 0 ? Math.round(((p.capacity - p.emptyCapacity) / p.capacity) * 100) : null;
          return [
            point(lon, lat, {
              _id: String(p.parkID),
              ad: p.parkName,
              ilce: p.district,
              tip: p.parkType,
              kapasite: p.capacity,
              bos: p.emptyCapacity,
              doluluk,
              ucretsizDk: p.freeTime,
              calisma: p.workHours,
              acik: p.isOpen === 1,
            }),
          ];
        }),
      );
    },
  },

  "izmir-otopark": {
    ttlMs: 120_000,
    async load() {
      type P = {
        ufid: string; name: string; lat: number; lng: number; type: string; isPaid: boolean; provider: string;
        occupancy?: { total?: { free?: number; occupied?: number } };
      };
      const rows = await fetchJson<P[]>("https://openapi.izmir.bel.tr/api/ibb/izum/otoparklar", { timeoutMs: 30000 });
      return fc(
        rows.flatMap((p) => {
          if (!okCoord(p.lng, p.lat)) return [];
          const free = p.occupancy?.total?.free ?? null;
          const occ = p.occupancy?.total?.occupied ?? null;
          const cap = free != null && occ != null ? free + occ : null;
          return [
            point(p.lng, p.lat, {
              _id: p.ufid,
              ad: p.name,
              bos: free,
              kapasite: cap,
              doluluk: cap ? Math.round(((occ ?? 0) / cap) * 100) : null,
              tur: p.type === "OnStreet" ? "Yol kenarı" : p.type === "OffStreet" ? "Kapalı/açık alan" : p.type,
              ucretli: p.isPaid,
              isletmeci: p.provider,
            }),
          ];
        }),
      );
    },
  },

  cameras: {
    ttlMs: 24 * 3_600_000,
    async load() {
      return fc(
        cameras.flatMap((c) =>
          c.lat != null && c.lon != null
            ? [
                point(c.lon, c.lat, {
                  _id: c.id,
                  name: c.name,
                  city: c.city,
                  provider: c.provider,
                  kind: "note" in c && c.note ? "closed" : c.kind,
                  page: c.page,
                }),
              ]
            : [],
        ),
      );
    },
  },

  "izmir-toplanma": {
    ttlMs: 24 * 3_600_000,
    async load() {
      const text = await fetchText("https://openfiles.izmir.bel.tr/100104/docs/izbb-afet-ve-acil-durum-toplanma-alanlari.csv", { timeoutMs: 60000 });
      return fc(
        parseCsv(text, ";").flatMap((r, i) => {
          const lat = Number(r.ENLEM?.replace(",", ".")), lon = Number(r.BOYLAM?.replace(",", "."));
          if (!okCoord(lon, lat)) return [];
          return [point(lon, lat, { _id: `${r.ACIKLAMA || i}`, ad: r.ADI, ilce: r.ILCE, mahalle: r.MAHALLE, yol: r.YOL })];
        }),
      );
    },
  },

  "izmir-eczane": {
    ttlMs: 3_600_000,
    async load() {
      type E = { LokasyonX: string; LokasyonY: string; Adi: string; Telefon: string; Adres: string; Bolge: string; BolgeAciklama: string };
      const rows = await fetchJson<E[]>("https://openapi.izmir.bel.tr/api/ibb/nobetcieczaneler", { timeoutMs: 30000 });
      return fc(
        rows.flatMap((e, i) => {
          // Not: servis LokasyonX'i enlem, LokasyonY'yi boylam olarak döndürüyor
          const lat = Number(e.LokasyonX), lon = Number(e.LokasyonY);
          if (!okCoord(lon, lat)) return [];
          return [point(lon, lat, { _id: `${i}-${e.Adi}`, ad: e.Adi, bolge: e.Bolge, adres: e.Adres, telefon: e.Telefon, not: e.BolgeAciklama })];
        }),
      );
    },
  },

  "ibb-wifi": {
    ttlMs: 24 * 3_600_000,
    async load() {
      const text = await fetchText(
        "https://data.ibb.gov.tr/dataset/e6810baa-4f41-489d-8d97-42a957fcae49/resource/5d0a0b1e-9e56-4038-b966-7d3e7b46f882/download/ibb_wifi_location.csv",
        { timeoutMs: 60000 },
      );
      return fc(
        parseCsv(text, ",").flatMap((r) => {
          const lat = Number(r.latitude), lon = Number(r.longitude);
          if (!okCoord(lon, lat)) return [];
          return [point(lon, lat, { _id: r.location_code, ad: r.location, grup: r.location_group, tip: r.location_type })];
        }),
      );
    },
  },
};

export function loadDataset(id: string) {
  const l = LOADERS[id];
  if (!l) return null;
  return cached(`ds:${id}`, l.ttlMs, l.load);
}
