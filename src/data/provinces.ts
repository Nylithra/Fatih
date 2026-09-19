/** Türkiye'nin 81 ili — plaka kodu, il merkezi koordinatı ve coğrafi bölge. */

export type Region =
  | "Marmara"
  | "Ege"
  | "Akdeniz"
  | "İç Anadolu"
  | "Karadeniz"
  | "Doğu Anadolu"
  | "Güneydoğu Anadolu";

export type Province = { plate: number; name: string; lat: number; lon: number; region: Region };

const R = {
  M: "Marmara",
  E: "Ege",
  A: "Akdeniz",
  I: "İç Anadolu",
  K: "Karadeniz",
  D: "Doğu Anadolu",
  G: "Güneydoğu Anadolu",
} as const satisfies Record<string, Region>;

// [plaka, ad, enlem, boylam, bölge]
const RAW: [number, string, number, number, keyof typeof R][] = [
  [1, "Adana", 37.0, 35.3213, "A"],
  [2, "Adıyaman", 37.7648, 38.2786, "G"],
  [3, "Afyonkarahisar", 38.7569, 30.5387, "E"],
  [4, "Ağrı", 39.7191, 43.0503, "D"],
  [5, "Amasya", 40.6499, 35.8353, "K"],
  [6, "Ankara", 39.9334, 32.8597, "I"],
  [7, "Antalya", 36.8969, 30.7133, "A"],
  [8, "Artvin", 41.1828, 41.8183, "K"],
  [9, "Aydın", 37.856, 27.8416, "E"],
  [10, "Balıkesir", 39.6484, 27.8826, "M"],
  [11, "Bilecik", 40.1426, 29.9793, "M"],
  [12, "Bingöl", 38.8847, 40.4982, "D"],
  [13, "Bitlis", 38.4006, 42.1095, "D"],
  [14, "Bolu", 40.7395, 31.6061, "K"],
  [15, "Burdur", 37.7203, 30.2908, "A"],
  [16, "Bursa", 40.1885, 29.061, "M"],
  [17, "Çanakkale", 40.1553, 26.4142, "M"],
  [18, "Çankırı", 40.6013, 33.6134, "I"],
  [19, "Çorum", 40.5506, 34.9556, "K"],
  [20, "Denizli", 37.7765, 29.0864, "E"],
  [21, "Diyarbakır", 37.9144, 40.2306, "G"],
  [22, "Edirne", 41.6818, 26.5623, "M"],
  [23, "Elazığ", 38.6743, 39.2232, "D"],
  [24, "Erzincan", 39.75, 39.5, "D"],
  [25, "Erzurum", 39.9043, 41.2679, "D"],
  [26, "Eskişehir", 39.7767, 30.5206, "I"],
  [27, "Gaziantep", 37.0662, 37.3833, "G"],
  [28, "Giresun", 40.9128, 38.3895, "K"],
  [29, "Gümüşhane", 40.4386, 39.5086, "K"],
  [30, "Hakkari", 37.5744, 43.7408, "D"],
  [31, "Hatay", 36.2025, 36.1606, "A"],
  [32, "Isparta", 37.7648, 30.5566, "A"],
  [33, "Mersin", 36.8121, 34.6415, "A"],
  [34, "İstanbul", 41.0082, 28.9784, "M"],
  [35, "İzmir", 38.4237, 27.1428, "E"],
  [36, "Kars", 40.6013, 43.0975, "D"],
  [37, "Kastamonu", 41.3887, 33.7827, "K"],
  [38, "Kayseri", 38.7312, 35.4787, "I"],
  [39, "Kırklareli", 41.7333, 27.2167, "M"],
  [40, "Kırşehir", 39.1425, 34.1709, "I"],
  [41, "Kocaeli", 40.7654, 29.9408, "M"],
  [42, "Konya", 37.8746, 32.4932, "I"],
  [43, "Kütahya", 39.4167, 29.9833, "E"],
  [44, "Malatya", 38.3552, 38.3095, "D"],
  [45, "Manisa", 38.6191, 27.4289, "E"],
  [46, "Kahramanmaraş", 37.5858, 36.9371, "A"],
  [47, "Mardin", 37.3212, 40.7245, "G"],
  [48, "Muğla", 37.2153, 28.3636, "E"],
  [49, "Muş", 38.9462, 41.7539, "D"],
  [50, "Nevşehir", 38.6939, 34.6857, "I"],
  [51, "Niğde", 37.9667, 34.6833, "I"],
  [52, "Ordu", 40.9839, 37.8764, "K"],
  [53, "Rize", 41.0201, 40.5234, "K"],
  [54, "Sakarya", 40.7569, 30.3781, "M"],
  [55, "Samsun", 41.2928, 36.3313, "K"],
  [56, "Siirt", 37.9333, 41.95, "G"],
  [57, "Sinop", 42.0231, 35.1531, "K"],
  [58, "Sivas", 39.7477, 37.0179, "I"],
  [59, "Tekirdağ", 40.9833, 27.5167, "M"],
  [60, "Tokat", 40.3167, 36.55, "K"],
  [61, "Trabzon", 41.0015, 39.7178, "K"],
  [62, "Tunceli", 39.1079, 39.5401, "D"],
  [63, "Şanlıurfa", 37.1591, 38.7969, "G"],
  [64, "Uşak", 38.6823, 29.4082, "E"],
  [65, "Van", 38.4891, 43.4089, "D"],
  [66, "Yozgat", 39.8181, 34.8147, "I"],
  [67, "Zonguldak", 41.4564, 31.7987, "K"],
  [68, "Aksaray", 38.3687, 34.037, "I"],
  [69, "Bayburt", 40.2552, 40.2249, "K"],
  [70, "Karaman", 37.1759, 33.2287, "I"],
  [71, "Kırıkkale", 39.8468, 33.5153, "I"],
  [72, "Batman", 37.8812, 41.1351, "G"],
  [73, "Şırnak", 37.5164, 42.4611, "G"],
  [74, "Bartın", 41.6344, 32.3375, "K"],
  [75, "Ardahan", 41.1105, 42.7022, "D"],
  [76, "Iğdır", 39.9237, 44.045, "D"],
  [77, "Yalova", 40.65, 29.2667, "M"],
  [78, "Karabük", 41.2061, 32.6204, "K"],
  [79, "Kilis", 36.7184, 37.1212, "G"],
  [80, "Osmaniye", 37.0742, 36.2478, "A"],
  [81, "Düzce", 40.8438, 31.1565, "K"],
];

export const PROVINCES: Province[] = RAW.map(([plate, name, lat, lon, r]) => ({
  plate,
  name,
  lat,
  lon,
  region: R[r],
}));

export const PROVINCE_BY_PLATE = new Map(PROVINCES.map((p) => [p.plate, p]));

export const REGIONS: Region[] = [
  "Marmara",
  "Ege",
  "Akdeniz",
  "İç Anadolu",
  "Karadeniz",
  "Doğu Anadolu",
  "Güneydoğu Anadolu",
];

/** Türkiye ve yakın çevresi için sınırlayıcı kutu (deprem/uçuş sorguları için). */
export const TR_BBOX = { minLat: 35.5, maxLat: 42.5, minLon: 25.5, maxLon: 45.0 } as const;
export const TR_CENTER: [number, number] = [35.2, 39.0];

/** Karşılaştırma için Türkçe büyük/küçük harf duyarsız normalize. */
export function trNorm(s: string) {
  return s.toLocaleLowerCase("tr-TR").normalize("NFC");
}

const BY_NORM = new Map(PROVINCES.map((p) => [trNorm(p.name), p]));
BY_NORM.set(trNorm("Afyon"), PROVINCE_BY_PLATE.get(3)!);
BY_NORM.set(trNorm("Maraş"), PROVINCE_BY_PLATE.get(46)!);
BY_NORM.set(trNorm("Urfa"), PROVINCE_BY_PLATE.get(63)!);
BY_NORM.set(trNorm("İçel"), PROVINCE_BY_PLATE.get(33)!);
BY_NORM.set(trNorm("Antep"), PROVINCE_BY_PLATE.get(27)!);

export function provinceByName(name?: string | null) {
  if (!name) return undefined;
  return BY_NORM.get(trNorm(name.trim()));
}

/** En yakın il merkezini bulur (haversine). */
export function nearestProvince(lat: number, lon: number) {
  let best = PROVINCES[0];
  let bestD = Infinity;
  for (const p of PROVINCES) {
    const d = haversineKm(lat, lon, p.lat, p.lon);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return { province: best, distanceKm: bestD };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
