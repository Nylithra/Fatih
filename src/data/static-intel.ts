/**
 * Açık kaynaklardan derlenmiş sabit stratejik noktalar.
 * Koordinatlar yaklaşık konumlardır; operasyonel amaçla değil, genel durum farkındalığı içindir.
 */

export type StaticPoint = {
  id: string;
  kind: "airport" | "port" | "strait" | "energy" | "dam";
  name: string;
  lat: number;
  lon: number;
  note?: string;
  code?: string;
};

export const AIRPORTS: StaticPoint[] = [
  { id: "IST", code: "IST", name: "İstanbul Havalimanı", lat: 41.2753, lon: 28.7519, kind: "airport" },
  { id: "SAW", code: "SAW", name: "Sabiha Gökçen", lat: 40.8986, lon: 29.3092, kind: "airport" },
  { id: "ESB", code: "ESB", name: "Ankara Esenboğa", lat: 40.1281, lon: 32.9951, kind: "airport" },
  { id: "ADB", code: "ADB", name: "İzmir Adnan Menderes", lat: 38.2924, lon: 27.157, kind: "airport" },
  { id: "AYT", code: "AYT", name: "Antalya", lat: 36.8987, lon: 30.8005, kind: "airport" },
  { id: "DLM", code: "DLM", name: "Dalaman", lat: 36.7131, lon: 28.7925, kind: "airport" },
  { id: "BJV", code: "BJV", name: "Milas-Bodrum", lat: 37.2506, lon: 27.6643, kind: "airport" },
  { id: "GZP", code: "GZP", name: "Gazipaşa-Alanya", lat: 36.2992, lon: 32.3006, kind: "airport" },
  { id: "COV", code: "COV", name: "Çukurova", lat: 36.8886, lon: 35.0633, kind: "airport" },
  { id: "TZX", code: "TZX", name: "Trabzon", lat: 40.9951, lon: 39.7897, kind: "airport" },
  { id: "RZV", code: "RZV", name: "Rize-Artvin", lat: 41.1705, lon: 40.836, kind: "airport" },
  { id: "SZF", code: "SZF", name: "Samsun Çarşamba", lat: 41.2545, lon: 36.5671, kind: "airport" },
  { id: "GZT", code: "GZT", name: "Gaziantep", lat: 36.9472, lon: 37.4787, kind: "airport" },
  { id: "ASR", code: "ASR", name: "Kayseri Erkilet", lat: 38.7704, lon: 35.4954, kind: "airport" },
  { id: "KYA", code: "KYA", name: "Konya", lat: 37.979, lon: 32.5619, kind: "airport" },
  { id: "DIY", code: "DIY", name: "Diyarbakır", lat: 37.8939, lon: 40.201, kind: "airport" },
  { id: "ERZ", code: "ERZ", name: "Erzurum", lat: 39.9565, lon: 41.1702, kind: "airport" },
  { id: "VAN", code: "VAN", name: "Van Ferit Melen", lat: 38.4682, lon: 43.3323, kind: "airport" },
  { id: "MLX", code: "MLX", name: "Malatya", lat: 38.4353, lon: 38.091, kind: "airport" },
  { id: "EZS", code: "EZS", name: "Elazığ", lat: 38.6069, lon: 39.2914, kind: "airport" },
  { id: "HTY", code: "HTY", name: "Hatay", lat: 36.3628, lon: 36.2822, kind: "airport" },
];

export const PORTS: StaticPoint[] = [
  { id: "ambarli", name: "Ambarlı Limanı", lat: 40.97, lon: 28.68, kind: "port", note: "Türkiye'nin en büyük konteyner limanı" },
  { id: "haydarpasa", name: "Haydarpaşa Limanı", lat: 41.0, lon: 29.02, kind: "port" },
  { id: "kocaeli", name: "Kocaeli Körfez Limanları", lat: 40.75, lon: 29.83, kind: "port", note: "Derince, Yarımca, Evyap" },
  { id: "mersin", name: "Mersin Uluslararası Limanı", lat: 36.79, lon: 34.65, kind: "port" },
  { id: "izmir", name: "İzmir Alsancak Limanı", lat: 38.44, lon: 27.15, kind: "port" },
  { id: "aliaga", name: "Aliağa Limanları", lat: 38.83, lon: 26.95, kind: "port", note: "Petrokimya ve konteyner" },
  { id: "iskenderun", name: "İskenderun Limanı", lat: 36.59, lon: 36.18, kind: "port" },
  { id: "ceyhan", name: "Ceyhan Petrol Terminali", lat: 36.88, lon: 35.93, kind: "port", note: "BTC ve Kerkük-Yumurtalık hatları" },
  { id: "samsun", name: "Samsun Limanı", lat: 41.3, lon: 36.34, kind: "port" },
  { id: "trabzon", name: "Trabzon Limanı", lat: 41.0, lon: 39.75, kind: "port" },
  { id: "bandirma", name: "Bandırma Limanı", lat: 40.36, lon: 27.97, kind: "port" },
  { id: "antalya", name: "Antalya Limanı", lat: 36.84, lon: 30.61, kind: "port" },
  { id: "filyos", name: "Filyos Limanı", lat: 41.56, lon: 32.02, kind: "port", note: "Sakarya Gaz Sahası kara tesisi yakını" },
];

export const STRAITS: StaticPoint[] = [
  { id: "bogazici", name: "İstanbul Boğazı", lat: 41.12, lon: 29.07, kind: "strait", note: "Montrö Sözleşmesi kapsamında uluslararası geçiş" },
  { id: "canakkale", name: "Çanakkale Boğazı", lat: 40.15, lon: 26.4, kind: "strait", note: "Montrö Sözleşmesi kapsamında uluslararası geçiş" },
];

export const ENERGY: StaticPoint[] = [
  { id: "akkuyu", name: "Akkuyu Nükleer Güç Santrali", lat: 36.14, lon: 33.53, kind: "energy" },
  { id: "tupras-izmit", name: "Tüpraş İzmit Rafinerisi", lat: 40.76, lon: 29.79, kind: "energy" },
  { id: "star", name: "STAR Rafinerisi", lat: 38.78, lon: 26.93, kind: "energy" },
  { id: "turkakim", name: "TürkAkım Kıyıköy Karaya Çıkış", lat: 41.63, lon: 28.1, kind: "energy" },
  { id: "ataturk", name: "Atatürk Barajı", lat: 37.48, lon: 38.32, kind: "dam" },
  { id: "keban", name: "Keban Barajı", lat: 38.8, lon: 38.75, kind: "dam" },
  { id: "ilisu", name: "Ilısu Barajı", lat: 37.53, lon: 41.85, kind: "dam" },
];

/**
 * Ana fay zonlarının ŞEMATİK izleri. Gerçek fay geometrisi için MTA Diri Fay Haritası kullanılmalıdır.
 */
export const FAULTS: { id: string; name: string; coords: [number, number][] }[] = [
  {
    id: "kaf",
    name: "Kuzey Anadolu Fay Zonu (şematik)",
    coords: [
      [26.6, 40.6], [27.5, 40.75], [28.5, 40.8], [29.4, 40.72], [29.9, 40.72], [30.3, 40.7],
      [31.0, 40.75], [32.2, 40.8], [33.6, 40.9], [34.0, 41.0], [35.5, 40.9], [36.95, 40.6],
      [38.1, 40.15], [39.5, 39.75], [41.0, 39.3],
    ],
  },
  {
    id: "daf",
    name: "Doğu Anadolu Fay Zonu (şematik)",
    coords: [
      [41.0, 39.3], [40.5, 38.9], [39.9, 38.7], [39.3, 38.45], [38.9, 38.2], [37.65, 37.8],
      [36.85, 37.4], [36.4, 36.8], [36.15, 36.2],
    ],
  },
];
