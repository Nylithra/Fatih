import { cached } from "@/lib/cache";
import { envelope, failure, fetchJson } from "@/lib/http";
import type { SpaceWeather } from "@/lib/types";

export const dynamic = "force-dynamic";

type KpRow = { time_tag: string; Kp: number };
type Iss = { latitude: number; longitude: number; altitude: number; velocity: number; visibility: string };

export async function GET() {
  try {
    const c = await cached("space", 10_000, async (): Promise<SpaceWeather> => {
      const [kp, iss] = await Promise.allSettled([
        cached("kp", 10 * 60_000, () =>
          fetchJson<KpRow[]>("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"),
        ),
        fetchJson<Iss>("https://api.wheretheiss.at/v1/satellites/25544", { timeoutMs: 8000 }),
      ]);
      const last = kp.status === "fulfilled" ? kp.value.data.at(-1) : undefined;
      return {
        kp: last?.Kp ?? null,
        kpTime: last ? last.time_tag + "Z" : null,
        iss:
          iss.status === "fulfilled"
            ? {
                lat: iss.value.latitude,
                lon: iss.value.longitude,
                altKm: Math.round(iss.value.altitude),
                velocityKmh: Math.round(iss.value.velocity),
                visibility: iss.value.visibility,
              }
            : null,
      };
    });
    return envelope(c);
  } catch (e) {
    return failure(e);
  }
}
