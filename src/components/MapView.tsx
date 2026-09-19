"use client";

import { useEffect, useRef } from "react";
import {
  Map as MLMap,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { PROVINCES, PROVINCE_BY_PLATE, TR_CENTER } from "@/data/provinces";
import { AIRPORTS, ENERGY, FAULTS, PORTS, STRAITS, type StaticPoint } from "@/data/static-intel";
import { nightPolygon } from "@/lib/solar";
import type { Choropleth, LayerId, Selection } from "@/lib/layers";
import type { Aircraft, Earthquake, FireEvent, NewsItem, ProvinceWeather, SpaceWeather } from "@/lib/types";
import type { LayerStyle } from "@/lib/filters";
import type { LineResponse } from "@/app/api/transit/line/route";
import {
  DATASET_LAYER_IDS,
  addDatasetLayers,
  addTrackLayers,
  syncCoreStyles,
  syncDatasets,
  syncPin,
  syncTrack,
  trackBounds,
} from "./map/overlays";

/** Harita katmanlarında kullanılan renkler (globals.css'teki değişkenlerle aynı). */
export const MAP_COLORS = {
  quake: "#ff5a5f",
  flight: "#4cc9f0",
  military: "#ffb703",
  emergency: "#ff006e",
  news: "#b388ff",
  fire: "#ff8c42",
  weather: "#9be564",
  fault: "#ff3b3b",
  airport: "#8ecae6",
  port: "#48cae4",
  energy: "#f9c74f",
  iss: "#ffffff",
};

const BASEMAP = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type Props = {
  layers: Record<LayerId, boolean>;
  choropleth: Choropleth;
  quakes: Earthquake[];
  flights: Aircraft[];
  news: NewsItem[];
  fires: FireEvent[];
  weather: ProvinceWeather[];
  space: SpaceWeather | null;
  selection: Selection;
  focus: { lon: number; lat: number; zoom?: number; seq: number } | null;
  /** Artınca harita Türkiye'ye sığdırılır */
  fitSeq: number;
  datasetsOn: Record<string, boolean>;
  datasets: Record<string, GeoJSON.FeatureCollection | undefined>;
  styles: Record<string, LayerStyle | undefined>;
  track: LineResponse | null;
  pin: { lon: number; lat: number; label: string } | null;
  onCamera: (id: string) => void;
  onSelect: (s: Selection) => void;
  onCursor: (c: { lon: number; lat: number; zoom: number }) => void;
};

const fc = <P,>(features: GeoJSON.Feature<GeoJSON.Geometry, P>[]): GeoJSON.FeatureCollection<GeoJSON.Geometry, P> => ({
  type: "FeatureCollection",
  features,
});
const pt = <P,>(lon: number, lat: number, properties: P, id?: string | number): GeoJSON.Feature<GeoJSON.Point, P> => ({
  type: "Feature",
  id,
  properties,
  geometry: { type: "Point", coordinates: [lon, lat] },
});

function planeIcon(size = 48) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.translate(size / 2, size / 2);
  g.scale(size / 48, size / 48);
  g.fillStyle = "#fff";
  g.beginPath();
  // Burun yukarıda (kuzey), heading ile döndürülür
  g.moveTo(0, -20);
  g.lineTo(3, -12);
  g.lineTo(3, -4);
  g.lineTo(18, 5);
  g.lineTo(18, 9);
  g.lineTo(3, 4);
  g.lineTo(3, 13);
  g.lineTo(8, 17);
  g.lineTo(8, 20);
  g.lineTo(0, 17);
  g.lineTo(-8, 20);
  g.lineTo(-8, 17);
  g.lineTo(-3, 13);
  g.lineTo(-3, 4);
  g.lineTo(-18, 9);
  g.lineTo(-18, 5);
  g.lineTo(-3, -4);
  g.lineTo(-3, -12);
  g.closePath();
  g.fill();
  const img = g.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(img.data.buffer) };
}

function staticFeatures(list: StaticPoint[]) {
  return fc(list.map((p) => pt(p.lon, p.lat, { id: p.id, name: p.name, kind: p.kind, code: p.code ?? "" })));
}

const STATIC_INDEX = new Map([...AIRPORTS, ...PORTS, ...STRAITS, ...ENERGY].map((p) => [p.id, p]));

export default function MapView(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  // ---- Haritayı bir kez kur ----
  useEffect(() => {
    if (!el.current) return;
    setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
    const map = new MLMap({
      container: el.current,
      style: BASEMAP,
      center: TR_CENTER,
      zoom: 5.4,
      minZoom: 3,
      maxZoom: 14,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __fatihMap: MLMap }).__fatihMap = map;
    map.on("error", (e) => console.warn("[harita]", e.error?.message ?? e));
    map.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      // Atıf metni başlangıçta kapalı ("i" düğmesiyle açılır); haritanın altını kalabalıklaştırmasın
      el.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      // Altlık etiketlerini Türkçe göster (OpenMapTiles name:tr alanı)
      for (const l of map.getStyle().layers) {
        if (l.type !== "symbol" || l.id === "housenumber") continue;
        const tf = JSON.stringify(map.getLayoutProperty(l.id, "text-field") ?? "");
        if (tf.includes("name")) map.setLayoutProperty(l.id, "text-field", ["coalesce", ["get", "name:tr"], ["get", "name:latin"], ["get", "name"]]);
      }

      // Türkiye'yi paneller arasındaki görünür alana sığdır
      fitTurkey(map, "none");

      map.addImage("plane", planeIcon(), { sdf: true, pixelRatio: 2 });

      // Gece/gündüz
      map.addSource("night", { type: "geojson", data: nightPolygon() });
      map.addLayer({ id: "night", type: "fill", source: "night", paint: { "fill-color": "#000814", "fill-opacity": 0.35 } });

      // İl sınırları + koroplet
      map.addSource("provinces", {
        type: "geojson",
        data: "/geo/tr-iller.geojson",
        promoteId: "plate",
        attribution: 'İl sınırları: <a href="https://www.geoboundaries.org" target="_blank">geoBoundaries</a> / © OpenStreetMap (CC BY-SA)',
      });
      map.addLayer({
        id: "prov-fill",
        type: "fill",
        source: "provinces",
        paint: {
          "fill-color": ["coalesce", ["feature-state", "color"], "#1b2a3a"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.55,
            ["boolean", ["feature-state", "hover"], false],
            0.45,
            ["case", ["!=", ["feature-state", "color"], null], 0.38, 0.06],
          ],
        },
      });
      map.addLayer({
        id: "prov-line",
        type: "line",
        source: "provinces",
        paint: {
          "line-color": ["case", ["boolean", ["feature-state", "selected"], false], "#e30a17", "#3b4f66"],
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.2, 0.7],
        },
      });

      // Fay hatları
      map.addSource("faults", {
        type: "geojson",
        data: fc(FAULTS.map((f) => ({ type: "Feature", properties: { name: f.name }, geometry: { type: "LineString", coordinates: f.coords } }))),
      });
      map.addLayer({
        id: "faults",
        type: "line",
        source: "faults",
        paint: { "line-color": MAP_COLORS.fault, "line-width": 1.6, "line-opacity": 0.7, "line-dasharray": [3, 2] },
      });

      // Sabit altyapı
      const addStatic = (id: string, list: StaticPoint[], color: string, radius: number) => {
        map.addSource(id, { type: "geojson", data: staticFeatures(list) });
        map.addLayer({
          id,
          type: "circle",
          source: id,
          paint: {
            "circle-color": color,
            "circle-radius": radius,
            "circle-stroke-color": "#0b1016",
            "circle-stroke-width": 1.5,
          },
        });
        map.addLayer({
          id: `${id}-label`,
          type: "symbol",
          source: id,
          minzoom: 6.2,
          layout: {
            "text-field": ["coalesce", ["get", "name"], ""],
            "text-size": 11,
            "text-offset": [0, 1.1],
            "text-anchor": "top",
            "text-font": ["Open Sans Regular"],
          },
          paint: { "text-color": color, "text-halo-color": "#05080c", "text-halo-width": 1.2 },
        });
      };
      addStatic("airports", AIRPORTS, MAP_COLORS.airport, 4);
      addStatic("ports", [...PORTS, ...STRAITS], MAP_COLORS.port, 4.5);
      addStatic("energy", ENERGY, MAP_COLORS.energy, 5);

      // Katalog veri setleri (canlı katmanların altında)
      addDatasetLayers(map);

      // Hava durumu etiketleri
      map.addSource("weather", { type: "geojson", data: fc([]) });
      map.addLayer({
        id: "weather",
        type: "symbol",
        source: "weather",
        layout: {
          "text-field": ["get", "label"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 8, 13],
          "text-font": ["Open Sans Bold"],
          "text-allow-overlap": false,
        },
        paint: { "text-color": ["get", "color"], "text-halo-color": "#05080c", "text-halo-width": 1.4 },
      });

      // Haber yoğunluğu (il bazlı)
      map.addSource("news", { type: "geojson", data: fc([]) });
      map.addLayer({
        id: "news",
        type: "circle",
        source: "news",
        paint: {
          "circle-color": MAP_COLORS.news,
          "circle-opacity": 0.28,
          "circle-stroke-color": MAP_COLORS.news,
          "circle-stroke-width": 1.2,
          "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 9, 5, 14, 20, 24, 60, 36],
        },
      });
      map.addLayer({
        id: "news-count",
        type: "symbol",
        source: "news",
        layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 11, "text-font": ["Open Sans Bold"], "text-allow-overlap": true },
        paint: { "text-color": "#efe6ff" },
      });

      // Yangınlar
      map.addSource("fires", { type: "geojson", data: fc([]) });
      map.addLayer({
        id: "fires",
        type: "circle",
        source: "fires",
        paint: {
          "circle-color": ["match", ["get", "source"], "FIRMS", "#ff4d00", MAP_COLORS.fire],
          "circle-radius": ["match", ["get", "source"], "FIRMS", 3, 7],
          "circle-blur": 0.3,
          "circle-stroke-color": "#ffd6a5",
          "circle-stroke-width": ["match", ["get", "source"], "FIRMS", 0, 1.5],
        },
      });

      // Depremler
      map.addSource("quakes", { type: "geojson", data: fc([]) });
      map.addLayer({
        id: "quakes-halo",
        type: "circle",
        source: "quakes",
        filter: ["<", ["get", "ageMin"], 60],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#ff5a5f",
          "circle-stroke-width": 2,
          "circle-radius": ["*", ["+", ["get", "mag"], 1], 5],
          "circle-stroke-opacity": 0.8,
        },
      });
      map.addLayer({
        id: "quakes",
        type: "circle",
        source: "quakes",
        paint: {
          "circle-color": [
            "step",
            ["get", "mag"],
            "#8d99ae",
            2,
            "#ffd166",
            3,
            "#ff9f1c",
            4,
            "#ff5a5f",
            5,
            "#d000ff",
          ],
          "circle-radius": ["interpolate", ["exponential", 1.6], ["get", "mag"], 0, 2, 2, 3.5, 3, 6, 4, 10, 5, 16, 7, 30],
          "circle-opacity": ["interpolate", ["linear"], ["get", "ageMin"], 0, 0.95, 1440, 0.7, 10080, 0.3],
          "circle-stroke-color": "#05080c",
          "circle-stroke-width": 0.8,
        },
      });

      // Uçuşlar
      map.addSource("flights", { type: "geojson", data: fc([]) });
      map.addLayer({
        id: "flights",
        type: "symbol",
        source: "flights",
        layout: {
          "icon-image": "plane",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.45, 8, 0.8],
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: {
          "icon-color": [
            "case",
            ["get", "emergency"],
            MAP_COLORS.emergency,
            ["get", "military"],
            MAP_COLORS.military,
            ["get", "onGround"],
            "#5c7185",
            MAP_COLORS.flight,
          ],
        },
      });
      map.addLayer({
        id: "flights-label",
        type: "symbol",
        source: "flights",
        minzoom: 7.5,
        layout: {
          "text-field": ["get", "callsign"],
          "text-size": 10,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
          "text-font": ["Open Sans Regular"],
        },
        paint: { "text-color": "#9fd8ee", "text-halo-color": "#05080c", "text-halo-width": 1 },
      });

      // ISS
      map.addSource("iss", { type: "geojson", data: fc([]) });
      map.addLayer({
        id: "iss",
        type: "circle",
        source: "iss",
        paint: {
          "circle-color": "#fff",
          "circle-radius": 5,
          "circle-stroke-color": "#4cc9f0",
          "circle-stroke-width": 3,
          "circle-stroke-opacity": 0.6,
        },
      });
      map.addLayer({
        id: "iss-label",
        type: "symbol",
        source: "iss",
        layout: { "text-field": "ISS", "text-size": 11, "text-offset": [0, 1.2], "text-anchor": "top", "text-font": ["Open Sans Bold"] },
        paint: { "text-color": "#fff", "text-halo-color": "#05080c", "text-halo-width": 1.2 },
      });

      addTrackLayers(map);

      ready.current = true;
      syncAll(map, propsRef.current);
    });

    // ---- Etkileşim ----
    const clickable = ["track-veh", "track-stops", "flights", "quakes", "fires", "iss", "airports", "ports", "energy", "news", ...DATASET_LAYER_IDS];
    map.on("click", (e: MapLayerMouseEvent) => {
      const layers = clickable.filter((l) => map.getLayer(l) && map.getLayoutProperty(l, "visibility") !== "none");
      const hit = map.queryRenderedFeatures(e.point, { layers })[0];
      const p = propsRef.current;
      if (hit) {
        const props = hit.properties as Record<string, unknown>;
        switch (hit.layer.id) {
          case "flights": {
            const item = p.flights.find((a) => a.id === props.id);
            if (item) return p.onSelect({ kind: "flight", item });
            break;
          }
          case "quakes": {
            const item = p.quakes.find((q) => q.id === props.id);
            if (item) return p.onSelect({ kind: "quake", item });
            break;
          }
          case "fires": {
            const item = p.fires.find((f) => f.id === props.id);
            if (item) return p.onSelect({ kind: "fire", item });
            break;
          }
          case "iss":
            return p.onSelect({ kind: "iss" });
          case "news":
            return p.onSelect({ kind: "province", plate: Number(props.plate) });
          case "track-veh":
          case "track-stops":
            return;
          default: {
            if (hit.layer.id.startsWith("ds-")) {
              const dataset = hit.layer.id.slice(3);
              if (dataset === "cameras") return p.onCamera(String(props._id));
              const [lon, lat] = hit.geometry.type === "Point" ? (hit.geometry.coordinates as [number, number]) : [e.lngLat.lng, e.lngLat.lat];
              return p.onSelect({ kind: "feature", dataset, props, lon, lat });
            }
            const item = STATIC_INDEX.get(String(props.id));
            if (item) return p.onSelect({ kind: "static", item });
          }
        }
      }
      const prov = map.queryRenderedFeatures(e.point, { layers: ["prov-fill"] })[0];
      p.onSelect(prov ? { kind: "province", plate: Number(prov.id) } : null);
    });

    let hovered: number | null = null;
    map.on("mousemove", (e) => {
      propsRef.current.onCursor({ lon: e.lngLat.lng, lat: e.lngLat.lat, zoom: map.getZoom() });
      if (!ready.current) return;
      const layers = clickable.filter((l) => map.getLayer(l) && map.getLayoutProperty(l, "visibility") !== "none");
      const onPoint = map.queryRenderedFeatures(e.point, { layers }).length > 0;
      const prov = map.queryRenderedFeatures(e.point, { layers: ["prov-fill"] })[0];
      map.getCanvas().style.cursor = onPoint || prov ? "pointer" : "";
      const id = prov ? Number(prov.id) : null;
      if (id !== hovered) {
        if (hovered != null) map.setFeatureState({ source: "provinces", id: hovered }, { hover: false });
        if (id != null) map.setFeatureState({ source: "provinces", id }, { hover: true });
        hovered = id;
      }
    });

    // Çekmeceler açılıp kapanınca harita kapsayıcısı boyut değiştirir → yeniden çiz
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el.current);

    const nightTimer = setInterval(() => {
      if (ready.current) (map.getSource("night") as GeoJSONSource | undefined)?.setData(nightPolygon());
    }, 60_000);

    return () => {
      clearInterval(nightTimer);
      ro.disconnect();
      ready.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- Veri / görünürlük senkronu ----
  useEffect(() => {
    const map = mapRef.current;
    if (map && ready.current) syncAll(map, props);
  });

  // ---- Hat seçilince güzergaha sığdır ----
  const trackKey = props.track ? `${props.track.city}:${props.track.code}` : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.track) return;
    const b = trackBounds(props.track);
    if (b) map.fitBounds(b, { padding: 80, maxZoom: 14, duration: 900 });
  }, [trackKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Türkiye'ye sığdır ----
  useEffect(() => {
    const map = mapRef.current;
    if (map && props.fitSeq > 0) fitTurkey(map, "fly");
  }, [props.fitSeq]);

  // ---- Odaklama ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.focus) return;
    map.flyTo({ center: [props.focus.lon, props.focus.lat], zoom: props.focus.zoom ?? Math.max(map.getZoom(), 7), speed: 1.4 });
  }, [props.focus?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="map" aria-label="Türkiye durum haritası" />;
}

// ---------------------------------------------------------------------------

export function fitTurkey(map: MLMap, animate: "none" | "fly" = "fly") {
  map.fitBounds(
    [
      [25.6, 35.8],
      [44.8, 42.1],
    ],
    { padding: map.getContainer().clientWidth < 600 ? 16 : 36, duration: animate === "none" ? 0 : 900 },
  );
}

const lastData = new WeakMap<MLMap, Record<string, unknown>>();

function setData(map: MLMap, id: string, input: unknown, build: () => GeoJSON.GeoJSON) {
  const memo = lastData.get(map) ?? {};
  if (memo[id] === input) return;
  memo[id] = input;
  lastData.set(map, memo);
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(build());
}

function vis(map: MLMap, ids: string[], on: boolean) {
  for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
}

const tempColor = (t: number) =>
  t <= -10 ? "#3a0ca3" : t <= 0 ? "#4361ee" : t <= 10 ? "#4cc9f0" : t <= 20 ? "#90be6d" : t <= 28 ? "#f9c74f" : t <= 35 ? "#f8961e" : "#f94144";
const aqiColor = (a: number) => (a <= 20 ? "#50f0e6" : a <= 40 ? "#50ccaa" : a <= 60 ? "#f0e641" : a <= 80 ? "#ff5050" : a <= 100 ? "#960032" : "#7d2181");
const rampColor = (v: number, max: number, hue: "purple" | "red") => {
  if (v <= 0) return null;
  const t = Math.min(1, v / Math.max(1, max));
  const stops = hue === "purple" ? ["#3c2a63", "#6a45b8", "#b388ff", "#efe6ff"] : ["#4a1c1c", "#9b2c2c", "#ff5a5f", "#ffd1d1"];
  return stops[Math.min(stops.length - 1, Math.floor(t * (stops.length - 0.01)))];
};

function syncAll(map: MLMap, p: Props) {
  const now = Date.now();
  const L = p.layers;

  syncDatasets(map, p.datasetsOn, p.datasets, p.styles);
  syncCoreStyles(map, p.styles, L);
  syncTrack(map, p.track);
  syncPin(map, p.pin);

  vis(map, ["night"], L.night);
  vis(map, ["faults"], L.faults);
  vis(map, ["airports", "airports-label"], L.airports);
  vis(map, ["ports", "ports-label"], L.ports);
  vis(map, ["energy", "energy-label"], L.energy);
  vis(map, ["weather"], L.weather);
  vis(map, ["news", "news-count"], L.news);
  vis(map, ["fires"], L.fires);
  vis(map, ["quakes", "quakes-halo"], L.quakes);
  vis(map, ["flights", "flights-label"], L.flights);
  vis(map, ["iss", "iss-label"], L.iss);

  setData(map, "quakes", p.quakes, () =>
    fc(
      [...p.quakes]
        .sort((a, b) => a.mag - b.mag)
        .map((q) => pt(q.lon, q.lat, { id: q.id, mag: q.mag, ageMin: (now - new Date(q.time).getTime()) / 60000 })),
    ),
  );
  setData(map, "flights", p.flights, () =>
    fc(
      p.flights.map((a) =>
        pt(a.lon, a.lat, {
          id: a.id,
          callsign: a.callsign,
          heading: a.heading ?? 0,
          military: a.military,
          emergency: a.emergency,
          onGround: a.onGround,
        }),
      ),
    ),
  );
  setData(map, "fires", p.fires, () => fc(p.fires.map((f) => pt(f.lon, f.lat, { id: f.id, source: f.source }))));

  const newsCounts = new Map<number, number>();
  for (const n of p.news) for (const pl of n.provinces) newsCounts.set(pl, (newsCounts.get(pl) ?? 0) + 1);
  setData(map, "news", p.news, () =>
    fc(
      [...newsCounts].map(([plate, count]) => {
        const pr = PROVINCE_BY_PLATE.get(plate)!;
        return pt(pr.lon, pr.lat, { plate, count });
      }),
    ),
  );

  setData(map, "weather", p.weather, () =>
    fc(
      p.weather.flatMap((w) => {
        const pr = PROVINCE_BY_PLATE.get(w.plate);
        if (!pr || w.temp == null) return [];
        return [pt(pr.lon, pr.lat, { label: `${Math.round(w.temp)}°`, color: tempColor(w.temp) })];
      }),
    ),
  );

  setData(map, "iss", p.space?.iss, () => (p.space?.iss ? fc([pt(p.space.iss.lon, p.space.iss.lat, {})]) : fc([])));

  // Koroplet (il dolgu rengi)
  const key = `${p.choropleth}`;
  const input = [p.choropleth, p.weather, p.news, p.quakes];
  const memo = lastData.get(map) ?? {};
  const prev = memo["choro"] as unknown[] | undefined;
  if (!prev || prev.some((x, i) => x !== input[i])) {
    memo["choro"] = input;
    lastData.set(map, memo);
    const quakeCounts = new Map<number, number>();
    if (p.choropleth === "quakes") {
      for (const q of p.quakes) {
        if (q.plate) quakeCounts.set(q.plate, (quakeCounts.get(q.plate) ?? 0) + 1);
      }
    }
    const wByPlate = new Map(p.weather.map((w) => [w.plate, w]));
    const maxNews = Math.max(0, ...newsCounts.values());
    const maxQ = Math.max(0, ...quakeCounts.values());
    for (const pr of PROVINCES) {
      let color: string | null = null;
      const w = wByPlate.get(pr.plate);
      if (key === "temp" && w?.temp != null) color = tempColor(w.temp);
      else if (key === "aqi" && w?.aqi != null) color = aqiColor(w.aqi);
      else if (key === "news") color = rampColor(newsCounts.get(pr.plate) ?? 0, maxNews, "purple");
      else if (key === "quakes") color = rampColor(quakeCounts.get(pr.plate) ?? 0, maxQ, "red");
      map.setFeatureState({ source: "provinces", id: pr.plate }, { color });
    }
  }

  // Seçili il vurgusu
  const selPlate = p.selection?.kind === "province" ? p.selection.plate : null;
  const prevSel = memo["sel"] as number | null | undefined;
  if (prevSel !== selPlate) {
    if (prevSel != null) map.setFeatureState({ source: "provinces", id: prevSel }, { selected: false });
    if (selPlate != null) map.setFeatureState({ source: "provinces", id: selPlate }, { selected: true });
    memo["sel"] = selPlate;
    lastData.set(map, memo);
  }
}
