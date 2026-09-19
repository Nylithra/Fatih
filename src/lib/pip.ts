import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * İl sınırlarına göre nokta-poligon testi (sunucu tarafı).
 * Bir koordinatın hangi ile düştüğünü döndürür; Türkiye dışındaysa null.
 */

type Ring = [number, number][];
type Prov = { plate: number; bbox: [number, number, number, number]; polys: Ring[][] };

let cache: Prov[] | null = null;

function load(): Prov[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public", "geo", "tr-iller.geojson");
  const fc = JSON.parse(readFileSync(file, "utf8")) as GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { plate: number }>;
  cache = fc.features.map((f) => {
    const polys = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates) as Ring[][];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const poly of polys)
      for (const [x, y] of poly[0]) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    return { plate: f.properties.plate, bbox: [minX, minY, maxX, maxY], polys };
  });
  return cache;
}

function inRing(x: number, y: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function provinceAt(lon: number, lat: number): number | null {
  for (const p of load()) {
    const [a, b, c, d] = p.bbox;
    if (lon < a || lon > c || lat < b || lat > d) continue;
    for (const poly of p.polys) {
      if (!inRing(lon, lat, poly[0])) continue;
      if (poly.slice(1).some((hole) => inRing(lon, lat, hole))) continue;
      return p.plate;
    }
  }
  return null;
}
