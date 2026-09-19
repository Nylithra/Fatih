// Türkiye geneli raylı sistem ve deniz ulaşımı hatlarını OpenStreetMap'ten (Overpass API) derler.
// Çıktılar (© OpenStreetMap katkıcıları, ODbL):
//   public/geo/transit-lines.geojson    — metro, hafif raylı, tramvay, füniküler, teleferik, tren, vapur hatları
//   public/geo/transit-stations.geojson — istasyonlar, duraklar, iskeleler
// Kullanım: node tools/build-transit.mjs
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Ara sonuçlar tools/raw/ altında önbelleklenir; yeniden çalıştırmada tekrar indirilmez.
async function cachedOverpass(name, query) {
  const file = new URL(`./raw/osm-${name}.json`, import.meta.url);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const j = await overpass(query);
      mkdirSync(new URL("./raw/", import.meta.url), { recursive: true });
      writeFileSync(file, JSON.stringify(j));
      return j;
    } catch (e) {
      console.warn(`${name}: deneme ${attempt + 1} başarısız, bekleniyor…`);
      await sleep(20000 * (attempt + 1));
    }
  }
  throw new Error(`${name} indirilemedi`);
}

async function overpass(query) {
  let lastErr;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "FATIH-OSINT/0.1" },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      console.warn(`Overpass hatası (${url}):`, e.message);
    }
  }
  throw lastErr;
}

const AREA = `area["ISO3166-1"="TR"][admin_level=2]->.tr;`;
const r5 = (n) => Math.round(n * 1e5) / 1e5;

const MODE = {
  subway: "metro",
  light_rail: "hafif_rayli",
  tram: "tramvay",
  monorail: "monoray",
  funicular: "funikuler",
  aerialway: "teleferik",
  train: "tren",
  ferry: "vapur",
};

console.log("Hatlar sorgulanıyor…");
const lines = await cachedOverpass("lines", `[out:json][timeout:300];${AREA}
(
  relation["type"="route"]["route"~"^(subway|light_rail|tram|monorail|funicular|train|ferry)$"](area.tr);
  way["aerialway"~"^(cable_car|gondola)$"](area.tr);
);
out geom;`);

const features = [];
const seenWays = new Map(); // tren hatlarında aynı rayı paylaşan ilişkileri tekilleştirmek için
for (const el of lines.elements) {
  const t = el.tags ?? {};
  if (el.type === "way") {
    if (!el.geometry) continue;
    features.push({
      type: "Feature",
      properties: { id: `w${el.id}`, mode: "teleferik", name: t.name ?? "Teleferik", ref: t.ref ?? "", colour: "#e9c46a", operator: t.operator ?? "" },
      geometry: { type: "LineString", coordinates: el.geometry.map((p) => [r5(p.lon), r5(p.lat)]) },
    });
    continue;
  }
  const mode = MODE[t.route];
  if (!mode) continue;
  const parts = [];
  for (const m of el.members ?? []) {
    if (m.type !== "way" || !m.geometry || (m.role && m.role !== "" && !/^(forward|backward|main)$/.test(m.role))) continue;
    // Tren hatlarında aynı yolu birden fazla ilişki kullanır: tek sefer çiz
    if (mode === "tren") {
      if (seenWays.has(m.ref)) continue;
      seenWays.set(m.ref, true);
    }
    parts.push(m.geometry.map((p) => [r5(p.lon), r5(p.lat)]));
  }
  if (!parts.length) continue;
  // Uluslararası feribot/tren hatlarının Türkiye dışına taşan kısımlarını çizme
  const inTR = ([x, y]) => x >= 25.5 && x <= 45 && y >= 35.5 && y <= 42.2;
  if (mode === "vapur" && parts.some((p) => p.some((c) => !inTR(c)))) continue;
  if (mode === "tren") for (let i = parts.length - 1; i >= 0; i--) if (!parts[i].some(inTR)) parts.splice(i, 1);
  if (!parts.length) continue;
  features.push({
    type: "Feature",
    properties: {
      id: `r${el.id}`,
      mode,
      name: t.name ?? t["name:tr"] ?? t.ref ?? "",
      ref: t.ref ?? "",
      colour: t.colour ?? "",
      operator: t.operator ?? t.network ?? "",
      from: t.from ?? "",
      to: t.to ?? "",
    },
    geometry: { type: "MultiLineString", coordinates: parts },
  });
}

console.log("İstasyonlar sorgulanıyor…");
const stationParts = [
  ["stations", `node["railway"~"^(station|halt)$"](area.tr);`],
  ["tramstops", `node["railway"="tram_stop"](area.tr);`],
  ["ferry", `node["amenity"="ferry_terminal"](area.tr);node["aerialway"="station"](area.tr);`],
];
const stations = { elements: [] };
for (const [name, q] of stationParts) {
  const j = await cachedOverpass(name, `[out:json][timeout:240];${AREA}(${q});out body;`);
  stations.elements.push(...j.elements);
}

const stationFeatures = stations.elements.flatMap((el) => {
  const t = el.tags ?? {};
  if (!t.name) return [];
  let mode = "tren";
  if (t.amenity === "ferry_terminal") mode = "vapur";
  else if (t.aerialway === "station") mode = "teleferik";
  else if (t.railway === "tram_stop" || t.tram === "yes" || t.station === "tram") mode = "tramvay";
  else if (t.station === "subway" || t.subway === "yes") mode = "metro";
  else if (t.station === "light_rail" || t.light_rail === "yes") mode = "hafif_rayli";
  else if (t.station === "funicular") mode = "funikuler";
  return [
    {
      type: "Feature",
      properties: { id: `n${el.id}`, mode, name: t.name, operator: t.operator ?? t.network ?? "" },
      geometry: { type: "Point", coordinates: [r5(el.lon), r5(el.lat)] },
    },
  ];
});

mkdirSync(new URL("../public/geo/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/geo/transit-lines.geojson", import.meta.url), JSON.stringify({ type: "FeatureCollection", features }));
writeFileSync(
  new URL("../public/geo/transit-stations.geojson", import.meta.url),
  JSON.stringify({ type: "FeatureCollection", features: stationFeatures }),
);
const count = (arr) => arr.reduce((m, f) => ((m[f.properties.mode] = (m[f.properties.mode] ?? 0) + 1), m), {});
console.log("Hatlar:", count(features));
console.log("İstasyonlar:", count(stationFeatures));

// ---- İlçe merkezleri (arama için) ----
console.log("İlçeler sorgulanıyor…");
const districts = await cachedOverpass("districts", `[out:json][timeout:240];${AREA}relation["boundary"="administrative"]["admin_level"="6"](area.tr);out tags center;`);
const ilceler = districts.elements
  .filter((e) => e.center && e.tags?.name)
  .map((e) => ({ name: e.tags.name.replace(/\s+(İlçesi|ilçesi)$/, ""), lat: r5(e.center.lat), lon: r5(e.center.lon) }));
writeFileSync(new URL("../public/geo/tr-ilceler.json", import.meta.url), JSON.stringify(ilceler));
console.log(`${ilceler.length} ilçe`);
