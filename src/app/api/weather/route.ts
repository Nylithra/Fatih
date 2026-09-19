import { cached } from "@/lib/cache";
import { envelope, failure, fetchJson } from "@/lib/http";
import { PROVINCES } from "@/data/provinces";
import type { ProvinceWeather } from "@/lib/types";

export const dynamic = "force-dynamic";

type MeteoCurrent = {
  current: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    weather_code?: number;
    precipitation?: number;
  };
};
type AqCurrent = { current: { european_aqi?: number; pm2_5?: number; pm10?: number } };

const lats = PROVINCES.map((p) => p.lat).join(",");
const lons = PROVINCES.map((p) => p.lon).join(",");

export async function GET() {
  try {
    const c = await cached("weather", 15 * 60_000, async () => {
      const [wx, aq] = await Promise.allSettled([
        fetchJson<MeteoCurrent[]>(
          `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
            "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,precipitation" +
            "&timezone=Europe%2FIstanbul",
          { timeoutMs: 20000 },
        ),
        fetchJson<AqCurrent[]>(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}` +
            "&current=european_aqi,pm2_5,pm10&timezone=Europe%2FIstanbul",
          { timeoutMs: 20000 },
        ),
      ]);
      if (wx.status === "rejected" && aq.status === "rejected") throw wx.reason;
      const w = wx.status === "fulfilled" ? wx.value : [];
      const a = aq.status === "fulfilled" ? aq.value : [];
      const n = (v: number | undefined) => (typeof v === "number" ? v : null);
      return PROVINCES.map<ProvinceWeather>((p, i) => ({
        plate: p.plate,
        temp: n(w[i]?.current.temperature_2m),
        apparent: n(w[i]?.current.apparent_temperature),
        humidity: n(w[i]?.current.relative_humidity_2m),
        wind: n(w[i]?.current.wind_speed_10m),
        windDir: n(w[i]?.current.wind_direction_10m),
        code: n(w[i]?.current.weather_code),
        precip: n(w[i]?.current.precipitation),
        aqi: n(a[i]?.current.european_aqi),
        pm25: n(a[i]?.current.pm2_5),
        pm10: n(a[i]?.current.pm10),
      }));
    });
    return envelope(c);
  } catch (e) {
    return failure(e);
  }
}
