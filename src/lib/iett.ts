import "server-only";
import { cached } from "./cache";
import { fetchWithTimeout } from "./http";

/**
 * İBB / İETT SOAP web servisleri (anahtarsız, İBB Açık Veri Lisansı).
 * https://data.ibb.gov.tr/dataset/sefer-gerceklesme-web-servisi
 */

const FILO = "https://api.ibb.gov.tr/iett/FiloDurum/SeferGerceklesme.asmx";
const IBB = "https://api.ibb.gov.tr/iett/ibb/ibb.asmx";
const ANAVERI = "https://api.ibb.gov.tr/iett/UlasimAnaVeri/HatDurakGuzergah.asmx";

const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

async function soap(url: string, op: string, params: Record<string, string> = {}, timeoutMs = 30000) {
  const body = Object.entries(params)
    .map(([k, v]) => `<${k}>${xmlEscape(v)}</${k}>`)
    .join("");
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${op} xmlns="http://tempuri.org/">${body}</${op}></soap:Body></soap:Envelope>`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: `"http://tempuri.org/${op}"` },
    body: envelope,
    timeoutMs,
  });
  return res.text();
}

/** *_json operasyonları JSON'u bir XML elemanı içinde döndürür. */
async function soapJson<T>(url: string, op: string, params: Record<string, string> = {}, timeoutMs?: number): Promise<T> {
  const xml = await soap(url, op, params, timeoutMs);
  const m = xml.match(new RegExp(`<${op}Result>([\\s\\S]*)</${op}Result>`));
  if (!m) throw new Error(`${op}: beklenmeyen yanıt`);
  const raw = m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  return JSON.parse(raw) as T;
}

// ---------------------------------------------------------------------------

export type IettVehicle = {
  Operator: string;
  Garaj: string | null;
  KapiNo: string;
  Saat: string;
  Boylam: string;
  Enlem: string;
  Hiz: string;
  Plaka: string;
};

export function fleetPositions() {
  return cached("iett:fleet", 20_000, () => soapJson<IettVehicle[]>(FILO, "GetFiloAracKonum_json", {}, 40000));
}

export type IettLine = { SHATKODU: string; SHATADI: string; TARIFE: string; HAT_UZUNLUGU: number; SEFER_SURESI: number };

export function allLines() {
  return cached("iett:lines", 12 * 3_600_000, () => soapJson<IettLine[]>(ANAVERI, "GetHat_json", { HatKodu: "" }, 60000));
}

export type IettStop = {
  SDURAKKODU: number;
  SDURAKADI: string;
  KOORDINAT: string; // "POINT (lon lat)"
  ILCEADI: string;
  SYON: string;
  AKILLI: string;
  FIZIKI: string;
  DURAK_TIPI: string;
  ENGELLIKULLANIM: string;
};

export function allStops() {
  return cached("iett:stops", 24 * 3_600_000, () => soapJson<IettStop[]>(ANAVERI, "GetDurak_json", { DurakKodu: "" }, 90000));
}

export type LineVehicle = {
  kapino: string;
  boylam: string;
  enlem: string;
  hatkodu: string;
  guzergahkodu: string;
  hatad: string;
  yon: string;
  son_konum_zamani: string;
  yakinDurakKodu: string;
};

export function lineVehicles(code: string) {
  return cached(`iett:linebus:${code}`, 15_000, () => soapJson<LineVehicle[]>(FILO, "GetHatOtoKonum_json", { HatKodu: code }));
}

export type LineStop = { yon: string; sira: number; kod: string; ad: string; lat: number; lon: number; ilce: string };

/** Hattın duraklarını sıralı döndürür (DurakDetay_GYY — XML DataSet). */
export function lineStops(code: string) {
  return cached(`iett:linestops:${code}`, 6 * 3_600_000, async () => {
    const xml = await soap(IBB, "DurakDetay_GYY", { hat_kodu: code });
    const tag = (block: string, t: string) => block.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1] ?? "";
    const stops: LineStop[] = [];
    for (const m of xml.matchAll(/<Table>([\s\S]*?)<\/Table>/g)) {
      const b = m[1];
      stops.push({
        yon: tag(b, "YON"),
        sira: Number(tag(b, "SIRANO")),
        kod: tag(b, "DURAKKODU"),
        ad: tag(b, "DURAKADI"),
        lon: Number(tag(b, "XKOORDINATI")),
        lat: Number(tag(b, "YKOORDINATI")),
        ilce: tag(b, "ILCEADI"),
      });
    }
    return stops.sort((a, b) => a.yon.localeCompare(b.yon) || a.sira - b.sira);
  });
}
