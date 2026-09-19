// Türkiye'deki tüm hastaneleri OpenStreetMap'ten (Overpass API) derler.
// Çıktı: public/geo/hospitals.geojson (© OpenStreetMap katkıcıları, ODbL)
// Her hastaneye il sınırlarıyla nokta-poligon testi üzerinden il atanır; ad/işletmeciye göre tür tahmin edilir.
// Kullanım: node tools/build-hospitals.mjs   (önbelleği yenilemek için tools/raw/osm-hospitals.json dosyasını silin)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r5 = (n) => Math.round(n * 1e5) / 1e5;

async function overpass(query) {
  let lastErr;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "FATIH-OSINT/0.1" },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      console.warn(`Overpass hatası (${url}): ${e.message}`);
    }
  }
  throw lastErr;
}

const cacheFile = new URL("./raw/osm-hospitals.json", import.meta.url);
let raw;
if (existsSync(cacheFile)) raw = JSON.parse(readFileSync(cacheFile, "utf8"));
else {
  const q = `[out:json][timeout:300];area["ISO3166-1"="TR"][admin_level=2]->.tr;
(
  nwr["amenity"="hospital"](area.tr);
  nwr["healthcare"="hospital"](area.tr);
);
out center tags;`;
  for (let i = 0; i < 4 && !raw; i++) {
    try {
      raw = await overpass(q);
    } catch {
      console.warn(`Deneme ${i + 1} başarısız, bekleniyor…`);
      await sleep(20000 * (i + 1));
    }
  }
  if (!raw) throw new Error("Hastane verisi indirilemedi");
  mkdirSync(new URL("./raw/", import.meta.url), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(raw));
}

// ---- İl ataması (nokta-poligon) ----
const provSrc = readFileSync(new URL("../src/data/provinces.ts", import.meta.url), "utf8");
const provName = new Map([...provSrc.matchAll(/\[(\d+), "([^"]+)",/g)].map((m) => [Number(m[1]), m[2]]));
const iller = JSON.parse(readFileSync(new URL("../public/geo/tr-iller.geojson", import.meta.url), "utf8")).features.map((f) => {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const p of polys) for (const [x, y] of p[0]) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return { plate: f.properties.plate, bbox: [a, b, c, d], polys };
});
const inRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const provinceAt = (x, y) => {
  for (const p of iller) {
    const [a, b, c, d] = p.bbox;
    if (x < a || x > c || y < b || y > d) continue;
    for (const poly of p.polys) if (inRing(x, y, poly[0]) && !poly.slice(1).some((h) => inRing(x, y, h))) return p.plate;
  }
  return null;
};

// ---- Tür sınıflandırma (ad ve işletmeciye göre tahmin) ----
const lc = (s) => (s ?? "").toLocaleLowerCase("tr-TR");

// Hastane olmayan ya da bir hastanenin alt birimi/girişi olan kayıtlar
const NOT_HOSPITAL =
  /aile sağlığı|aile sagligi|(^|\s)(asm|ashi?|trsm)(\s|$)|sağlık ocağı|saglik ocagi|sağlık evi|sağlık müdürlüğü|(^|\s)poli[kn]|dispanser|kliniği$|klinik$|merkezi?$|merkezi |merkez şubesi|psikolog|sağlıklı hayat|^doktor$|ruh sağlığı merkezi|cinsel sa[gğ]l[ıi]k|tüp ?bebek|patolo|(^|\s)girişi(\s|$)|(^|\s)ek bina|(^|[\s(])[a-z] blok|hizmet binası|ünitesi$|fizik tedavi merkezi$|termal tesis|hair|^(yetişkin |çocuk |kadın doğum |psikiyatri |kadın doğum ve çocuk )?acil( servis)?i?$|^acil servis/;
function classify(t) {
  const n = lc(t.name), op = lc(t.operator), ot = lc(t["operator:type"]);
  if (/şehir hastanesi/.test(n)) return "Şehir hastanesi";
  if (/eğitim ve araştırma|egitim ve arastirma/.test(n)) return "Eğitim ve araştırma";
  if (/üniversite|universite|tıp fakültesi|tip fakultesi/.test(n) || /üniversite/.test(op) || ot === "university") return "Üniversite";
  if (/asker|gata|gülhane askeri/.test(n) || ot === "military") return "Askerî";
  if (/eğitim araştırma|egitim arastirma/.test(n)) return "Eğitim ve araştırma";
  if (/vakf|vakıf/.test(n) || /vakf|vakıf/.test(op)) return "Vakıf";
  if (/devlet hastanesi|devlet hastahanesi|ilçe hastanesi|entegre|halk sağlığı|toplum sağlığı|sağlık bakanlığı/.test(n) || /sağlık bakanlığı|t\.c\./.test(op) || ["government", "public"].includes(ot)) return "Devlet";
  if (/özel|ozel|medical|hospital|tıp merkezi|acıbadem|memorial|medicana|medipol|liv |florence|koru|anadolu sağlık|medical park|private|dünya ?göz|dunya ?göz|dűnyagöz|dunyagoz|amerikan hastanesi|italyan hastanesi/.test(n) || ot === "private") return "Özel";
  // Sağlık Bakanlığı'nın dal hastaneleri genellikle bu adlarla anılır
  if (/^(.+ )?(kadın doğum ve çocuk|kadın hastalıkları|çocuk hastalıkları|fizik tedavi ve rehabilitasyon|ruh sağlığı ve hastalıkları|göğüs hastalıkları|onkoloji) hastanesi/.test(n)) return "Devlet";
  if (/diş|agız ve diş|ağız ve diş/.test(n)) return "Ağız ve diş";
  return "Belirsiz";
}
function branch(t) {
  const n = lc(t.name);
  if (/kadın doğum|kadın hastalıkları|doğumevi|çocuk/.test(n)) return "Kadın doğum / çocuk";
  if (/ruh sağlığı|psikiyatri/.test(n)) return "Ruh sağlığı";
  if (/göğüs|kalp|onkoloji|kanser|fizik tedavi|göz|ortopedi|diş/.test(n)) return "Dal hastanesi";
  if (t["healthcare:speciality"] && t["healthcare:speciality"] !== "general") return "Dal hastanesi";
  return "Genel";
}

const seen = new Set();
const features = [];
for (const el of raw.elements) {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) continue;
  const plate = provinceAt(lon, lat);
  if (plate == null) continue; // sınır dışı
  const name = t.name ?? t["name:tr"] ?? "";
  if (!name) continue; // adsız kayıtlar genelde bina parçası
  if (NOT_HOSPITAL.test(lc(name).trim())) continue;
  // Aynı hastanenin hem nokta hem alan olarak girilmesini ele: ad + ~100 m ızgara
  const key = `${lc(name)}|${Math.round(lat * 100)}|${Math.round(lon * 100)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const beds = Number(t.beds ?? t["capacity:beds"]);
  features.push({
    type: "Feature",
    properties: {
      _id: `${el.type[0]}${el.id}`,
      ad: name,
      il: provName.get(plate),
      ilce: t["addr:district"] ?? t["addr:city"] ?? "",
      tur: classify(t),
      brans: branch(t),
      acil: t.emergency === "yes" ? true : t.emergency === "no" ? false : null,
      yatak: Number.isFinite(beds) && beds > 0 ? beds : null,
      isletmeci: t.operator ?? "",
      telefon: t.phone ?? t["contact:phone"] ?? "",
      web: t.website ?? t["contact:website"] ?? "",
      adres: [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" "),
      osm: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    },
    geometry: { type: "Point", coordinates: [r5(lon), r5(lat)] },
  });
}

writeFileSync(new URL("../public/geo/hospitals.geojson", import.meta.url), JSON.stringify({ type: "FeatureCollection", features }));
const by = (k) => features.reduce((m, f) => ((m[f.properties[k]] = (m[f.properties[k]] ?? 0) + 1), m), {});
console.log(`${features.length} hastane (${raw.elements.length} ham kayıt)`);
console.log("Tür:", by("tur"));
console.log("Acil servis:", by("acil"));
console.log("İl sayısı:", Object.keys(by("il")).length);
