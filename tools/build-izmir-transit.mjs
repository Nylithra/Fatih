// ESHOT (İzmir BB) açık verisinden hat listesi, hat güzergahları ve durakları hazırlar.
// Kaynak: acikveri.bizizmir.com — İzmir BB Açık Veri Lisansı
// Çıktılar:
//   public/transit/izmir/lines.json          — [{ no, name, from, to, via }]
//   public/transit/izmir/routes/<hatNo>.json — { "1": [[lon,lat],...], "2": [...] }  (yön 1 = gidiş, 2 = dönüş)
//   public/transit/izmir/stops.json          — [[id, ad, enlem, boylam, "hat-hat-hat"], ...]
// Kullanım: node tools/build-izmir-transit.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://openfiles.izmir.bel.tr/211488/docs/";
const out = new URL("../public/transit/izmir/", import.meta.url);
mkdirSync(new URL("routes/", out), { recursive: true });

async function csv(name) {
  const res = await fetch(BASE + name, { headers: { "User-Agent": "GOKBERK-OSINT/0.1" } });
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  const text = (await res.text()).replace(/^﻿/, "");
  const [head, ...rows] = text.split(/\r?\n/).filter(Boolean);
  const cols = head.split(";");
  return rows.map((r) => {
    const v = r.split(";");
    return Object.fromEntries(cols.map((c, i) => [c, (v[i] ?? "").trim()]));
  });
}
const num = (s) => Number(String(s).replace(",", "."));
const r5 = (n) => Math.round(n * 1e5) / 1e5;

const lines = (await csv("eshot-otobus-hatlari.csv")).map((r) => ({
  no: r.HAT_NO,
  name: r.HAT_ADI,
  from: r.HAT_BASLANGIC,
  to: r.HAT_BITIS,
  via: r.GUZERGAH_ACIKLAMA,
}));
writeFileSync(new URL("lines.json", out), JSON.stringify(lines));
console.log(`${lines.length} hat`);

const routes = new Map();
for (const r of await csv("eshot-otobus-hat-guzergahlari.csv")) {
  const lon = num(r.BOYLAM), lat = num(r.ENLEM);
  if (!lon || !lat) continue;
  const route = routes.get(r.HAT_NO) ?? {};
  const dir = (route[r.YON] ??= []);
  const p = [r5(lon), r5(lat)];
  const last = dir.at(-1);
  if (!last || last[0] !== p[0] || last[1] !== p[1]) dir.push(p);
  routes.set(r.HAT_NO, route);
}
for (const [no, route] of routes) writeFileSync(new URL(`routes/${encodeURIComponent(no)}.json`, out), JSON.stringify(route));
console.log(`${routes.size} güzergah`);

const stops = (await csv("eshot-otobus-duraklari.csv")).flatMap((r) => {
  const lat = num(r.ENLEM), lon = num(r.BOYLAM);
  if (!lat || !lon) return [];
  return [[Number(r.DURAK_ID), r.DURAK_ADI, r5(lat), r5(lon), r.DURAKTAN_GECEN_HATLAR]];
});
writeFileSync(new URL("stops.json", out), JSON.stringify(stops));
console.log(`${stops.length} durak`);
