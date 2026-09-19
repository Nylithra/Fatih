import type { FieldDef } from "@/catalog/meta";
import { fold } from "./text";

/**
 * Genel filtre modeli: her katman için alan bazlı filtreler + görünüm ayarları.
 * Aynı model hem çekirdek katmanlara (deprem, uçuş…) hem katalog veri setlerine uygulanır.
 */

export type FieldFilter =
  | { type: "number"; min?: number; max?: number }
  | { type: "enum"; values: string[] } // boş dizi = hepsi
  | { type: "text"; q: string }
  | { type: "bool"; value: boolean | null }; // null = hepsi

export type LayerStyle = { opacity: number; size: number; labels: boolean };

export type LayerSettings = { filters: Record<string, FieldFilter>; style: LayerStyle };

export const DEFAULT_STYLE: LayerStyle = { opacity: 1, size: 1, labels: true };

export function isActive(f: FieldFilter | undefined) {
  if (!f) return false;
  switch (f.type) {
    case "number":
      return f.min != null || f.max != null;
    case "enum":
      return f.values.length > 0;
    case "text":
      return f.q.trim().length > 0;
    case "bool":
      return f.value != null;
  }
}

export function activeCount(s: LayerSettings | undefined) {
  if (!s) return 0;
  return Object.values(s.filters).filter(isActive).length;
}

type Getter<T> = (item: T, key: string) => unknown;

/** Filtreleri bir öğe listesine uygular. */
export function applyFilters<T>(items: T[], fields: FieldDef[], settings: LayerSettings | undefined, get: Getter<T>): T[] {
  if (!settings) return items;
  const active = fields.filter((f) => isActive(settings.filters[f.key]));
  if (!active.length) return items;
  const prepared = active.map((f) => {
    const flt = settings.filters[f.key];
    if (flt.type === "text") return { key: f.key, flt, needle: fold(flt.q) };
    if (flt.type === "enum") return { key: f.key, flt, set: new Set(flt.values) };
    return { key: f.key, flt };
  });
  return items.filter((it) =>
    prepared.every((p) => {
      const v = get(it, p.key);
      switch (p.flt.type) {
        case "number": {
          if (v == null || v === "") return false;
          const n = Number(v);
          return (p.flt.min == null || n >= p.flt.min) && (p.flt.max == null || n <= p.flt.max);
        }
        case "enum":
          return (p as { set: Set<string> }).set.has(String(v ?? ""));
        case "text":
          return fold(String(v ?? "")).includes((p as { needle: string }).needle);
        case "bool":
          return Boolean(v) === p.flt.value;
      }
    }),
  );
}

/** Bir alanın veri içindeki farklı değerlerini (sayılarıyla) çıkarır — enum filtreleri için. */
export function distinctValues<T>(items: T[], key: string, get: Getter<T>, limit = 60) {
  const m = new Map<string, number>();
  for (const it of items) {
    const v = get(it, key);
    if (v == null || v === "") continue;
    const s = String(v);
    m.set(s, (m.get(s) ?? 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

/** Sayısal alanın veri aralığı. */
export function numericRange<T>(items: T[], key: string, get: Getter<T>) {
  let min = Infinity, max = -Infinity;
  for (const it of items) {
    const v = get(it, key);
    if (v == null || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  return Number.isFinite(min) ? { min, max } : null;
}

export const propGetter = (f: GeoJSON.Feature, key: string) => (f.properties as Record<string, unknown> | null)?.[key];
export const objGetter = (o: unknown, key: string) => (o as Record<string, unknown>)[key];
