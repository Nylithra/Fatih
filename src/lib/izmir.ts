import "server-only";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { cached } from "./cache";
import { fetchJson } from "./http";

/** ESHOT (İzmir) hat verileri: statik dosyalar tools/build-izmir-transit.mjs ile üretilir. */

const DIR = path.join(process.cwd(), "public", "transit", "izmir");

export type IzmirLine = { no: string; name: string; from: string; to: string; via: string };

let linesCache: IzmirLine[] | null = null;
export function izmirLines(): IzmirLine[] {
  if (!linesCache) {
    const f = path.join(DIR, "lines.json");
    linesCache = existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as IzmirLine[]) : [];
  }
  return linesCache;
}

let stopsCache: [number, string, number, number, string][] | null = null;
export function izmirStops() {
  if (!stopsCache) {
    const f = path.join(DIR, "stops.json");
    stopsCache = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : [];
  }
  return stopsCache!;
}

export function izmirRoute(no: string): Record<string, [number, number][]> | null {
  const f = path.join(DIR, "routes", `${encodeURIComponent(no)}.json`);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

type IzmirBus = { OtobusId: number; Yon: number; KoorX: string; KoorY: string };

export function izmirLineVehicles(no: string) {
  return cached(`izmir:linebus:${no}`, 15_000, async () => {
    const j = await fetchJson<{ HatOtobusKonumlari: IzmirBus[] | null; HataVarMi: boolean; HataMesaj: string }>(
      `https://openapi.izmir.bel.tr/api/iztek/hatotobuskonumlari/${encodeURIComponent(no)}`,
      { timeoutMs: 15000 },
    );
    if (j.HataVarMi) throw new Error(j.HataMesaj || "ESHOT servisi hata döndürdü");
    // Not: servis KoorX'i enlem, KoorY'yi boylam olarak ve virgüllü ondalıkla döndürüyor
    return (j.HatOtobusKonumlari ?? []).map((b) => ({
      id: String(b.OtobusId),
      lat: Number(b.KoorX.replace(",", ".")),
      lon: Number(b.KoorY.replace(",", ".")),
      yon: b.Yon,
    }));
  });
}
