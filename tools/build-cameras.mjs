// Resmî, halka açık belediye kamera yayınlarının kataloğunu üretir → src/data/cameras.json
// Kural: yalnızca başka sitelerden oynatılmaya açıkça izin veren yayınlar (CORS açık, token/referer yok) ya da
// çerçeve kısıtlaması olmayan resmî oynatıcılar gömülür; erişim kontrolü olanlar için resmî sayfaya bağlantı verilir.
//  Doğrudan oynatılan (şifresiz HLS, CORS açık): İBB İstanbul'u Seyret, Kahramanmaraş BB, Nevşehir Belediyesi
//  Bağlantı (erişim kontrolü var): Trabzon (bilet + referer + CSP), Kocaeli (10 dk'lık imzalı token, X-Frame-Options),
//    Erzurum (AES şifreli, anahtar alan adına kilitli), Kayseri (dış erişim engelli), Rize/Alanya (oynatıcı yalnız kendi sitesinde)
//  Geçici kapalı (KVKK 23.06.2026 duyurusu): Bursa (otomatik algılanır), Tekirdağ, Balıkesir — not ile listelenir
// Resmî koordinatı olmayan kameraların konumu adres araması ya da elle girilmiş YAKLAŞIK değerdir (approx: true).
// Kullanım: node tools/build-cameras.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; GOKBERK-OSINT/0.1)" };

// slug → [enlem, boylam]
const IBB_COORDS = {
  "anadolu-hisari": [41.0823, 29.0668],
  "beyazit-kulesi-2": [41.012, 28.9642],
  "beyazit-meydani": [41.0105, 28.9648],
  "buyuk-camlica": [41.0272, 29.0689],
  eminonu: [41.0172, 28.9712],
  emirgan: [41.108, 29.055],
  "eyup-sultan": [41.0479, 28.9339],
  "hidiv-kasri": [41.1148, 29.068],
  kadikoy: [40.991, 29.024],
  "kiz-kulesi": [41.0211, 29.0041],
  miniaturk: [41.0612, 28.9488],
  "misir-carsisi": [41.0165, 28.9706],
  "pierre-loti": [41.0551, 28.934],
  salacak: [41.023, 29.0078],
  sarachane: [41.0149, 28.9547],
  sultanahmet: [41.0055, 28.9768],
  "sultanahmet-2": [41.0062, 28.978],
  "taksim-meydan": [41.0369, 28.985],
  "ulus-parki": [41.07, 29.025],
  uskudar: [41.026, 29.015],
  "galata-kulesi": [41.0256, 28.9742],
};

// Trabzon BB — id → [ad, enlem, boylam]
const TRABZON = [
  [3041, "Akyazı Paparapark", 41.0005, 39.642],
  [3042, "Boztepe Manzara", 40.9955, 39.7395],
  [3045, "Ganita Şehir Kamerası", 41.006, 39.738],
  [3046, "Atatürk Köşkü", 40.9862, 39.686],
  [3047, "Değirmendere", 40.999, 39.756],
  [3048, "Meydan Park", 41.005, 39.7305],
  [3049, "Uzungöl", 40.619, 40.294],
  [3050, "Ayasofya Kavşak", 41.0025, 39.6905],
  [3051, "Pazarkapı", 41.0068, 39.7355],
  [3052, "Oyuncakistan", 40.998, 39.717],
  [3053, "Kanunievi", 41.0035, 39.72],
  [3055, "Meydan", 41.0048, 39.7292],
  [3056, "Of Manzara", 40.946, 40.268],
  [3059, "Çaykara Merkez", 40.747, 40.235],
  [3060, "Sürmene Manzara", 40.911, 40.113],
  [3063, "Çarşıbaşı Manzara", 41.083, 39.383],
  [3065, "Şalpazarı Merkez", 40.939, 39.194],
  [3069, "Sisdağı Yaylası", 40.742, 39.278],
  [3070, "Arsin Manzara", 40.95, 39.929],
  [3071, "Akçaabat Manzara", 41.021, 39.571],
  [3072, "Hayrat Manzara", 40.89, 40.365],
  [3073, "Yomra Manzara", 40.955, 39.856],
  [3074, "Araklı Merkez", 40.939, 40.057],
  [3075, "Dernekpazarı Manzara", 40.8, 40.24],
  [3076, "Maçka Manzara", 40.813, 39.613],
  [3077, "Köprübaşı Manzara", 40.807, 40.113],
  [3078, "Düzköy Manzara", 40.873, 39.423],
  [3079, "Hıdırnebi Yaylası", 40.868, 39.458],
  [3080, "Sümela Manastırı", 40.69, 39.658],
  [3081, "Beşikdüzü Teleferik", 41.052, 39.231],
];

const titleCase = (s) =>
  s
    .toLocaleLowerCase("tr-TR")
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ");

const cameras = [];

// ---- İBB ----
const listHtml = await (await fetch("https://istanbuluseyret.ibb.istanbul/tr/turistik-kameralar", { headers: UA })).text();
const entries = [...listHtml.matchAll(/turistik-kamera\/([a-z0-9-]+)">([^<]+)<\/a>/g)];
const seen = new Set();
for (const [, slug, rawName] of entries) {
  if (seen.has(slug)) continue;
  seen.add(slug);
  const page = await (await fetch(`https://istanbuluseyret.ibb.istanbul/tr/turistik-kamera/${slug}`, { headers: UA })).text();
  const m = page.match(/https?:\\?\/\\?\/[^"'\s]+?\.m3u8/);
  const stream = m ? m[0].replace(/\\\//g, "/") : null;
  // Sayfadaki harita.istanbul iframe'i resmî konumu verir: @=boylam,enlem,zoom
  const at = page.match(/harita\.istanbul\/2d\/embed\/[^"]*?@=([\d.]+),([\d.]+)/);
  const coords = at ? [Number(at[2]), Number(at[1])] : IBB_COORDS[slug];
  if (!coords) console.warn("Koordinatı olmayan İBB kamerası:", slug);
  cameras.push({
    id: `ibb-${slug}`,
    city: "İstanbul",
    plate: 34,
    name: titleCase(rawName.trim()),
    provider: "İBB · İstanbul'u Seyret",
    kind: stream ? "hls" : "page",
    stream,
    page: `https://istanbuluseyret.ibb.istanbul/tr/turistik-kamera/${slug}`,
    lat: coords?.[0] ?? null,
    lon: coords?.[1] ?? null,
  });
  console.log(`İBB ${slug}: ${stream ?? "yayın bulunamadı"}`);
}

// ---- Trabzon ----
// Oynatıcı tek kullanımlık "PlaybackTicket", referer kontrolü ve CSP frame-ancestors ile korunuyor → yalnızca bağlantı.
for (const [id, name, lat, lon] of TRABZON) {
  cameras.push({
    id: `trabzon-${id}`,
    city: "Trabzon",
    plate: 61,
    name,
    provider: "Trabzon Büyükşehir Belediyesi",
    kind: "page",
    stream: null,
    page: "https://www.trabzon.bel.tr/Web/SehirKameralari",
    lat,
    lon,
    approx: true,
  });
}

// ---------------------------------------------------------------------------
// Yardımcılar: sayfa çekme ve OSM Nominatim ile adres araması (1 istek/sn, önbellekli)
// ---------------------------------------------------------------------------
const BROWSER_UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = async (url) => {
  const r = await fetch(url, { headers: BROWSER_UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
};
const decodeHtml = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();

const geoCacheFile = new URL("./raw/geocode-cache.json", import.meta.url);
const geoCache = existsSync(geoCacheFile) ? JSON.parse(readFileSync(geoCacheFile, "utf8")) : {};
/** Nominatim araması; bulunamazsa yedek koordinat döner. `approx` her zaman işaretlenir. */
async function geocode(query, fallback, bbox) {
  if (!(query in geoCache)) {
    const qs = new URLSearchParams({ q: query, format: "json", limit: "1", countrycodes: "tr", ...(bbox ? { viewbox: bbox, bounded: "1" } : {}) });
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
        headers: { "User-Agent": "GOKBERK-OSINT/0.1 (camera catalog build script)", "Accept-Language": "tr" },
      });
      const j = r.ok ? await r.json() : [];
      geoCache[query] = j[0] ? [Number(j[0].lat), Number(j[0].lon)] : null;
    } catch {
      geoCache[query] = null;
    }
    await sleep(1100);
  }
  return geoCache[query] ?? fallback;
}
// İl sınır kutuları (minLon,maxLat,maxLon,minLat — Nominatim viewbox biçimi)
const BOX = {
  bursa: "28.3,40.7,30.0,39.6",
  kocaeli: "29.3,41.25,30.4,40.5",
  erzurum: "40.2,40.9,42.6,39.2",
  kmaras: "36.2,38.6,38.0,37.2",
};

// ---- Erzurum BB (cdn-ipkamera.yayin.com.tr — oynatma listesi açık ama segmentler şifreli, anahtar alan adına kilitli) ----
const ERZURUM = {
  erzurum: ["Erzurum Kent Merkezi", "Cumhuriyet Caddesi, Yakutiye, Erzurum", [39.9057, 41.2712]],
  Yakutiye_Medrese: ["Yakutiye Medresesi", "Yakutiye Medresesi, Erzurum", [39.9058, 41.2757]],
  Havuzbasi: ["Havuzbaşı", "Havuzbaşı, Yakutiye, Erzurum", [39.9085, 41.2745]],
  cifte_Minareler: ["Çifte Minareli Medrese", "Çifte Minareli Medrese, Erzurum", [39.9036, 41.2786]],
  Mezarlik: ["Mezarlık", "Asri Mezarlık, Erzurum", [39.918, 41.245]],
  "alt-meydan": ["Ejder 3200 · Alt Meydan", "Ejder 3200 Kayak Merkezi, Erzurum", [39.8465, 41.268]],
  "kure-kafe": ["Ejder 3200 · Küre Kafe", null, [39.8425, 41.272]],
  "a-lifti": ["Ejder 3200 · A Lifti", null, [39.8445, 41.2665]],
  "b-lifti": ["Ejder 3200 · B Lifti", null, [39.8405, 41.2645]],
  "ejder-zirve": ["Ejder 3200 · Zirve", null, [39.8335, 41.264]],
  Tortum: ["Tortum Şelalesi", "Tortum Şelalesi, Uzundere, Erzurum", [40.6575, 41.6555]],
  Tortum_Meydan: ["Tortum · Meydan", "Tortum, Erzurum", [40.2995, 41.544]],
  Tortum_Merkez: ["Tortum · Merkez", null, [40.301, 41.546]],
  tortumbagbasi: ["Tortum · Bağbaşı", "Bağbaşı, Tortum, Erzurum", [40.448, 41.622]],
  tortumsenyurt: ["Tortum · Şenyurt", "Şenyurt, Tortum, Erzurum", [40.38, 41.59]],
};
try {
  const html = await text("https://ebb.erzurum.bel.tr/canliyayin.aspx");
  const urls = [...new Set([...html.matchAll(/\/\/cdn-ipkamera\.yayin\.com\.tr\/[\w-]+\/([\w-]+)\/playlist\.m3u8/g)].map((m) => [m[0], m[1]]).map(JSON.stringify))].map(JSON.parse);
  for (const [url, slug] of urls) {
    const [name, q, fb] = ERZURUM[slug] ?? [slug.replace(/[_-]/g, " "), null, [39.9055, 41.2658]];
    const [lat, lon] = q ? await geocode(q, fb, BOX.erzurum) : fb;
    // Akış AES-128 ile şifreli; çözme anahtarı yalnızca yetkili sitelere veriliyor (yetkisiz istek yönlendiriliyor) → yalnızca bağlantı.
    void url;
    cameras.push({ id: `erzurum-${slug}`, city: "Erzurum", plate: 25, name, provider: "Erzurum Büyükşehir Belediyesi", kind: "page", stream: null, page: "https://www.erzurum.bel.tr/canli-yayin", lat, lon, approx: true });
  }
  console.log(`Erzurum: ${urls.length}`);
} catch (e) {
  console.warn("Erzurum atlandı:", e.message);
}

// ---- Kahramanmaraş BB (camstream.kahramanmaras.bel.tr — CORS açık, token yok) ----
const KMARAS_DISTRICTS = {
  afsin: [38.2475, 36.9136], andirin: [37.5758, 36.3509], "caglayan-cerit": [37.7497, 37.2908], ekinozu: [38.0603, 37.1889],
  "elbistan-meydan": [38.2059, 37.1983], elbistanbattalgazi: [38.2045, 37.1935], goksun: [38.0214, 36.4975], nurhak: [37.9667, 37.4417],
  pazarcik: [37.4886, 37.2986], turkoglu: [37.3833, 36.85],
};
try {
  const html = await text("https://kamera.kahramanmaras.bel.tr/");
  const cards = [...html.matchAll(/data-stream="([^"]+\/live\/([\w-]+)\.stream\/playlist\.m3u8)"\s*data-title="([^"]+)"\s*data-category="([^"]*)"/g)];
  for (const [, url, slug, title, category] of cards) {
    const name = decodeHtml(title);
    const fb = KMARAS_DISTRICTS[slug] ?? [37.5753, 36.9228];
    const [lat, lon] = KMARAS_DISTRICTS[slug] ? fb : await geocode(`${name}, Kahramanmaraş`, fb, BOX.kmaras);
    cameras.push({ id: `kmaras-${slug}`, city: "Kahramanmaraş", plate: 46, name, category: decodeHtml(category), provider: "Kahramanmaraş Büyükşehir Belediyesi", kind: "hls", stream: url, page: "https://kamera.kahramanmaras.bel.tr/", lat, lon, approx: true });
  }
  console.log(`Kahramanmaraş: ${cards.length}`);
} catch (e) {
  console.warn("Kahramanmaraş atlandı:", e.message);
}

// ---- Nevşehir Belediyesi (belsis.nevsehir.bel.tr/hls — CORS açık) ----
try {
  const html = await text("https://belsis.nevsehir.bel.tr/kameracanli/canli");
  const cams = [...html.matchAll(/data-key="([\w]+)" data-name="([^"]+)"/g)];
  const COORD = { Meydan: [38.6247, 34.7142], "Kayaşehir": [38.6178, 34.7278] };
  for (const [, key, rawName] of cams) {
    const name = decodeHtml(rawName);
    const place = name.split(" - ")[0];
    const [lat, lon] = COORD[place] ?? [38.6247, 34.7142];
    cameras.push({ id: `nevsehir-${key.slice(0, 8)}`, city: "Nevşehir", plate: 50, name, provider: "Nevşehir Belediyesi", kind: "hls", stream: `https://belsis.nevsehir.bel.tr/hls/live/${key}/index.m3u8`, page: "https://belsis.nevsehir.bel.tr/kameracanli/canli", lat, lon, approx: true });
  }
  console.log(`Nevşehir: ${cams.length}`);
} catch (e) {
  console.warn("Nevşehir atlandı:", e.message);
}

// Bursa'da adres aramasının bulamadığı bilinen noktalar (yaklaşık)
const BURSA_KNOWN = {
  zoo: [40.2275, 28.9935],
  ulucamii: [40.184, 29.0619],
  kulturpark: [40.1945, 29.045],
  "uludag-zirve": [40.1045, 29.1285],
  "uludag---sarialan": [40.132, 29.07],
  "uludag-yolu": [40.162, 29.098],
  "uludag-": [40.1045, 29.1285],
  "bursa-millet-bahcesi": [40.2021, 29.0467],
  "sehrekustu": [40.1875, 29.0637],
  "tophaneden-bursa": [40.1885, 29.0548],
  "merinos-akkm-golpark": [40.1985, 29.051],
  "merinos-osmangazi": [40.1993, 29.0555],
  "merinos-kavsagi": [40.2003, 29.0485],
  "merinos-": [40.199, 29.052],
  emirsultan: [40.183, 29.09],
  teferruc: [40.176, 29.098],
  "cekirge-meydani": [40.2, 29.02],
  sirameseler: [40.1795, 29.0425],
};

// ---- Bursa BB (resmî oynatıcı player.bursa.bel.tr — çerçeve kısıtlaması yok, iframe ile gömülür) ----
// Ham HLS adresleri süreli token içerdiğinden kullanılmaz; token'ı belediyenin kendi oynatıcısı üretir.
try {
  const list = await text("https://www.bursa.bel.tr/sehir-kameralari/");
  const slugs = [...new Set([...list.matchAll(/https:\/\/www\.bursa\.bel\.tr\/sehir-kameralari\/([a-z0-9-]+-\d+)/g)].map((m) => m[1]))];
  let n = 0;
  // Yayınlar kapatıldıysa oynatıcı video yerine duyuru gösterir; ilk kamerayla kontrol et.
  let closedNote = null;
  for (const slug of slugs) {
    const page = `https://www.bursa.bel.tr/sehir-kameralari/${slug}`;
    const html = await text(page).catch(() => "");
    const player = html.match(/https:\/\/player\.bursa\.bel\.tr\/\?stream=[\w.-]+/)?.[0];
    if (player && n === 0) {
      const ph = await text(player).catch(() => "");
      if (/KVKK|Kişisel Verileri Koruma/.test(ph) && /kapatılmıştır|erişime kapat/.test(ph)) {
        const d = ph.match(/(\d{2}\.\d{2}\.\d{4}) tarihi itibarıyla/)?.[1];
        closedNote = `Belediye canlı yayınları KVKK duyurusu nedeniyle${d ? " " + d + " tarihinden beri" : ""} geçici olarak kapattı.`;
      }
    }
    const title = decodeHtml(html.match(/<title>([^<|–-]+)/)?.[1] ?? slug.replace(/-\d+$/, "").replace(/-+/g, " "));
    const name = title.replace(/\s*(canlı|şehir)\s*kamera(sı|ları)?\s*$/i, "").trim() || slug;
    const zoo = /savana|gergedan|habes|lemur|penguen|su-kuslari/.test(slug);
    const known = Object.entries(BURSA_KNOWN).find(([k]) => slug.startsWith(k))?.[1];
    const q = `${name.replace(/\s+-+\s+/g, " ")}, Bursa`;
    const [lat, lon] = zoo ? BURSA_KNOWN.zoo : known ?? (await geocode(q, [40.1885, 29.061], BOX.bursa));
    const live = player && !closedNote;
    cameras.push({ id: `bursa-${slug}`, city: "Bursa", plate: 16, name, provider: "Bursa Büyükşehir Belediyesi", kind: live ? "embed" : "page", stream: null, embed: live ? player : null, page, lat, lon, approx: true, ...(closedNote ? { note: closedNote } : {}) });
    n++;
    await sleep(300);
  }
  console.log(`Bursa: ${n}${closedNote ? " (yayınlar kapalı)" : ""}`);
} catch (e) {
  console.warn("Bursa atlandı:", e.message);
}

// ---- Kocaeli BB (kocaeliyiseyret.com) ----
// Yayınlar 10 dk'da süresi dolan imzalı token'larla korunuyor ve sayfa X-Frame-Options: sameorigin → yalnızca bağlantı.
try {
  const html = (await text("https://kocaeliyiseyret.com/")).replace(/\\"/g, '"');
  const cams = new Map([...html.matchAll(/"url":"https:\/\/kocaeliyiseyret\.com\/camera\?camera=(\d+)","name":"([^"]+?) canlı kamera"/g)].map((m) => [m[1], m[2]]));
  for (const [id, full] of cams) {
    const [district, ...rest] = full.split(" ");
    const name = rest.join(" ");
    const districtTc = district.charAt(0) + district.slice(1).toLocaleLowerCase("tr-TR");
    const [lat, lon] = await geocode(`${name}, ${districtTc}, Kocaeli`, await geocode(`${districtTc}, Kocaeli`, [40.7654, 29.9408], BOX.kocaeli), BOX.kocaeli);
    cameras.push({ id: `kocaeli-${id}`, city: "Kocaeli", plate: 41, name: `${districtTc} · ${name}`, provider: "Kocaeli BB · Kocaeli'yi Seyret", kind: "page", stream: null, page: `https://kocaeliyiseyret.com/camera?camera=${id}`, lat, lon, approx: true });
  }
  console.log(`Kocaeli: ${cams.size}`);
} catch (e) {
  console.warn("Kocaeli atlandı:", e.message);
}

// ---- Kayseri BB (izle.kayseri.bel.tr) ----
// Oynatıcı dış erişimi "yayın ve kullanım hakları" gerekçesiyle engelliyor → yalnızca bağlantı. Koordinatlar resmî sayfadan.
try {
  const seenK = new Set();
  for (let p = 1; p <= 12; p++) {
    const html = await text(`https://izle.kayseri.bel.tr/?page=${p}`).catch(() => "");
    const cards = [...html.matchAll(/data-detail-url="(\/kamera\/[\w-]+)"[\s\S]*?data-lat="([\d,.]+)"\s*data-lng="([\d,.]+)"[\s\S]*?video-card-title">([^<]+)</g)];
    let added = 0;
    for (const [, path, la, lo, title] of cards) {
      if (seenK.has(path)) continue;
      seenK.add(path);
      added++;
      cameras.push({ id: `kayseri-${path.split("/").pop()}`, city: "Kayseri", plate: 38, name: decodeHtml(title), provider: "Kayseri Büyükşehir Belediyesi", kind: "page", stream: null, page: `https://izle.kayseri.bel.tr${path}`, lat: Number(la.replace(",", ".")), lon: Number(lo.replace(",", ".")) });
    }
    if (!added) break;
    await sleep(300);
  }
  console.log(`Kayseri: ${seenK.size}`);
} catch (e) {
  console.warn("Kayseri atlandı:", e.message);
}

// ---- Tek sayfalık belediye kamera portalları (oynatıcılar yalnızca kendi sitelerinde çalışıyor) ----
for (const c of [
  { id: "rize-bel", city: "Rize", plate: 53, name: "Rize Belediyesi kent kameraları", provider: "Rize Belediyesi", page: "https://www.rize.bel.tr/hizmet/canli-kameralar", lat: 41.0255, lon: 40.5177 },
  { id: "tekirdag-bel", city: "Tekirdağ", plate: 59, name: "Tekirdağ BB şehir kameraları", provider: "Tekirdağ Büyükşehir Belediyesi", page: "https://www.tekirdag.bel.tr/sehir_kameralari", lat: 40.978, lon: 27.511, note: "Belediye canlı yayınları KVKK duyurusu nedeniyle geçici olarak kapattı; kayıt sürüyor." },
  { id: "balikesir-bel", city: "Balıkesir", plate: 10, name: "Balıkesir BB şehir kameraları", provider: "Balıkesir Büyükşehir Belediyesi", page: "https://sehirkamera.balikesir.bel.tr/", lat: 39.6484, lon: 27.8826, note: "Belediye canlı yayınları KVKK'nın 23.06.2026 duyurusu nedeniyle geçici olarak kapattı." },
  { id: "alanya-bel", city: "Antalya", plate: 7, name: "Alanya plaj ve kent kameraları", provider: "Alanya Belediyesi", page: "https://www.alanya.bel.tr/PlajKameralar", lat: 36.5438, lon: 31.9998 },
]) {
  cameras.push({ ...c, kind: "page", stream: null, approx: true });
}

// Aynı (yaklaşık) noktaya düşen kameraları tıklanabilsinler diye küçük bir halkaya dağıt (~120–250 m)
const groups = new Map();
for (const c of cameras) {
  if (c.lat == null) continue;
  const k = `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
  groups.set(k, [...(groups.get(k) ?? []), c]);
}
for (const list of groups.values()) {
  if (list.length < 2) continue;
  list.forEach((c, i) => {
    const ring = 1 + Math.floor(i / 8);
    const a = ((i % 8) / 8) * 2 * Math.PI + ring * 0.4;
    const r = 0.0011 * ring; // ~120 m / halka
    c.lat = +(c.lat + r * Math.sin(a)).toFixed(6);
    c.lon = +(c.lon + (r * Math.cos(a)) / Math.cos((c.lat * Math.PI) / 180)).toFixed(6);
    c.approx = true;
  });
}

writeFileSync(geoCacheFile, JSON.stringify(geoCache, null, 1));
writeFileSync(new URL("../src/data/cameras.json", import.meta.url), JSON.stringify(cameras, null, 1));
const byKind = cameras.reduce((m, c) => ((m[c.kind] = (m[c.kind] ?? 0) + 1), m), {});
const byCity = cameras.reduce((m, c) => ((m[c.city] = (m[c.city] ?? 0) + 1), m), {});
console.log(`${cameras.length} kamera yazıldı`, byKind, byCity);
