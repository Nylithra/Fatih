import type { FieldDef } from "@/catalog/meta";

/** Çekirdek (canlı) katmanların filtrelenebilir alanları. Anahtarlar tiplerdeki alan adlarıdır. */
export const CORE_FIELDS: Record<"quakes" | "flights" | "fires" | "news", FieldDef[]> = {
  quakes: [
    { key: "mag", label: "Büyüklük", type: "number" },
    { key: "depthKm", label: "Derinlik", type: "number", unit: "km" },
    { key: "province", label: "İl", type: "enum" },
    { key: "place", label: "Yer", type: "text" },
    { key: "magType", label: "Büyüklük türü", type: "enum" },
  ],
  flights: [
    { key: "callsign", label: "Çağrı kodu", type: "text" },
    { key: "altM", label: "İrtifa", type: "number", unit: "m" },
    { key: "speedKmh", label: "Yer hızı", type: "number", unit: "km/sa" },
    { key: "military", label: "Askerî", type: "bool" },
    { key: "emergency", label: "Acil durum", type: "bool" },
    { key: "onGround", label: "Yerde", type: "bool" },
    { key: "type", label: "Uçak tipi", type: "enum" },
    { key: "country", label: "Tescil ülkesi", type: "enum" },
    { key: "reg", label: "Tescil", type: "text" },
  ],
  fires: [
    { key: "frp", label: "Işınım gücü (FRP)", type: "number", unit: "MW" },
    { key: "confidence", label: "Güven", type: "enum" },
    { key: "source", label: "Kaynak", type: "enum" },
  ],
  news: [
    { key: "source", label: "Kaynak", type: "enum" },
    { key: "title", label: "Başlık", type: "text" },
  ],
};
