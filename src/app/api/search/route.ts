import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { allLines, allStops } from "@/lib/iett";
import { izmirLines, izmirStops } from "@/lib/izmir";
import { loadDataset } from "@/catalog/loaders";
import { fold, matchScore } from "@/lib/text";
import cameras from "@/data/cameras.json";

export const dynamic = "force-dynamic";

/**
 * Birleşik sunucu araması: ilçeler, otobüs hatları (İETT, ESHOT), duraklar,
 * raylı sistem istasyonları, kameralar, otoparklar.
 * İller, uçaklar, depremler ve haberler istemci tarafında aranır.
 */

export type SearchHit = {
  kind: "district" | "line" | "stop" | "station" | "camera" | "parking" | "hospital";
  id: string;
  title: string;
  subtitle: string;
  score: number;
  lat?: number;
  lon?: number;
  city?: "istanbul" | "izmir";
  code?: string;
  dataset?: string;
};

type District = { name: string; lat: number; lon: number };
type StationFC = GeoJSON.FeatureCollection<GeoJSON.Point, { id: string; mode: string; name: string; operator: string }>;

let districts: District[] | null = null;
let stations: StationFC | null = null;
type HospitalFC = GeoJSON.FeatureCollection<GeoJSON.Point, { _id: string; ad: string; il: string; ilce: string; tur: string; acil: boolean | null }>;
let hospitals: HospitalFC | null = null;
const readPublic = <T,>(rel: string): T | null => {
  const f = path.join(process.cwd(), "public", rel);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as T) : null;
};

const MODE_TR: Record<string, string> = {
  metro: "Metro", hafif_rayli: "Hafif raylı", tramvay: "Tramvay", funikuler: "Füniküler", teleferik: "Teleferik", tren: "Tren", vapur: "İskele",
};

export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const q = fold(raw);
  if (q.length < 2) return NextResponse.json({ ok: true, data: [] });

  const hits: SearchHit[] = [];
  const push = (h: SearchHit) => h.score > 0 && hits.push(h);

  // İlçeler
  districts ??= readPublic<District[]>("geo/tr-ilceler.json") ?? [];
  for (const d of districts) {
    const sc = matchScore(d.name, q);
    if (sc) push({ kind: "district", id: `d-${d.name}-${d.lat}`, title: d.name, subtitle: "İlçe", score: sc + 5, lat: d.lat, lon: d.lon });
  }

  // Otobüs hatları — hat kodu tam/önek eşleşmesi öncelikli
  const [iettLines, iettStops] = await Promise.allSettled([allLines(), allStops()]);
  if (iettLines.status === "fulfilled") {
    for (const l of iettLines.value.data) {
      const s = Math.max(matchScore(l.SHATKODU, q) * 1.2, matchScore(l.SHATADI, q) * 0.8);
      push({ kind: "line", id: `iett-${l.SHATKODU}`, title: l.SHATKODU, subtitle: `İETT · ${l.SHATADI}`, score: s, city: "istanbul", code: l.SHATKODU });
    }
  }
  for (const l of izmirLines()) {
    const s = Math.max(matchScore(l.no, q) * 1.2, matchScore(l.name, q) * 0.8);
    push({ kind: "line", id: `izmir-${l.no}`, title: l.no, subtitle: `ESHOT · ${l.name}`, score: s, city: "izmir", code: l.no });
  }

  // Duraklar
  if (iettStops.status === "fulfilled") {
    for (const s of iettStops.value.data) {
      const sc = matchScore(s.SDURAKADI, q) * 0.6;
      if (!sc) continue;
      const m = s.KOORDINAT.match(/POINT \(([\d.]+) ([\d.]+)\)/);
      if (!m) continue;
      push({ kind: "stop", id: `iett-stop-${s.SDURAKKODU}`, title: s.SDURAKADI, subtitle: `İETT durağı · ${s.ILCEADI} · ${s.SYON} yönü`, score: sc, lon: +m[1], lat: +m[2], dataset: "iett-stops" });
    }
  }
  for (const [id, name, lat, lon, lines] of izmirStops()) {
    const sc = matchScore(name, q) * 0.6;
    if (sc) push({ kind: "stop", id: `izmir-stop-${id}`, title: name, subtitle: `ESHOT durağı · hatlar: ${lines.replace(/-/g, ", ").slice(0, 60)}`, score: sc, lat, lon, dataset: "izmir-stops" });
  }

  // Raylı sistem istasyonları / iskeleler
  stations ??= readPublic<StationFC>("geo/transit-stations.geojson");
  for (const f of stations?.features ?? []) {
    const sc = matchScore(f.properties.name, q) * 0.9;
    if (sc)
      push({
        kind: "station",
        id: `st-${f.properties.id}`,
        title: f.properties.name,
        subtitle: `${MODE_TR[f.properties.mode] ?? "İstasyon"}${f.properties.operator ? " · " + f.properties.operator : ""}`,
        score: sc,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        dataset: "transit-stations",
      });
  }

  // Hastaneler — "ankara hastane", "kadıköy devlet" gibi çok kelimeli aramalar için kelime bazlı eşleşme
  hospitals ??= readPublic<HospitalFC>("geo/hospitals.geojson");
  const tokens = q.split(" ").filter((t) => t.length > 1 && !["hastane", "hastanesi", "hastaneleri"].includes(t));
  const wantsHospital = /hastane/.test(q);
  for (const h of hospitals?.features ?? []) {
    const p = h.properties;
    const hay = fold(`${p.ad} ${p.il} ${p.ilce} ${p.tur}`);
    let sc = matchScore(p.ad, q);
    if (!sc && tokens.length && tokens.every((t) => hay.includes(t))) sc = wantsHospital ? 55 : 35;
    if (sc)
      push({
        kind: "hospital",
        id: `h-${p._id}`,
        title: p.ad,
        subtitle: `Hastane · ${p.tur} · ${p.ilce ? p.ilce + ", " : ""}${p.il}${p.acil ? " · acil servis" : ""}`,
        score: sc,
        lon: h.geometry.coordinates[0],
        lat: h.geometry.coordinates[1],
        dataset: "hospitals",
      });
  }

  // Kameralar
  for (const c of cameras) {
    const sc = Math.max(matchScore(c.name, q), matchScore(`kamera ${c.city}`, q) * 0.7);
    if (sc && c.lat != null && c.lon != null) push({ kind: "camera", id: c.id, title: c.name, subtitle: `Kamera · ${c.provider}`, score: sc + 10, lat: c.lat, lon: c.lon, dataset: "cameras" });
  }

  // İSPARK
  try {
    const park = await loadDataset("ispark");
    for (const f of park?.data.features ?? []) {
      const p = f.properties as Record<string, string | number>;
      const sc = Math.max(matchScore(String(p.ad), q), matchScore(`otopark ${p.ilce}`, q) * 0.6) * 0.7;
      if (sc) push({ kind: "parking", id: `park-${p._id}`, title: String(p.ad), subtitle: `İSPARK · ${p.ilce} · ${p.bos}/${p.kapasite} boş`, score: sc, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], dataset: "ispark" });
    }
  } catch {
    /* otopark servisi erişilemezse aramayı engelleme */
  }

  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "tr"));
  // Tür başına sınır: sonuç listesi tek türle dolmasın
  const perKind = new Map<string, number>();
  const out = hits.filter((h) => {
    const n = perKind.get(h.kind) ?? 0;
    perKind.set(h.kind, n + 1);
    return n < 8;
  });
  return NextResponse.json({ ok: true, data: out.slice(0, 30) });
}
