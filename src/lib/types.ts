export type Earthquake = {
  id: string;
  source: "AFAD" | "Kandilli" | "USGS";
  mag: number;
  magType?: string;
  depthKm: number;
  lat: number;
  lon: number;
  place: string;
  province?: string;
  plate?: number; // Türkiye sınırları içindeyse il plaka kodu
  time: string; // ISO
};

export type Aircraft = {
  id: string; // ICAO24 hex
  callsign: string;
  reg?: string;
  type?: string;
  country?: string;
  lat: number;
  lon: number;
  altM: number | null;
  speedKmh: number | null;
  heading: number | null;
  vrateMs: number | null;
  squawk?: string;
  onGround: boolean;
  military: boolean;
  emergency: boolean;
};

export type NewsItem = {
  id: string;
  source: string;
  title: string;
  summary?: string;
  link: string;
  image?: string;
  published: string; // ISO
  provinces: number[]; // plaka kodları
};

export type FireEvent = {
  id: string;
  source: "EONET" | "FIRMS";
  title: string;
  lat: number;
  lon: number;
  plate?: number;
  time: string;
  confidence?: string;
  frp?: number; // Fire Radiative Power (MW)
  link?: string;
};

export type ProvinceWeather = {
  plate: number;
  temp: number | null;
  apparent: number | null;
  humidity: number | null;
  wind: number | null;
  windDir: number | null;
  code: number | null;
  precip: number | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
};

export type Rate = { code: string; name: string; buy: number | null; sell: number | null };

export type SpaceWeather = {
  kp: number | null;
  kpTime: string | null;
  iss: { lat: number; lon: number; altKm: number; velocityKmh: number; visibility: string } | null;
};
