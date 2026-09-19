"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ChevronDown, Search } from "lucide-react";
import { CATEGORIES, DATASETS } from "@/catalog/meta";
import type { DatasetState } from "@/hooks/useDatasets";
import { LAYERS, type Choropleth, type LayerId } from "@/lib/layers";
import { fold } from "@/lib/text";
import type { Feeds } from "./Dashboard";

type Props = {
  layers: Record<LayerId, boolean>;
  setLayers: Dispatch<SetStateAction<Record<LayerId, boolean>>>;
  counts: Partial<Record<LayerId, number>>;
  choropleth: Choropleth;
  setChoropleth: (c: Choropleth) => void;
  quakeDays: number;
  setQuakeDays: (d: number) => void;
  minMag: number;
  setMinMag: (m: number) => void;
  feeds: Feeds;
  datasetsOn: Record<string, boolean>;
  toggleDataset: (id: string) => void;
  datasetState: Record<string, DatasetState>;
  datasetShown: Record<string, number>;
};

const CHORO: { id: Choropleth; label: string }[] = [
  { id: "none", label: "Yok" },
  { id: "temp", label: "Sıcaklık" },
  { id: "aqi", label: "Hava kalitesi" },
  { id: "news", label: "Haber yoğunluğu" },
  { id: "quakes", label: "Deprem sayısı" },
];

const LEGENDS: Partial<Record<Choropleth, { c: string; l: string }[]>> = {
  temp: [
    { c: "#4361ee", l: "≤0°" },
    { c: "#4cc9f0", l: "10°" },
    { c: "#90be6d", l: "20°" },
    { c: "#f9c74f", l: "28°" },
    { c: "#f8961e", l: "35°" },
    { c: "#f94144", l: ">35°" },
  ],
  aqi: [
    { c: "#50f0e6", l: "İyi" },
    { c: "#50ccaa", l: "Makul" },
    { c: "#f0e641", l: "Orta" },
    { c: "#ff5050", l: "Kötü" },
    { c: "#960032", l: "Çok kötü" },
  ],
};

function feedStatus(f: { error: string | null; data: unknown; stale: boolean; loading: boolean }) {
  if (f.error && !f.data) return "err";
  if (f.error || f.stale) return "warn";
  if (!f.data) return "wait";
  return "ok";
}

/** Daraltılabilir bölüm; başlıkta açık katman sayısı gösterilir. */
function Group({ title, active, total, children, defaultOpen = true }: { title: string; active?: number; total?: number; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary>
        <ChevronDown size={14} className="chev" />
        <span>{title}</span>
        {total != null && (
          <span className={`group-count ${active ? "on" : ""}`}>
            {active}/{total}
          </span>
        )}
      </summary>
      <div className="group-body">{children}</div>
    </details>
  );
}

function Row({
  on,
  onToggle,
  color,
  title,
  meta,
  dot,
  count,
  hotkey,
  tip,
}: {
  on: boolean;
  onToggle: () => void;
  color: string;
  title: string;
  meta?: string;
  dot?: string | null;
  count?: number | null;
  hotkey?: string;
  tip?: string;
}) {
  return (
    <label className={`layer-row ${on ? "on" : ""}`} title={tip}>
      <input type="checkbox" className="switch" checked={on} onChange={onToggle} />
      <span className="swatch" style={{ background: color }} />
      <span className="layer-text">
        <span className="layer-name">{title}</span>
        {meta && <span className="layer-meta">{meta}</span>}
      </span>
      {dot && <span className={`dot ${dot}`} title={dot === "err" ? "Veri alınamadı" : dot === "warn" ? "Veri gecikmeli" : dot === "wait" ? "Yükleniyor" : "Güncel"} />}
      {count != null && <span className="count">{count.toLocaleString("tr-TR")}</span>}
      {hotkey && <kbd>{hotkey}</kbd>}
    </label>
  );
}

export default function LayerPanel(p: Props) {
  const [q, setQ] = useState("");
  const needle = fold(q.trim());
  const match = (s: string) => !needle || fold(s).includes(needle);

  const status: Partial<Record<LayerId, string>> = {
    quakes: feedStatus(p.feeds.quakes),
    flights: feedStatus(p.feeds.flights),
    news: feedStatus(p.feeds.news),
    fires: feedStatus(p.feeds.fires),
    weather: feedStatus(p.feeds.weather),
    iss: feedStatus(p.feeds.space),
  };

  const coreGroups = [...new Set(LAYERS.map((l) => l.group))];
  const activeTotal = LAYERS.filter((l) => p.layers[l.id]).length + DATASETS.filter((d) => p.datasetsOn[d.id]).length;

  return (
    <div className="layer-panel">
      <label className="search compact">
        <Search size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Katman ara… (${activeTotal} açık)`} />
      </label>

      {coreGroups.map((g) => {
        const list = LAYERS.filter((l) => l.group === g && match(l.label));
        if (!list.length) return null;
        return (
          <Group key={g} title={g} active={list.filter((l) => p.layers[l.id]).length} total={list.length}>
            {list.map((l) => (
              <Row
                key={l.id}
                on={p.layers[l.id]}
                onToggle={() => p.setLayers((L) => ({ ...L, [l.id]: !L[l.id] }))}
                color={l.color}
                title={l.label}
                dot={p.layers[l.id] ? status[l.id] : null}
                count={p.layers[l.id] ? p.counts[l.id] : null}
                hotkey={l.key}
              />
            ))}
          </Group>
        );
      })}

      {CATEGORIES.map((cat) => {
        const list = DATASETS.filter((d) => d.category === cat && match(`${d.title} ${d.city} ${d.provider}`));
        if (!list.length) return null;
        return (
          <Group key={cat} title={cat} active={list.filter((d) => p.datasetsOn[d.id]).length} total={list.length}>
            {list.map((d) => {
              const st = p.datasetState[d.id];
              const on = Boolean(p.datasetsOn[d.id]);
              const dot = !on ? null : st?.error && !st.fc ? "err" : st?.error ? "warn" : st?.loading && !st.fc ? "wait" : st?.fc ? "ok" : "wait";
              return (
                <Row
                  key={d.id}
                  on={on}
                  onToggle={() => p.toggleDataset(d.id)}
                  color={d.color}
                  title={d.title}
                  meta={`${d.city} · ${d.provider}`}
                  dot={dot}
                  count={on && st?.fc ? (p.datasetShown[d.id] ?? 0) : null}
                  tip={d.description ?? `${d.provider} · ${d.license}`}
                />
              );
            })}
          </Group>
        );
      })}

      {!needle && (
        <>
          <Group title="Deprem dönemi ve büyüklük">
            <div className="seg">
              {[1, 2, 7, 30].map((d) => (
                <button key={d} className={p.quakeDays === d ? "on" : ""} onClick={() => p.setQuakeDays(d)}>
                  {d === 1 ? "24 sa" : `${d} gün`}
                </button>
              ))}
            </div>
            <div className="seg">
              {[0, 2, 3, 4].map((m) => (
                <button key={m} className={p.minMag === m ? "on" : ""} onClick={() => p.setMinMag(m)}>
                  {m === 0 ? "Tümü" : `M${m}+`}
                </button>
              ))}
            </div>
          </Group>

          <Group title="İl renklendirme">
            <select value={p.choropleth} onChange={(e) => p.setChoropleth(e.target.value as Choropleth)} aria-label="İl renklendirme">
              {CHORO.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {LEGENDS[p.choropleth] && (
              <div className="legend">
                {LEGENDS[p.choropleth]!.map((x) => (
                  <span key={x.l}>
                    <i style={{ background: x.c }} />
                    {x.l}
                  </span>
                ))}
              </div>
            )}
          </Group>

          <Group title="Gösterim" defaultOpen={false}>
            <div className="legend">
              <span><i className="round" style={{ background: "#ffd166" }} />M2–3</span>
              <span><i className="round" style={{ background: "#ff9f1c" }} />M3–4</span>
              <span><i className="round" style={{ background: "#ff5a5f" }} />M4–5</span>
              <span><i className="round" style={{ background: "#d000ff" }} />M5+</span>
            </div>
            <div className="legend">
              <span><i className="round" style={{ background: "var(--c-flight)" }} />Sivil</span>
              <span><i className="round" style={{ background: "var(--c-military)" }} />Askerî</span>
              <span><i className="round" style={{ background: "var(--c-emergency)" }} />Acil (7500/7600/7700)</span>
            </div>
          </Group>
        </>
      )}
    </div>
  );
}
