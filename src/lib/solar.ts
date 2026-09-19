/** Gündüz/gece sınırı (terminatör) için gece yarımküresi poligonu üretir. */

const rad = Math.PI / 180;

export function subsolarPoint(date = new Date()) {
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  let lon = ra / rad - gmst * 15;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: dec / rad, lon };
}

export function nightPolygon(date = new Date()): GeoJSON.Feature<GeoJSON.Polygon> {
  const { lat: decDeg, lon: sunLon } = subsolarPoint(date);
  const dec = (Math.abs(decDeg) < 0.01 ? 0.01 : decDeg) * rad;
  const ring: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / Math.tan(dec)) / rad;
    ring.push([lon, Math.max(-85, Math.min(85, lat))]);
  }
  const pole = dec > 0 ? -85 : 85;
  ring.push([180, pole], [-180, pole], ring[0]);
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}
