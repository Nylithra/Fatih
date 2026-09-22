/**
 * Gökberk veri kataloğu — sunucu ve istemcinin paylaştığı tanımlar.
 *
 * Her veri seti; haritada nasıl çizileceğini, detay kartında hangi alanların
 * gösterileceğini ve filtre panelinde hangi alanlara göre süzülebileceğini tanımlar.
 * Yeni bir açık veri kaynağı eklemek için: buraya meta, `loaders.ts`'e yükleyici ekleyin.
 */

export type FieldType = "number" | "enum" | "text" | "bool";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  /** Detay kartında gösterilsin mi (varsayılan: evet) */
  show?: boolean;
  /** Filtre panelinde sunulsun mu (varsayılan: evet) */
  filter?: boolean;
};

export type Category = "Ulaşım" | "Otopark" | "Kamera" | "Afet ve Güvenlik" | "Sağlık" | "Şehir Hizmetleri";

export type DatasetMeta = {
  id: string;
  title: string;
  category: Category;
  city: string; // "Türkiye" | "İstanbul" | "İzmir" | …
  provider: string;
  license: string;
  sourceUrl?: string;
  description?: string;
  geometry: "point" | "line";
  color: string;
  /** Nokta rengini bir alana göre değiştir (renk = stops'taki ilk eşik üstü) */
  colorBy?: { field: string; stops: [number, string][] } | { field: string; map: Record<string, string> };
  /** Çizgilerde özellikteki renk alanını kullan (ör. OSM "colour") */
  lineColorField?: string;
  radius?: number;
  minzoom?: number;
  labelMinzoom?: number;
  /** Statik dosya ya da /api/data/<id> */
  url: string;
  /** 0 → statik, bir kez yüklenir */
  refreshMs: number;
  /** Detay kartı başlığı için alan */
  titleField: string;
  fields: FieldDef[];
};

export const DATASETS: DatasetMeta[] = [
  // ---------------- Ulaşım ----------------
  {
    id: "transit-lines",
    title: "Raylı sistem, tren ve vapur hatları",
    category: "Ulaşım",
    city: "Türkiye",
    provider: "OpenStreetMap",
    license: "ODbL",
    sourceUrl: "https://www.openstreetmap.org",
    description: "Tüm illerdeki metro, hafif raylı, tramvay, füniküler, teleferik, tren ve vapur hatları",
    geometry: "line",
    color: "#7bdff2",
    lineColorField: "colour",
    colorBy: {
      field: "mode",
      map: { metro: "#e63946", hafif_rayli: "#f4a261", tramvay: "#2a9d8f", funikuler: "#b5838d", teleferik: "#e9c46a", monoray: "#bdb2ff", tren: "#8d99ae", vapur: "#48cae4" },
    },
    url: "/geo/transit-lines.geojson",
    refreshMs: 0,
    titleField: "name",
    fields: [
      { key: "mode", label: "Tür", type: "enum" },
      { key: "ref", label: "Hat kodu", type: "text" },
      { key: "name", label: "Hat adı", type: "text" },
      { key: "operator", label: "İşletmeci", type: "enum" },
      { key: "from", label: "Başlangıç", type: "text", filter: false },
      { key: "to", label: "Bitiş", type: "text", filter: false },
    ],
  },
  {
    id: "transit-stations",
    title: "İstasyon, durak ve iskeleler",
    category: "Ulaşım",
    city: "Türkiye",
    provider: "OpenStreetMap",
    license: "ODbL",
    geometry: "point",
    color: "#caf0f8",
    colorBy: {
      field: "mode",
      map: { metro: "#e63946", hafif_rayli: "#f4a261", tramvay: "#2a9d8f", funikuler: "#b5838d", teleferik: "#e9c46a", tren: "#adb5bd", vapur: "#48cae4" },
    },
    radius: 3.5,
    minzoom: 9,
    labelMinzoom: 12.5,
    url: "/geo/transit-stations.geojson",
    refreshMs: 0,
    titleField: "name",
    fields: [
      { key: "mode", label: "Tür", type: "enum" },
      { key: "name", label: "Ad", type: "text" },
      { key: "operator", label: "İşletmeci", type: "enum" },
    ],
  },
  {
    id: "iett-buses",
    title: "İETT otobüsleri (canlı)",
    category: "Ulaşım",
    city: "İstanbul",
    provider: "İBB · İETT",
    license: "İBB Açık Veri Lisansı",
    sourceUrl: "https://data.ibb.gov.tr/dataset/sefer-gerceklesme-web-servisi",
    description: "İETT ve özel halk otobüslerinin anlık GPS konumları. Hat takibi için arama kutusuna hat kodu yazın (ör. 500T).",
    geometry: "point",
    color: "#ff9f1c",
    colorBy: { field: "hiz", stops: [[0, "#8d99ae"], [1, "#ffbf69"], [30, "#ff9f1c"], [60, "#ff6b35"]] },
    radius: 3,
    url: "/api/data/iett-buses",
    refreshMs: 20_000,
    titleField: "kapiNo",
    fields: [
      { key: "kapiNo", label: "Kapı no", type: "text" },
      { key: "plaka", label: "Plaka", type: "text" },
      { key: "operator", label: "İşletmeci", type: "enum" },
      { key: "hiz", label: "Hız", type: "number", unit: "km/sa" },
      { key: "hareketli", label: "Hareket hâlinde", type: "bool" },
      { key: "saat", label: "Son konum", type: "text", filter: false },
    ],
  },
  {
    id: "iett-stops",
    title: "İETT durakları",
    category: "Ulaşım",
    city: "İstanbul",
    provider: "İBB · İETT",
    license: "İBB Açık Veri Lisansı",
    geometry: "point",
    color: "#ffd166",
    radius: 2.5,
    minzoom: 12.5,
    labelMinzoom: 15,
    url: "/api/data/iett-stops",
    refreshMs: 0,
    titleField: "ad",
    fields: [
      { key: "ad", label: "Durak", type: "text" },
      { key: "kod", label: "Durak kodu", type: "text" },
      { key: "ilce", label: "İlçe", type: "enum" },
      { key: "yon", label: "Yön", type: "text", filter: false },
      { key: "tip", label: "Durak tipi", type: "enum" },
      { key: "engelli", label: "Engelli kullanımı", type: "enum" },
      { key: "akilli", label: "Akıllı durak", type: "enum" },
    ],
  },
  {
    id: "izmir-stops",
    title: "ESHOT durakları",
    category: "Ulaşım",
    city: "İzmir",
    provider: "İzmir BB · ESHOT",
    license: "İzmir BB Açık Veri Lisansı",
    geometry: "point",
    color: "#06d6a0",
    radius: 2.5,
    minzoom: 12.5,
    labelMinzoom: 15,
    url: "/api/data/izmir-stops",
    refreshMs: 0,
    titleField: "ad",
    fields: [
      { key: "ad", label: "Durak", type: "text" },
      { key: "kod", label: "Durak no", type: "text" },
      { key: "hatlar", label: "Geçen hatlar", type: "text" },
    ],
  },

  // ---------------- Otopark ----------------
  {
    id: "ispark",
    title: "İSPARK otoparkları (anlık doluluk)",
    category: "Otopark",
    city: "İstanbul",
    provider: "İBB · İSPARK",
    license: "İBB Açık Veri Lisansı",
    sourceUrl: "https://data.ibb.gov.tr/dataset/ispark-otopark-listesi-web-servisi",
    geometry: "point",
    color: "#4895ef",
    colorBy: { field: "doluluk", stops: [[0, "#06d6a0"], [60, "#ffd166"], [85, "#ef476f"], [100, "#9d0208"]] },
    radius: 4.5,
    minzoom: 8,
    labelMinzoom: 14,
    url: "/api/data/ispark",
    refreshMs: 120_000,
    titleField: "ad",
    fields: [
      { key: "ad", label: "Otopark", type: "text" },
      { key: "ilce", label: "İlçe", type: "enum" },
      { key: "tip", label: "Tür", type: "enum" },
      { key: "doluluk", label: "Doluluk", type: "number", unit: "%" },
      { key: "bos", label: "Boş yer", type: "number" },
      { key: "kapasite", label: "Kapasite", type: "number" },
      { key: "ucretsizDk", label: "Ücretsiz süre", type: "number", unit: "dk" },
      { key: "calisma", label: "Çalışma saatleri", type: "text", filter: false },
      { key: "acik", label: "Açık", type: "bool" },
    ],
  },
  {
    id: "izmir-otopark",
    title: "İzmir akıllı otoparklar",
    category: "Otopark",
    city: "İzmir",
    provider: "İzmir BB · İZUM",
    license: "İzmir BB Açık Veri Lisansı",
    geometry: "point",
    color: "#4895ef",
    colorBy: { field: "doluluk", stops: [[0, "#06d6a0"], [60, "#ffd166"], [85, "#ef476f"], [100, "#9d0208"]] },
    radius: 5,
    url: "/api/data/izmir-otopark",
    refreshMs: 120_000,
    titleField: "ad",
    fields: [
      { key: "ad", label: "Otopark", type: "text" },
      { key: "doluluk", label: "Doluluk", type: "number", unit: "%" },
      { key: "bos", label: "Boş yer", type: "number" },
      { key: "kapasite", label: "Kapasite", type: "number" },
      { key: "tur", label: "Tür", type: "enum" },
      { key: "ucretli", label: "Ücretli", type: "bool" },
      { key: "isletmeci", label: "İşletmeci", type: "enum" },
    ],
  },

  // ---------------- Kamera ----------------
  {
    id: "cameras",
    title: "Belediye canlı kameraları",
    category: "Kamera",
    city: "Türkiye",
    provider: "13 belediye (İstanbul, Kahramanmaraş, Nevşehir, Kocaeli, Kayseri, Erzurum, Trabzon, Bursa…)",
    license: "Kurumların kullanım koşulları",
    description: "Belediyelerin halka açık yayınladığı şehir/turistik kameralar. Tıklayınca canlı izlenir.",
    geometry: "point",
    color: "#f72585",
    colorBy: { field: "kind", map: { hls: "#f72585", embed: "#ff70a6", page: "#7b2cbf", closed: "#495057" } },
    radius: 6,
    labelMinzoom: 11,
    url: "/api/data/cameras",
    refreshMs: 0,
    titleField: "name",
    fields: [
      { key: "name", label: "Kamera", type: "text" },
      { key: "city", label: "Şehir", type: "enum" },
      { key: "provider", label: "Yayıncı", type: "enum" },
      { key: "kind", label: "Oynatma", type: "enum" },
    ],
  },

  // ---------------- Afet ve Güvenlik ----------------
  {
    id: "izmir-toplanma",
    title: "Afet ve acil durum toplanma alanları",
    category: "Afet ve Güvenlik",
    city: "İzmir",
    provider: "İzmir BB",
    license: "İzmir BB Açık Veri Lisansı",
    geometry: "point",
    color: "#80ed99",
    radius: 3,
    minzoom: 10,
    labelMinzoom: 15,
    url: "/api/data/izmir-toplanma",
    refreshMs: 0,
    titleField: "ad",
    fields: [
      { key: "ad", label: "Alan", type: "text" },
      { key: "ilce", label: "İlçe", type: "enum" },
      { key: "mahalle", label: "Mahalle", type: "text" },
      { key: "yol", label: "Yol", type: "text", filter: false },
    ],
  },

  // ---------------- Sağlık ----------------
  {
    id: "hospitals",
    title: "Hastaneler",
    category: "Sağlık",
    city: "Türkiye",
    provider: "OpenStreetMap",
    license: "ODbL",
    sourceUrl: "https://www.openstreetmap.org",
    description:
      "81 ildeki devlet, şehir, eğitim-araştırma, üniversite ve özel hastaneler. Tür, adından ve işletmecisinden tahmin edilir; acil servis ve yatak bilgisi OSM'de girilmişse gösterilir.",
    geometry: "point",
    color: "#ef233c",
    colorBy: {
      field: "tur",
      map: {
        "Şehir hastanesi": "#ff006e",
        "Eğitim ve araştırma": "#fb5607",
        "Üniversite": "#ffbe0b",
        Devlet: "#ef233c",
        "Özel": "#3a86ff",
        "Vakıf": "#8338ec",
        "Askerî": "#6c757d",
        "Ağız ve diş": "#06d6a0",
        Belirsiz: "#adb5bd",
      },
    },
    radius: 4.5,
    labelMinzoom: 11,
    url: "/geo/hospitals.geojson",
    refreshMs: 0,
    titleField: "ad",
    fields: [
      { key: "ad", label: "Hastane", type: "text" },
      { key: "il", label: "İl", type: "enum" },
      { key: "ilce", label: "İlçe", type: "text" },
      { key: "tur", label: "Tür (tahmini)", type: "enum" },
      { key: "brans", label: "Branş", type: "enum" },
      { key: "acil", label: "Acil servis", type: "bool" },
      { key: "yatak", label: "Yatak sayısı", type: "number" },
      { key: "isletmeci", label: "İşletmeci", type: "enum" },
      { key: "adres", label: "Adres", type: "text", filter: false },
      { key: "telefon", label: "Telefon", type: "text", filter: false },
      { key: "web", label: "Web sitesi", type: "text", filter: false },
      { key: "osm", label: "OSM kaydı", type: "text", filter: false },
    ],
  },
  {
    id: "izmir-eczane",
    title: "Nöbetçi eczaneler",
    category: "Sağlık",
    city: "İzmir",
    provider: "İzmir BB",
    license: "İzmir BB Açık Veri Lisansı",
    geometry: "point",
    color: "#ff4d6d",
    radius: 5,
    labelMinzoom: 13,
    url: "/api/data/izmir-eczane",
    refreshMs: 3_600_000,
    titleField: "ad",
    fields: [
      { key: "ad", label: "Eczane", type: "text" },
      { key: "bolge", label: "Bölge", type: "enum" },
      { key: "adres", label: "Adres", type: "text" },
      { key: "telefon", label: "Telefon", type: "text", filter: false },
      { key: "not", label: "Not", type: "text", filter: false },
    ],
  },

  // ---------------- Şehir hizmetleri ----------------
  {
    id: "ibb-wifi",
    title: "İBB Wi-Fi noktaları",
    category: "Şehir Hizmetleri",
    city: "İstanbul",
    provider: "İBB",
    license: "İBB Açık Veri Lisansı",
    geometry: "point",
    color: "#b8c0ff",
    radius: 2.5,
    minzoom: 10,
    labelMinzoom: 15,
    url: "/api/data/ibb-wifi",
    refreshMs: 0,
    titleField: "ad",
    fields: [
      { key: "ad", label: "Konum", type: "text" },
      { key: "grup", label: "Grup", type: "enum" },
      { key: "tip", label: "Tür", type: "enum" },
    ],
  },
];

export const DATASET_BY_ID = new Map(DATASETS.map((d) => [d.id, d]));

export const CATEGORIES: Category[] = ["Ulaşım", "Otopark", "Kamera", "Afet ve Güvenlik", "Sağlık", "Şehir Hizmetleri"];

export const MODE_LABEL: Record<string, string> = {
  metro: "Metro",
  hafif_rayli: "Hafif raylı",
  tramvay: "Tramvay",
  funikuler: "Füniküler",
  teleferik: "Teleferik",
  monoray: "Monoray",
  tren: "Tren",
  vapur: "Vapur / feribot",
  hls: "Canlı (doğrudan)",
  embed: "Canlı (resmî oynatıcı)",
  closed: "Geçici kapalı",
  page: "Resmî sayfada",
};
