"use client";

import { useEffect } from "react";
import { Grid2x2, Keyboard, Layers, LocateFixed, PanelRight, SlidersHorizontal, X } from "lucide-react";

type Props = {
  leftOpen: boolean;
  leftTab: "layers" | "filters";
  rightOpen: boolean;
  filterCount: number;
  wallCount: number;
  onLeft: (tab: "layers" | "filters") => void;
  onRight: () => void;
  onWall: () => void;
  onFit: () => void;
  onHelp: () => void;
};

/** Sol ikon rayı (masaüstü) / alt gezinme çubuğu (mobil). */
export default function Rail(p: Props) {
  const item = (active: boolean, label: string, icon: React.ReactNode, onClick: () => void, badge?: number, hint?: string) => (
    <button className={`rail-btn ${active ? "on" : ""}`} onClick={onClick} aria-pressed={active} title={hint ? `${label} (${hint})` : label}>
      <span className="rail-icon">
        {icon}
        {!!badge && <span className="badge">{badge}</span>}
      </span>
      <span className="rail-label">{label}</span>
    </button>
  );
  return (
    <nav className="rail" aria-label="Araçlar">
      {item(p.leftOpen && p.leftTab === "layers", "Katmanlar", <Layers size={18} />, () => p.onLeft("layers"), undefined, "[")}
      {item(p.leftOpen && p.leftTab === "filters", "Filtreler", <SlidersHorizontal size={18} />, () => p.onLeft("filters"), p.filterCount)}
      {item(p.rightOpen, "Bilgi", <PanelRight size={18} />, p.onRight, undefined, "]")}
      <span className="rail-sep" />
      {item(false, "Duvar", <Grid2x2 size={18} />, p.onWall, p.wallCount)}
      {item(false, "Türkiye", <LocateFixed size={18} />, p.onFit, undefined, "0")}
      <span className="rail-grow" />
      {item(false, "Kısayollar", <Keyboard size={18} />, p.onHelp, undefined, "?")}
    </nav>
  );
}

const SHORTCUTS: [string[], string][] = [
  [["/", "Ctrl+K"], "Arama kutusuna git"],
  [["E", "F", "N", "Y", "H", "G"], "Deprem, uçuş, haber, yangın, hava, gece katmanı"],
  [["R", "O", "K"], "Raylı hatlar, İETT otobüsleri, kameralar"],
  [["[", "]"], "Sol / sağ paneli aç-kapat"],
  [["0"], "Türkiye'yi ortala"],
  [["Esc"], "Seçimi ve işaretçiyi kapat"],
  [["?"], "Bu kartı aç-kapat"],
];

export function HelpCard({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="help-card card" role="dialog" aria-label="Klavye kısayolları">
      <header>
        <h3>
          <Keyboard size={15} /> Klavye kısayolları
        </h3>
        <button className="icon-btn" onClick={onClose} aria-label="Kapat">
          <X size={16} />
        </button>
      </header>
      <dl>
        {SHORTCUTS.map(([k, v]) => (
          <div key={v}>
            <dt>
              {k.map((part) => (
                <kbd key={part}>{part}</kbd>
              ))}
            </dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
