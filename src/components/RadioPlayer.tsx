import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import type { RadioStation } from "../types";

export function RadioPlayer({ station, onClose }: { station: RadioStation | null; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !station) return;
    setFailed(false);
    setLoading(true);
    audio.src = station.streamUrl;
    audio.load();
    void audio.play().catch(() => {
      setPlaying(false);
      setLoading(false);
    });
  }, [station?.id, station?.streamUrl]);

  if (!station) return null;

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setFailed(false);
      setLoading(true);
      try {
        await audio.play();
      } catch {
        setLoading(false);
        setFailed(true);
      }
    } else {
      audio.pause();
    }
  }

  function closePlayer() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setPlaying(false);
    setLoading(false);
    setFailed(false);
    onClose();
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
      <button type="button" className="player-close" onClick={closePlayer} aria-label="Radyo oynatıcıyı kapat"><X size={19} /></button>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => { setPlaying(true); setLoading(false); setFailed(false); }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onError={() => { setPlaying(false); setLoading(false); setFailed(true); }}
      />
    </aside>
  );
}
