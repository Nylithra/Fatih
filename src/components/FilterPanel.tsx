"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, RotateCcw, Search } from "lucide-react";
import type { FieldDef } from "@/catalog/meta";
import { MODE_LABEL } from "@/catalog/meta";
import {
  DEFAULT_STYLE,
  activeCount,
  distinctValues,
  numericRange,
  type FieldFilter,
  type LayerSettings,
} from "@/lib/filters";
import { fold } from "@/lib/text";

export type FilterLayer = {
  key: string;
  title: string;
  group: string;
  color: string;
  fields: FieldDef[];
  items: unknown[];
  get: (item: unknown, key: string) => unknown;
  shown: number;
  visible: boolean;
  setVisible: (v: boolean) => void;
  hasStyle?: boolean;
};

type Props = {
  layers: FilterLayer[];
  settings: Record<string, LayerSettings>;
  update: (key: string, fn: (s: LayerSettings) => LayerSettings) => void;
  reset: (key?: string) => void;
};

const blank = (): LayerSettings => ({ filters: {}, style: { ...DEFAULT_STYLE } });

export default function FilterPanel({ layers, settings, update, reset }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [onlyVisible, setOnlyVisible] = useState(false);
  const needle = fold(q);
  const list = layers.filter((l) => (!onlyVisible || l.visible) && (!needle || fold(l.title).includes(needle) || fold(l.group).includes(needle)));
  const groups = [...new Set(list.map((l) => l.group))];
  const totalActive = layers.reduce((n, l) => n + activeCount(settings[l.key]), 0);

  return (
    <div className="filters-panel">
      <div className="filters">
        <label className="search">
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Katman ara…" />
        </label>
        <label className="check">
          <input type="checkbox" checked={onlyVisible} onChange={() => setOnlyVisible((v) => !v)} /> Yalnız açık katmanlar
        </label>
        {totalActive > 0 && (
          <button className="link-btn small" onClick={() => reset()}>
            <RotateCcw size={12} /> Tüm filtreleri sıfırla ({totalActive})
          </button>
        )}
      </div>

      {groups.map((g) => (
        <section key={g} className="layer-group">
          <h3>{g}</h3>
          {list
            .filter((l) => l.group === g)
            .map((l) => {
              const s = settings[l.key] ?? blank();
              const n = activeCount(s);
              const isOpen = open === l.key;
              return (
                <div key={l.key} className={`flayer ${isOpen ? "open" : ""}`}>
                  <div className="flayer-head">
                    <button className="flayer-toggle" onClick={() => setOpen(isOpen ? null : l.key)} aria-expanded={isOpen}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="swatch" style={{ background: l.color, opacity: l.visible ? 1 : 0.35 }} />
                      <span className="layer-name">{l.title}</span>
                      {n > 0 && <span className="badge">{n}</span>}
                    </button>
                    <span className="count" title="Gösterilen / toplam">
                      {l.items.length ? `${l.shown.toLocaleString("tr-TR")}/${l.items.length.toLocaleString("tr-TR")}` : ""}
                    </span>
                    <button className="icon-btn" onClick={() => l.setVisible(!l.visible)} title={l.visible ? "Gizle" : "Göster"}>
                      {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="flayer-body">
                      {!l.visible && <p className="muted small">Katman kapalı — filtreler açıldığında uygulanır. Veri, katman açılınca yüklenir.</p>}
                      {l.hasStyle !== false && (
                        <div className="style-row">
                          <label>
                            Opaklık
                            <input
                              type="range"
                              min={0.1}
                              max={1}
                              step={0.05}
                              value={s.style.opacity}
                              onChange={(e) => update(l.key, (x) => ({ ...x, style: { ...x.style, opacity: +e.target.value } }))}
                            />
                          </label>
                          <label>
                            Boyut
                            <input
                              type="range"
                              min={0.5}
                              max={2.5}
                              step={0.1}
                              value={s.style.size}
                              onChange={(e) => update(l.key, (x) => ({ ...x, style: { ...x.style, size: +e.target.value } }))}
                            />
                          </label>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={s.style.labels}
                              onChange={() => update(l.key, (x) => ({ ...x, style: { ...x.style, labels: !x.style.labels } }))}
                            />
                            Etiketler
                          </label>
                        </div>
                      )}
                      {l.fields
                        .filter((f) => f.filter !== false)
                        .map((f) => (
                          <FieldControl
                            key={f.key}
                            field={f}
                            layer={l}
                            value={s.filters[f.key]}
                            onChange={(v) =>
                              update(l.key, (x) => {
                                const filters = { ...x.filters };
                                if (v) filters[f.key] = v;
                                else delete filters[f.key];
                                return { ...x, filters };
                              })
                            }
                          />
                        ))}
                      {n > 0 && (
                        <button className="link-btn small" onClick={() => reset(l.key)}>
                          <RotateCcw size={12} /> Bu katmanı sıfırla
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </section>
      ))}
    </div>
  );
}

function FieldControl({
  field,
  layer,
  value,
  onChange,
}: {
  field: FieldDef;
  layer: FilterLayer;
  value: FieldFilter | undefined;
  onChange: (v: FieldFilter | undefined) => void;
}) {
  const label = (
    <span className="fc-label">
      {field.label}
      {field.unit ? <small className="muted"> ({field.unit})</small> : null}
    </span>
  );

  if (field.type === "number") {
    const v = value?.type === "number" ? value : { type: "number" as const };
    const range = numericRange(layer.items, field.key, layer.get);
    const set = (k: "min" | "max", raw: string) => {
      const next = { ...v, [k]: raw === "" ? undefined : Number(raw) };
      onChange(next.min == null && next.max == null ? undefined : next);
    };
    return (
      <div className="fc">
        {label}
        <div className="fc-range">
          <input type="number" inputMode="decimal" value={v.min ?? ""} placeholder={range ? `en az ${fmt(range.min)}` : "en az"} onChange={(e) => set("min", e.target.value)} />
          <span className="muted">–</span>
          <input type="number" inputMode="decimal" value={v.max ?? ""} placeholder={range ? `en çok ${fmt(range.max)}` : "en çok"} onChange={(e) => set("max", e.target.value)} />
        </div>
      </div>
    );
  }

  if (field.type === "bool") {
    const cur = value?.type === "bool" ? value.value : null;
    return (
      <div className="fc">
        {label}
        <div className="seg small">
          {([
            [null, "Tümü"],
            [true, "Evet"],
            [false, "Hayır"],
          ] as const).map(([val, t]) => (
            <button key={t} className={cur === val ? "on" : ""} onClick={() => onChange(val == null ? undefined : { type: "bool", value: val })}>
              {t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "text") {
    const q = value?.type === "text" ? value.q : "";
    return (
      <div className="fc">
        {label}
        <input className="fc-text" value={q} placeholder="içerir…" onChange={(e) => onChange(e.target.value ? { type: "text", q: e.target.value } : undefined)} />
      </div>
    );
  }

  return <EnumControl field={field} layer={layer} value={value} onChange={onChange} label={label} />;
}

function EnumControl({
  field,
  layer,
  value,
  onChange,
  label,
}: {
  field: FieldDef;
  layer: FilterLayer;
  value: FieldFilter | undefined;
  onChange: (v: FieldFilter | undefined) => void;
  label: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const values = useMemo(() => distinctValues(layer.items, field.key, layer.get, 200), [layer.items, field.key, layer.get]);
  const sel = new Set(value?.type === "enum" ? value.values : []);
  const needle = fold(q);
  const shown = values.filter(([v]) => !needle || fold(v).includes(needle)).slice(0, 40);
  const toggle = (v: string) => {
    const next = new Set(sel);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next.size ? { type: "enum", values: [...next] } : undefined);
  };
  if (!values.length) return (
    <div className="fc">
      {label}
      <span className="muted small">Veri yüklenince seçenekler görünür.</span>
    </div>
  );
  return (
    <div className="fc">
      {label}
      {values.length > 10 && <input className="fc-text" value={q} placeholder="değer ara…" onChange={(e) => setQ(e.target.value)} />}
      <div className="fc-enum">
        {shown.map(([v, n]) => (
          <label key={v} className={`chip-check ${sel.has(v) ? "on" : ""}`}>
            <input type="checkbox" checked={sel.has(v)} onChange={() => toggle(v)} />
            {MODE_LABEL[v] ?? (v === "true" ? "Evet" : v === "false" ? "Hayır" : v)} <small>{n}</small>
          </label>
        ))}
      </div>
      {sel.size > 0 && (
        <button className="link-btn small" onClick={() => onChange(undefined)}>
          Seçimi temizle ({sel.size})
        </button>
      )}
    </div>
  );
}

const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString("tr-TR") : n.toLocaleString("tr-TR", { maximumFractionDigits: 1 }));
