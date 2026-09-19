"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Grid2x2, Maximize, Minimize, Plus, X } from "lucide-react";
import CameraPlayer from "./CameraPlayer";
import { CAMERA_BY_ID, CAMERAS, isWatchable, type Camera } from "./cameras";

/** Belediyenin resmî oynatıcı sayfasını olduğu gibi gömer (token'ı kendi oynatıcısı üretir). */
function EmbedPlayer({ src, title }: { src: string; title: string }) {
  return (
    <div className="cam-player">
      <iframe
        src={src}
        title={`${title} — resmî oynatıcı`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function Player({ camera }: { camera: Camera }) {
  if (camera.kind === "hls" && camera.stream) return <CameraPlayer src={camera.stream} title={camera.name} />;
  if (camera.kind === "embed" && camera.embed) return <EmbedPlayer src={camera.embed} title={camera.name} />;
  return null;
}

function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else ref.current?.requestFullscreen().catch(() => {});
  }, []);
  return { ref, full, toggle };
}

/** Tek kamera penceresi. */
export function CameraModal({
  camera,
  onClose,
  onAddToWall,
  inWall,
}: {
  camera: Camera;
  onClose: () => void;
  onAddToWall: (id: string) => void;
  inWall: boolean;
}) {
  const fs = useFullscreen<HTMLDivElement>();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !document.fullscreenElement && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="cam-backdrop" onClick={onClose}>
      <div className="cam-modal" ref={fs.ref} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={camera.name}>
        <header>
          <div>
            <span className="kicker">
              {camera.city} · {camera.provider}
            </span>
            <h3>{camera.name}</h3>
          </div>
          <div className="cam-actions">
            {isWatchable(camera) && (
              <button className="link-btn" onClick={() => onAddToWall(camera.id)} disabled={inWall} title="Kamera duvarına ekle">
                <Plus size={14} /> {inWall ? "Duvarda" : "Duvara ekle"}
              </button>
            )}
            {isWatchable(camera) && (
              <button className="icon-btn" onClick={fs.toggle} title="Tam ekran (F11 benzeri)">
                {fs.full ? <Minimize size={17} /> : <Maximize size={17} />}
              </button>
            )}
            <button className="icon-btn" onClick={onClose} title="Kapat (Esc)">
              <X size={18} />
            </button>
          </div>
        </header>
        {isWatchable(camera) ? (
          <Player camera={camera} />
        ) : (
          <div className="cam-external">
            {camera.note ? (
              <p className="cam-note">{camera.note}</p>
            ) : (
              <p>
                Bu yayını belediye yalnızca kendi sitesinde izlenmek üzere yayınlıyor (süreli token, şifreli akış, referer ya da
                çerçeve kısıtlaması). FATİH bu kısıtlamayı aşmaz; yayını resmî sayfada izleyebilirsiniz.
              </p>
            )}
            <a className="link-btn" href={camera.page} target="_blank" rel="noreferrer noopener">
              {camera.note ? "Belediyenin sayfasını aç" : "Resmî sayfada izle"} <ExternalLink size={13} />
            </a>
          </div>
        )}
        <footer className="muted small">
          Kaynak: <a href={camera.page} target="_blank" rel="noreferrer noopener">{camera.provider}</a>
          {camera.kind === "embed" ? " · belediyenin resmî oynatıcısı" : ""}
          {camera.approx ? " · haritadaki konum yaklaşık" : ""}
        </footer>
      </div>
    </div>
  );
}

/** Çoklu kamera izleme duvarı (1/4/9'lu ızgara, tam ekran). */
export function CameraWall({
  ids,
  onRemove,
  onClose,
  onAdd,
}: {
  ids: string[];
  onRemove: (id: string) => void;
  onClose: () => void;
  onAdd: (id: string) => void;
}) {
  const fs = useFullscreen<HTMLDivElement>();
  const [cols, setCols] = useState(ids.length <= 1 ? 1 : ids.length <= 4 ? 2 : 3);
  const cams = ids.map((id) => CAMERA_BY_ID.get(id)).filter(Boolean) as Camera[];
  const candidates = CAMERAS.filter((c) => isWatchable(c) && !ids.includes(c.id));

  return (
    <div className="cam-backdrop">
      <div className="cam-wall" ref={fs.ref} role="dialog" aria-label="Kamera duvarı">
        <header>
          <h3>
            <Grid2x2 size={16} /> Kamera duvarı <span className="muted">({cams.length})</span>
          </h3>
          <div className="cam-actions">
            <div className="seg small">
              {[1, 2, 3].map((n) => (
                <button key={n} className={cols === n ? "on" : ""} onClick={() => setCols(n)}>
                  {n * n}
                </button>
              ))}
            </div>
            <select value="" onChange={(e) => e.target.value && onAdd(e.target.value)} aria-label="Kamera ekle">
              <option value="">+ Kamera ekle…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.city} · {c.name}
                </option>
              ))}
            </select>
            <button className="icon-btn" onClick={fs.toggle} title="Tam ekran">
              {fs.full ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
            <button className="icon-btn" onClick={onClose} title="Kapat">
              <X size={18} />
            </button>
          </div>
        </header>
        <div
          className="cam-grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${Math.max(1, Math.ceil(Math.min(cams.length, cols * cols) / cols))}, 1fr)`,
          }}
        >
          {cams.slice(0, cols * cols).map((c) => (
            <div key={c.id} className="cam-tile">
              <Player camera={c} />
              <div className="cam-tile-bar">
                <span>
                  {c.city} · {c.name}
                </span>
                <button className="icon-btn" onClick={() => onRemove(c.id)} title="Duvardan çıkar">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          {cams.length === 0 && <p className="empty">Duvara kamera ekleyin.</p>}
        </div>
        {cams.length > cols * cols && (
          <p className="muted small">{cams.length - cols * cols} kamera ızgaraya sığmadı; daha büyük ızgara seçin.</p>
        )}
      </div>
    </div>
  );
}
