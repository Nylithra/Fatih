import type { ExpressionSpecification, GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { DATASETS, type DatasetMeta } from "@/catalog/meta";
import { DEFAULT_STYLE, type LayerStyle } from "@/lib/filters";
import type { LineResponse } from "@/app/api/transit/line/route";
import { DIR_COLORS } from "../LineTracker";

/**
 * Katalog veri setleri, hat takibi, arama işaretçisi ve katman stil ayarları.
 * MapView'ın yükleme ve senkron adımlarından çağrılır.
 */

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export const dsLayer = (id: string) => `ds-${id}`;
export const dsLabel = (id: string) => `ds-${id}-label`;
export const DATASET_LAYER_IDS = DATASETS.map((d) => dsLayer(d.id));

function colorExpr(d: DatasetMeta): ExpressionSpecification | string {
  const cb = d.colorBy;
  let base: ExpressionSpecification | string = d.color;
  if (cb && "map" in cb) {
    const pairs = Object.entries(cb.map).flat();
    base = ["match", ["to-string", ["get", cb.field]], ...pairs, d.color] as unknown as ExpressionSpecification;
  } else if (cb && "stops" in cb) {
    const [first, ...rest] = cb.stops;
    base = ["step", ["to-number", ["coalesce", ["get", cb.field], 0]], first[1], ...rest.flat()] as unknown as ExpressionSpecification;
  }
  if (d.lineColorField) {
    return [
      "case",
      ["all", ["has", d.lineColorField], ["!=", ["get", d.lineColorField], ""]],
      ["to-color", ["get", d.lineColorField], base],
      base,
    ] as unknown as ExpressionSpecification;
  }
  return base;
}

/** Katalog katmanlarını ekler (başlangıçta gizli). `beforeId` canlı katmanların altına yerleştirir. */
export function addDatasetLayers(map: MLMap, beforeId?: string) {
  // Çizgiler önce (altta), noktalar sonra
  const ordered = [...DATASETS].sort((a, b) => (a.geometry === "line" ? -1 : 0) - (b.geometry === "line" ? -1 : 0));
  for (const d of ordered) {
    map.addSource(dsLayer(d.id), { type: "geojson", data: EMPTY, attribution: d.provider === "OpenStreetMap" ? "© OpenStreetMap (ODbL)" : undefined });
    if (d.geometry === "line") {
      map.addLayer(
        {
          id: dsLayer(d.id),
          type: "line",
          source: dsLayer(d.id),
          layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": colorExpr(d) as ExpressionSpecification,
            "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1, 10, 2.2, 14, 4],
            "line-opacity": ["match", ["get", "mode"], "tren", 0.55, 0.9],
          },
        },
        beforeId,
      );
    } else {
      map.addLayer(
        {
          id: dsLayer(d.id),
          type: "circle",
          source: dsLayer(d.id),
          minzoom: d.minzoom ?? 0,
          layout: { visibility: "none" },
          paint: {
            "circle-color": colorExpr(d) as ExpressionSpecification,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, d.radius ?? 4, 14, (d.radius ?? 4) * 1.8],
            "circle-stroke-color": "#05080c",
            "circle-stroke-width": 1,
            "circle-opacity": 0.92,
          },
        },
        beforeId,
      );
    }
    map.addLayer(
      {
        id: dsLabel(d.id),
        type: "symbol",
        source: dsLayer(d.id),
        minzoom: d.labelMinzoom ?? 13,
        layout: {
          visibility: "none",
          "text-field": ["to-string", ["coalesce", ["get", d.titleField], ""]],
          "text-size": 11,
          "text-font": ["Open Sans Regular"],
          ...(d.geometry === "line"
            ? { "symbol-placement": "line", "text-max-angle": 30 }
            : { "text-offset": [0, 1.1], "text-anchor": "top", "text-optional": true }),
        },
        paint: { "text-color": "#d9e2ec", "text-halo-color": "#05080c", "text-halo-width": 1.3 },
      },
      beforeId,
    );
  }
}

/** Hat takibi ve arama işaretçisi katmanları (en üstte). */
export function addTrackLayers(map: MLMap) {
  map.addSource("track-route", { type: "geojson", data: EMPTY });
  map.addSource("track-stops", { type: "geojson", data: EMPTY });
  map.addSource("track-veh", { type: "geojson", data: EMPTY });
  map.addSource("pin", { type: "geojson", data: EMPTY });
  map.addLayer({
    id: "track-route-casing",
    type: "line",
    source: "track-route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#05080c", "line-width": 7, "line-opacity": 0.7 },
  });
  map.addLayer({
    id: "track-route",
    type: "line",
    source: "track-route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": ["get", "color"], "line-width": 4, "line-offset": ["get", "offset"] },
  });
  map.addLayer({
    id: "track-stops",
    type: "circle",
    source: "track-stops",
    paint: { "circle-color": "#fff", "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2, 15, 4.5], "circle-stroke-color": "#05080c", "circle-stroke-width": 1.2 },
  });
  map.addLayer({
    id: "track-stops-label",
    type: "symbol",
    source: "track-stops",
    minzoom: 13.5,
    layout: { "text-field": ["get", "name"], "text-size": 10.5, "text-offset": [0, 1], "text-anchor": "top", "text-font": ["Open Sans Regular"], "text-optional": true },
    paint: { "text-color": "#e9eef3", "text-halo-color": "#05080c", "text-halo-width": 1.2 },
  });
  map.addLayer({
    id: "track-veh",
    type: "circle",
    source: "track-veh",
    paint: {
      "circle-color": ["get", "color"],
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 5, 15, 9],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "track-veh-label",
    type: "symbol",
    source: "track-veh",
    minzoom: 11,
    layout: { "text-field": ["get", "id"], "text-size": 10, "text-offset": [0, 1.4], "text-anchor": "top", "text-font": ["Open Sans Bold"], "text-allow-overlap": true },
    paint: { "text-color": "#fff", "text-halo-color": "#05080c", "text-halo-width": 1.3 },
  });
  map.addLayer({
    id: "pin",
    type: "circle",
    source: "pin",
    paint: { "circle-color": "rgba(0,0,0,0)", "circle-radius": 13, "circle-stroke-color": "#e30a17", "circle-stroke-width": 3 },
  });
  map.addLayer({
    id: "pin-label",
    type: "symbol",
    source: "pin",
    layout: { "text-field": ["get", "label"], "text-size": 12, "text-offset": [0, 1.8], "text-anchor": "top", "text-font": ["Open Sans Bold"], "text-allow-overlap": true },
    paint: { "text-color": "#fff", "text-halo-color": "#e30a17", "text-halo-width": 2 },
  });
}

const memo = new WeakMap<MLMap, Map<string, unknown>>();
function changed(map: MLMap, key: string, value: unknown) {
  let m = memo.get(map);
  if (!m) memo.set(map, (m = new Map()));
  if (m.get(key) === value) return false;
  m.set(key, value);
  return true;
}

export function syncDatasets(
  map: MLMap,
  on: Record<string, boolean>,
  data: Record<string, GeoJSON.FeatureCollection | undefined>,
  styles: Record<string, LayerStyle | undefined>,
) {
  for (const d of DATASETS) {
    const id = dsLayer(d.id);
    if (!map.getLayer(id)) continue;
    const visible = Boolean(on[d.id]);
    const st = styles[d.id] ?? DEFAULT_STYLE;
    if (changed(map, `vis:${d.id}`, `${visible}:${st.labels}`)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      map.setLayoutProperty(dsLabel(d.id), "visibility", visible && st.labels ? "visible" : "none");
    }
    const fc = data[d.id];
    if (fc && changed(map, `data:${d.id}`, fc)) (map.getSource(id) as GeoJSONSource).setData(fc);
    if (changed(map, `style:${d.id}`, `${st.opacity}:${st.size}`)) {
      if (d.geometry === "line") {
        map.setPaintProperty(id, "line-opacity", ["*", ["match", ["get", "mode"], "tren", 0.55, 0.9], st.opacity]);
        map.setPaintProperty(id, "line-width", ["interpolate", ["linear"], ["zoom"], 6, 1 * st.size, 10, 2.2 * st.size, 14, 4 * st.size]);
      } else {
        const r = d.radius ?? 4;
        map.setPaintProperty(id, "circle-opacity", 0.92 * st.opacity);
        map.setPaintProperty(id, "circle-stroke-opacity", st.opacity);
        map.setPaintProperty(id, "circle-radius", ["interpolate", ["linear"], ["zoom"], 8, r * st.size, 14, r * 1.8 * st.size]);
      }
    }
  }
}

/** Çekirdek katmanlara opaklık/boyut/etiket ayarı uygular. Temel ifadeler ilk çağrıda saklanır. */
const CORE_PAINT: Record<string, { layers: string[]; opacity: [string, string][]; size: [string, string][]; labels: string[] }> = {
  quakes: { layers: ["quakes", "quakes-halo"], opacity: [["quakes", "circle-opacity"], ["quakes-halo", "circle-stroke-opacity"]], size: [["quakes", "circle-radius"], ["quakes-halo", "circle-radius"]], labels: [] },
  flights: { layers: ["flights"], opacity: [["flights", "icon-opacity"]], size: [], labels: ["flights-label"] },
  fires: { layers: ["fires"], opacity: [["fires", "circle-opacity"]], size: [["fires", "circle-radius"]], labels: [] },
  news: { layers: ["news"], opacity: [["news", "circle-opacity"], ["news", "circle-stroke-opacity"]], size: [["news", "circle-radius"]], labels: ["news-count"] },
};
const basePaint = new WeakMap<MLMap, Map<string, unknown>>();
type PaintProp = Parameters<MLMap["getPaintProperty"]>[1];
type PaintValue = Parameters<MLMap["setPaintProperty"]>[2];

export function syncCoreStyles(map: MLMap, styles: Record<string, LayerStyle | undefined>, visible: Record<string, boolean>) {
  let base = basePaint.get(map);
  if (!base) basePaint.set(map, (base = new Map()));
  for (const [key, def] of Object.entries(CORE_PAINT)) {
    const st = styles[key] ?? DEFAULT_STYLE;
    if (!changed(map, `core:${key}`, `${st.opacity}:${st.size}:${st.labels}:${visible[key]}`)) continue;
    for (const [layer, prop] of def.opacity) {
      const k = `${layer}|${prop}`;
      if (!base.has(k)) base.set(k, map.getPaintProperty(layer, prop as PaintProp) ?? 1);
      map.setPaintProperty(layer, prop as PaintProp, (st.opacity === 1 ? base.get(k) : ["*", base.get(k), st.opacity]) as PaintValue);
    }
    for (const [layer, prop] of def.size) {
      const k = `${layer}|${prop}`;
      if (!base.has(k)) base.set(k, map.getPaintProperty(layer, prop as PaintProp));
      map.setPaintProperty(layer, prop as PaintProp, (st.size === 1 ? base.get(k) : ["*", base.get(k), st.size]) as PaintValue);
    }
    if (key === "flights") {
      map.setLayoutProperty("flights", "icon-size", ["interpolate", ["linear"], ["zoom"], 4, 0.45 * st.size, 8, 0.8 * st.size]);
    }
    for (const l of def.labels) map.setLayoutProperty(l, "visibility", visible[key] && st.labels ? "visible" : "none");
  }
}

export function syncTrack(map: MLMap, track: LineResponse | null) {
  if (!changed(map, "track", track)) return;
  const dirIdx = new Map(track?.directions.map((d, i) => [d.id, i]) ?? []);
  const col = (dir?: string) => DIR_COLORS[(dirIdx.get(dir ?? "") ?? 0) % DIR_COLORS.length];
  const route: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: (track?.directions ?? [])
      .filter((d) => d.coords.length > 1)
      .map((d, i) => ({
        type: "Feature",
        properties: { color: DIR_COLORS[i % DIR_COLORS.length], offset: i === 0 ? -2 : 2 },
        geometry: { type: "LineString", coordinates: d.coords },
      })),
  };
  const stops: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: (track?.stops ?? []).map((s) => ({ type: "Feature", properties: { name: s.name }, geometry: { type: "Point", coordinates: [s.lon, s.lat] } })),
  };
  const veh: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: (track?.vehicles ?? []).map((v) => ({
      type: "Feature",
      properties: { id: v.id, color: col(v.dir) },
      geometry: { type: "Point", coordinates: [v.lon, v.lat] },
    })),
  };
  (map.getSource("track-route") as GeoJSONSource).setData(route);
  (map.getSource("track-stops") as GeoJSONSource).setData(stops);
  (map.getSource("track-veh") as GeoJSONSource).setData(veh);
}

export function syncPin(map: MLMap, pin: { lon: number; lat: number; label: string } | null) {
  if (!changed(map, "pin", pin)) return;
  (map.getSource("pin") as GeoJSONSource).setData(
    pin ? { type: "FeatureCollection", features: [{ type: "Feature", properties: { label: pin.label }, geometry: { type: "Point", coordinates: [pin.lon, pin.lat] } }] } : EMPTY,
  );
}

/** Rota sığdırma için sınırlayıcı kutu. */
export function trackBounds(track: LineResponse): [[number, number], [number, number]] | null {
  const pts = track.directions.flatMap((d) => d.coords);
  if (!pts.length) return null;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of pts) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  return [
    [a, b],
    [c, d],
  ];
}
