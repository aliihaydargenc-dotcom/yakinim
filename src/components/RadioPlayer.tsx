import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, X, SkipBack, SkipForward } from "lucide-react";
import type { RadioStation } from "../types";
import type Hls from "hls.js";

export function RadioPlayer({ station, stations, onSelect, onClose }: { station: RadioStation | null; stations: RadioStation[]; onSelect: (station:RadioStation)=>void; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const requestRef = useRef(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const stepRef = useRef((direction:number)=>{});
  stepRef.current = (direction:number) => {
    if(stations.length<2 || !station) return;
    const index=stations.findIndex(item=>item.id===station.id);
    onSelect(stations[(Math.max(index,0)+direction+stations.length)%stations.length]);
  };
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const pausePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    requestRef.current += 1;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setPlaying(false);
    setLoading(false);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  }, []);

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !station) return;
    const request = ++requestRef.current;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    setFailed(false);
    setLoading(true);
    // Reconnect after a pause instead of playing buffered, older radio audio.
    try {
      const isHls = station.hls || /\.m3u8(?:\?|$)/i.test(station.streamUrl);
      if (isHls && !audio.canPlayType("application/vnd.apple.mpegurl")) {
        const { default: Hls } = await import("hls.js");
        if (request !== requestRef.current) return;
        if (!Hls.isSupported()) throw new Error("hls_unsupported");
        const hls = new Hls({ liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 6, backBufferLength: 0 });
        hlsRef.current = hls;
        hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
          if (!data.details.live && request === requestRef.current) {
            hls.destroy(); hlsRef.current = null;
            audio.pause(); setPlaying(false); setLoading(false); setFailed(true);
          }
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && request === requestRef.current) {
            hls.destroy(); hlsRef.current = null;
            audio.pause(); setPlaying(false); setLoading(false); setFailed(true);
          }
        });
        hls.loadSource(station.streamUrl);
        hls.attachMedia(audio);
      } else {
        audio.src = station.streamUrl;
        audio.load();
      }
      await audio.play();
    } catch {
      if (request !== requestRef.current) return;
      setPlaying(false);
      setLoading(false);
      setFailed(true);
    }
  }, [station?.id, station?.streamUrl, station?.hls]);

  const closePlayer = useCallback(() => {
    pausePlayback();
    setFailed(false);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.metadata = null;
    }
    closeRef.current();
  }, [pausePlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !station) return;
    void startPlayback();
    return () => {
      requestRef.current += 1;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [startPlayback]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !station) return;
    const session = navigator.mediaSession;
    session.playbackState = audioRef.current?.paused === false ? "playing" : "paused";
    if (typeof MediaMetadata !== "undefined") session.metadata = new MediaMetadata({
      title: station.name,
      artist: "Yakınım · Radyo",
      artwork: [192, 512].map(size => ({
        src: new URL(`/icons/icon-${size}.png`, window.location.origin).href,
        sizes: `${size}x${size}`,
        type: "image/png",
      })),
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => { void startPlayback(); }],
      ["pause", pausePlayback],
      ["stop", closePlayer],
      ["previoustrack", () => stepRef.current(-1)],
      ["nexttrack", () => stepRef.current(1)],
    ];
    for (const [action, handler] of handlers) {
      try { session.setActionHandler(action, (action==="nexttrack"||action==="previoustrack")&&stations.length<2 ? null : handler); } catch { /* Optional browser action. */ }
    }
    return () => {
      for (const [action] of handlers) {
        try { session.setActionHandler(action, null); } catch { /* Optional browser action. */ }
      }
      session.metadata = null;
      session.playbackState = "none";
    };
  }, [station?.name, startPlayback, pausePlayback, closePlayer, stations.length]);

  if (!station) return null;

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await startPlayback();
    } else {
      pausePlayback();
    }
  }

  return (
    <aside className="global-radio-player" aria-label="Radyo oynatıcı">
      <button
        type="button"
        className="player-main-button"
        onClick={togglePlayback}
        aria-label={playing ? "Radyoyu duraklat" : "Radyoyu oynat"}
      >
        {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
      </button>
      <div className="player-copy">
        <small>{failed ? "Yayın açılamadı" : loading ? "Bağlanıyor" : playing ? "Şimdi çalıyor" : "Duraklatıldı"}</small>
        <strong>{station.name}</strong>
      </div>
      <button type="button" className="player-step" disabled={stations.length<2} onClick={()=>stepRef.current(-1)} aria-label="Önceki radyo"><SkipBack size={18}/></button>
      <button type="button" className="player-step" disabled={stations.length<2} onClick={()=>stepRef.current(1)} aria-label="Sonraki radyo"><SkipForward size={18}/></button>
      <button type="button" className="player-close" onClick={closePlayer} aria-label="Radyo oynatıcıyı kapat"><X size={19} /></button>
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => {
          setPlaying(true); setLoading(false); setFailed(false);
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onError={() => { setPlaying(false); setLoading(false); setFailed(true); }}
      />
    </aside>
  );
}
