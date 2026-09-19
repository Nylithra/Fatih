const TZ = "Europe/Istanbul";

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} sn önce`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} sa önce`;
  return `${Math.round(h / 24)} gün önce`;
}

export function fmtTime(iso: string | number) {
  return new Date(iso).toLocaleTimeString("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(iso: string | number) {
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function fmtNum(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** WMO hava durumu kodlarının Türkçe karşılığı. */
export function wmoText(code: number | null | undefined) {
  if (code == null) return "—";
  if (code === 0) return "Açık";
  if (code === 1) return "Az bulutlu";
  if (code === 2) return "Parçalı bulutlu";
  if (code === 3) return "Kapalı";
  if (code === 45 || code === 48) return "Sis";
  if (code >= 51 && code <= 55) return "Çisenti";
  if (code === 56 || code === 57) return "Donan çisenti";
  if (code >= 61 && code <= 65) return "Yağmur";
  if (code === 66 || code === 67) return "Donan yağmur";
  if (code >= 71 && code <= 75) return "Kar";
  if (code === 77) return "Kar taneleri";
  if (code >= 80 && code <= 82) return "Sağanak";
  if (code === 85 || code === 86) return "Kar sağanağı";
  if (code === 95) return "Gök gürültülü fırtına";
  if (code === 96 || code === 99) return "Dolulu fırtına";
  return `Kod ${code}`;
}

export function isSevereWeather(code: number | null | undefined) {
  return code != null && (code >= 95 || code === 65 || code === 82 || code === 75 || code === 86 || code === 67);
}

/** Avrupa Hava Kalitesi İndeksi sınıfları. */
export function aqiClass(aqi: number | null | undefined): { label: string; tone: "good" | "fair" | "moderate" | "poor" | "bad" | "none" } {
  if (aqi == null) return { label: "—", tone: "none" };
  if (aqi <= 20) return { label: "İyi", tone: "good" };
  if (aqi <= 40) return { label: "Makul", tone: "fair" };
  if (aqi <= 60) return { label: "Orta", tone: "moderate" };
  if (aqi <= 80) return { label: "Kötü", tone: "poor" };
  return { label: aqi <= 100 ? "Çok kötü" : "Aşırı kötü", tone: "bad" };
}

export function kpClass(kp: number | null | undefined) {
  if (kp == null) return "—";
  if (kp < 4) return "Sakin";
  if (kp < 5) return "Aktif";
  if (kp < 6) return "G1 Fırtına";
  if (kp < 7) return "G2 Fırtına";
  if (kp < 8) return "G3 Fırtına";
  return "G4+ Fırtına";
}

export function compass(deg: number | null | undefined) {
  if (deg == null) return "—";
  const dirs = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
  return dirs[Math.round(deg / 45) % 8];
}
