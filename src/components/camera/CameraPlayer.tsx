"use client";

import { useEffect, useRef, useState } from "react";

/** HLS canlı yayın oynatıcı (hls.js; Safari'de yerel HLS). */
export default function CameraPlayer({ src, title, muted = true }: { src: string; title: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let destroyed = false;
    let hls: { destroy: () => void } | null = null;
    setStatus("loading");

    const onPlaying = () => setStatus("playing");
    video.addEventListener("playing", onPlaying);

    (async () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.play().catch(() => {});
        return;
      }
      const { default: Hls } = await import("hls.js");
      if (destroyed) return;
      if (!Hls.isSupported()) return setStatus("error");
      const h = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3, maxBufferLength: 10 });
      hls = h;
      h.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setStatus("error");
      });
      h.loadSource(src);
      h.attachMedia(video);
      h.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    })();

    return () => {
      destroyed = true;
      video.removeEventListener("playing", onPlaying);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <div className="cam-player">
      <video ref={ref} muted={muted} playsInline autoPlay aria-label={`${title} canlı yayın`} />
      {status !== "playing" && (
        <div className={`cam-status ${status}`}>{status === "loading" ? "Yayın bağlanıyor…" : "Yayın şu anda alınamıyor"}</div>
      )}
      <span className="cam-live">● CANLI</span>
    </div>
  );
}
