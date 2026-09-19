// geoBoundaries TUR ADM1 (OSM kaynaklı, CC BY-SA 2.0) verisini FATİH için hazırlar:
// - il adlarını plaka koduyla eşler
// - koordinatları 4 ondalığa yuvarlayarak boyutu küçültür
// Kullanım: node tools/build-provinces-geo.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = JSON.parse(readFileSync(new URL("./geoBoundaries-TUR-ADM1_simplified.geojson", import.meta.url), "utf8"));
const provSrc = readFileSync(new URL("../src/data/provinces.ts", import.meta.url), "utf8");

const norm = (s) =>
  s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z]/g, "");

const plates = new Map();
for (const m of provSrc.matchAll(/\[(\d+), "([^"]+)",/g)) plates.set(norm(m[2]), Number(m[1]));
const ALIAS = { afyon: 3, icel: 33, kmaras: 46, maras: 46, urfa: 63, antep: 27 };

const round = (c) => (typeof c[0] === "number" ? [+c[0].toFixed(4), +c[1].toFixed(4)] : c.map(round));

const out = { type: "FeatureCollection", features: [] };
const missing = [];
for (const f of src.features) {
  const name = f.properties.shapeName;
  const key = norm(name.replace(/\s*(ili|province)$/i, ""));
  const plate = plates.get(key) ?? ALIAS[key];
  if (!plate) {
    missing.push(name);
    continue;
  }
  out.features.push({
    type: "Feature",
    id: plate,
    properties: { plate },
    geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) },
  });
}
if (missing.length) console.warn("Eşleşmeyen:", missing);
mkdirSync(new URL("../public/geo/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/geo/tr-iller.geojson", import.meta.url), JSON.stringify(out));
console.log(`${out.features.length} il yazıldı.`);
