"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { PROVINCES } from "@/data/provinces";
import { AIRPORTS, ENERGY, PORTS, STRAITS } from "@/data/static-intel";
import { fold, matchScore } from "@/lib/text";
import type { SearchHit } from "@/app/api/search/route";
import type { Aircraft, Earthquake, NewsItem } from "@/lib/types";

export type Hit =
  | SearchHit
  | {
      kind: "province" | "flight" | "quake" | "news" | "infra";
      id: string;
      title: string;
      subtitle: string;
      score: number;
      lat?: number;
      lon?: number;
      ref?: unknown;
    };

const KIND_LABEL: Record<Hit["kind"], string> = {
  province: "İl",
  district: "İlçe",
  line: "Otobüs hattı",
  stop: "Durak",
  station: "İstasyon",
  camera: "Kamera",
  parking: "Otopark",
  hospital: "Hastane",
  flight: "Uçak",
  quake: "Deprem",
  news: "Haber",
  infra: "Altyapı",
};

const INFRA = [...AIRPORTS, ...PORTS, ...STRAITS, ...ENERGY];

export default function SearchBox({
  flights,
  quakes,
  news,
  onPick,
}: {
  flights: Aircraft[];
  quakes: Earthquake[];
  news: NewsItem[];
  onPick: (h: Hit) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [server, setServer] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // "/" veya Ctrl+K ile odaklan
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    const click = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", k);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", k);
      window.removeEventListener("mousedown", click);
    };
  }, []);

  // Sunucu araması (gecikmeli)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setServer([]);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const j = await r.json();
        if (j.ok) setServer(j.data);
      } catch {
        /* iptal edildi */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const local = useMemo<Hit[]>(() => {
    const n = fold(q);
    if (n.length < 2) return [];
    const out: Hit[] = [];
    for (const p of PROVINCES) {
      const s = Math.max(matchScore(p.name, n), String(p.plate) === n ? 100 : 0);
      if (s) out.push({ kind: "province", id: `p-${p.plate}`, title: p.name, subtitle: `İl · ${p.region} · ${String(p.plate).padStart(2, "0")}`, score: s + 20, lat: p.lat, lon: p.lon, ref: p.plate });
    }
    for (const a of flights) {
      const s = Math.max(matchScore(a.callsign, n), a.reg ? matchScore(a.reg, n) : 0, matchScore(a.id, n));
      if (s) out.push({ kind: "flight", id: `f-${a.id}`, title: a.callsign, subtitle: `Uçak · ${a.type ?? ""} ${a.reg ?? a.id.toUpperCase()}`, score: s, lat: a.lat, lon: a.lon, ref: a });
    }
    let qn = 0;
    for (const e of quakes) {
      const s = matchScore(e.place, n) * 0.7;
      if (s && qn++ < 5) out.push({ kind: "quake", id: `q-${e.id}`, title: `M${e.mag.toFixed(1)} ${e.place}`, subtitle: `Deprem · ${new Date(e.time).toLocaleString("tr-TR")}`, score: s, lat: e.lat, lon: e.lon, ref: e });
    }
    let nn = 0;
    for (const it of news) {
      const s = matchScore(it.title, n) * 0.5;
      if (s && nn++ < 4) out.push({ kind: "news", id: `n-${it.id}`, title: it.title, subtitle: `Haber · ${it.source}`, score: s, ref: it });
    }
    for (const s of INFRA) {
      const sc = Math.max(matchScore(s.name, n), s.code ? matchScore(s.code, n) : 0);
      if (sc) out.push({ kind: "infra", id: `i-${s.id}`, title: s.name, subtitle: s.code ? `Havalimanı · ${s.code}` : "Altyapı", score: sc, lat: s.lat, lon: s.lon, ref: s });
    }
    return out;
  }, [q, flights, quakes, news]);

  const results = useMemo(() => [...local, ...server].sort((a, b) => b.score - a.score).slice(0, 24), [local, server]);

  useEffect(() => setCursor(0), [results.length]);

  const pick = (h: Hit) => {
    onPick(h);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="searchbox" ref={boxRef}>
      <label className="search">
        <Search size={15} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(results.length - 1, c + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === "Enter" && results[cursor]) pick(results[cursor]);
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder="İl, ilçe, hastane, hat (500T), durak, istasyon, kamera, uçak…"
          aria-label="Ara"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="search-results"
        />
        {loading ? <span className="spinner" aria-hidden /> : <kbd>/</kbd>}
      </label>
      {open && q.trim().length >= 2 && (
        <ul className="search-results" id="search-results" role="listbox">
          {results.length === 0 && !loading && <li className="empty">Sonuç yok</li>}
          {results.map((h, i) => (
            <li key={h.id} role="option" aria-selected={i === cursor}>
              <button className={i === cursor ? "on" : ""} onMouseEnter={() => setCursor(i)} onClick={() => pick(h)}>
                <span className={`kind k-${h.kind}`}>{KIND_LABEL[h.kind]}</span>
                <span className="hit-main">
                  <span className="hit-title">{h.title}</span>
                  <span className="hit-sub">{h.subtitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
