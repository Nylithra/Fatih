import type { Aircraft, Earthquake, FireEvent } from "./types";
import type { StaticPoint } from "@/data/static-intel";

export type LayerId =
  | "quakes"
  | "flights"
  | "news"
  | "fires"
  | "weather"
  | "faults"
  | "airports"
  | "ports"
  | "energy"
  | "iss"
  | "night";

export type LayerDef = { id: LayerId; label: string; color: string; key?: string; group: "Canlı" | "Çevre" | "Altyapı" | "Görünüm" };

export const LAYERS: LayerDef[] = [
  { id: "quakes", label: "Depremler", color: "var(--c-quake)", key: "E", group: "Canlı" },
  { id: "flights", label: "Hava Trafiği", color: "var(--c-flight)", key: "F", group: "Canlı" },
  { id: "news", label: "Haber Yoğunluğu", color: "var(--c-news)", key: "N", group: "Canlı" },
  { id: "fires", label: "Orman Yangınları", color: "var(--c-fire)", key: "Y", group: "Çevre" },
  { id: "weather", label: "Hava Durumu", color: "var(--c-weather)", key: "H", group: "Çevre" },
  { id: "faults", label: "Ana Fay Zonları", color: "var(--c-fault)", group: "Çevre" },
  { id: "airports", label: "Havalimanları", color: "var(--c-airport)", group: "Altyapı" },
  { id: "ports", label: "Limanlar ve Boğazlar", color: "var(--c-port)", group: "Altyapı" },
  { id: "energy", label: "Enerji ve Barajlar", color: "var(--c-energy)", group: "Altyapı" },
  { id: "iss", label: "ISS Uzay İstasyonu", color: "var(--c-iss)", group: "Görünüm" },
  { id: "night", label: "Gece / Gündüz", color: "var(--c-night)", key: "G", group: "Görünüm" },
];

export const DEFAULT_LAYERS: Record<LayerId, boolean> = {
  quakes: true,
  flights: true,
  news: true,
  fires: true,
  weather: false,
  faults: true,
  airports: false,
  ports: false,
  energy: false,
  iss: true,
  night: true,
};

export type Choropleth = "none" | "temp" | "aqi" | "news" | "quakes";

export type Selection =
  | { kind: "quake"; item: Earthquake }
  | { kind: "flight"; item: Aircraft }
  | { kind: "fire"; item: FireEvent }
  | { kind: "static"; item: StaticPoint }
  | { kind: "province"; plate: number }
  | { kind: "iss" }
  | { kind: "feature"; dataset: string; props: Record<string, unknown>; lon: number; lat: number }
  | null;
