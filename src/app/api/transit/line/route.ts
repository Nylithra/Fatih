import { NextRequest, NextResponse } from "next/server";
import { failure } from "@/lib/http";
import { allLines, lineStops, lineVehicles } from "@/lib/iett";
import { izmirLines, izmirLineVehicles, izmirRoute, izmirStops } from "@/lib/izmir";

export const dynamic = "force-dynamic";

/**
 * Hat takibi: güzergah + duraklar + hattaki canlı araçlar.
 *   /api/transit/line?city=istanbul&code=500T
 *   /api/transit/line?city=izmir&code=5
 */

export type LineResponse = {
  city: "istanbul" | "izmir";
  code: string;
  name: string;
  directions: { id: string; label: string; coords: [number, number][] }[];
  stops: { id: string; name: string; lat: number; lon: number; dir?: string; seq?: number }[];
  vehicles: { id: string; lat: number; lon: number; dir?: string; dirLabel?: string; nearStop?: string; time?: string }[];
  fetchedAt: number;
  notes: string[];
};

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city") === "izmir" ? "izmir" : "istanbul";
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toLocaleUpperCase("tr-TR");
  if (!code || code.length > 12) return failure(new Error("Geçersiz hat kodu"), 400);

  try {
    if (city === "istanbul") {
      const [lines, stopsR, busR] = await Promise.allSettled([allLines(), lineStops(code), lineVehicles(code)]);
      const line = lines.status === "fulfilled" ? lines.value.data.find((l) => l.SHATKODU === code) : undefined;
      const stops = stopsR.status === "fulfilled" ? stopsR.value.data : [];
      const buses = busR.status === "fulfilled" ? busR.value.data : [];
      if (!line && !stops.length && !buses.length) return failure(new Error(`${code} hattı bulunamadı`), 404);

      const dirs = [...new Set(stops.map((s) => s.yon))];
      const endName = (d: string) => stops.filter((s) => s.yon === d).at(-1)?.ad ?? d;
      const stopName = new Map(stops.map((s) => [s.kod, s.ad]));
      const body: LineResponse = {
        city,
        code,
        name: line?.SHATADI ?? buses[0]?.hatad ?? code,
        directions: dirs.map((d) => ({
          id: d,
          label: `${endName(d)} yönü`,
          coords: stops.filter((s) => s.yon === d).map((s) => [s.lon, s.lat] as [number, number]),
        })),
        stops: stops.map((s) => ({ id: `${s.yon}-${s.sira}-${s.kod}`, name: s.ad, lat: s.lat, lon: s.lon, dir: s.yon, seq: s.sira })),
        vehicles: buses.flatMap((b) => {
          const lat = Number(b.enlem), lon = Number(b.boylam);
          if (!lat || !lon) return [];
          const dir = b.guzergahkodu.split("_")[1];
          return [
            {
              id: b.kapino,
              lat,
              lon,
              dir,
              dirLabel: b.yon ? `${b.yon} yönü` : undefined,
              nearStop: stopName.get(b.yakinDurakKodu) ?? b.yakinDurakKodu,
              time: b.son_konum_zamani,
            },
          ];
        }),
        fetchedAt: Date.now(),
        notes: ["Güzergah çizgisi durak sırasına göre çizilmiştir (yol geometrisi değil)."],
      };
      return NextResponse.json({ ok: true, data: body });
    }

    // ---- İzmir ----
    const line = izmirLines().find((l) => l.no.toLocaleUpperCase("tr-TR") === code);
    const route = izmirRoute(line?.no ?? code);
    if (!line && !route) return failure(new Error(`${code} hattı bulunamadı`), 404);
    const busR = await izmirLineVehicles(line?.no ?? code).catch((e: Error) => e);
    const stops = izmirStops()
      .filter((s) => s[4].split("-").includes(line?.no ?? code))
      .map(([id, name, lat, lon]) => ({ id: String(id), name, lat, lon }));
    const body: LineResponse = {
      city,
      code,
      name: line?.name ?? code,
      directions: Object.entries(route ?? {}).map(([d, coords]) => ({
        id: d,
        label: d === "1" ? `${line?.to ?? "Bitiş"} yönü (gidiş)` : `${line?.from ?? "Başlangıç"} yönü (dönüş)`,
        coords,
      })),
      stops,
      vehicles:
        busR instanceof Error
          ? []
          : busR.data.filter((b) => b.lat && b.lon).map((b, i) => ({ id: `${b.id}-${i}`, lat: b.lat, lon: b.lon, dirLabel: `Yön kodu ${b.yon}` })),
      fetchedAt: Date.now(),
      notes: busR instanceof Error ? [`Canlı araç verisi alınamadı: ${busR.message}`] : [],
    };
    return NextResponse.json({ ok: true, data: body });
  } catch (e) {
    return failure(e);
  }
}
