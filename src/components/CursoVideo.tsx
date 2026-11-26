import { useEffect, useRef } from 'react';
import { youtubeId, UMBRAL_COMPLETA } from '@/lib/curso';

/**
 * Reproductor de la clase. Acepta un MP4 (Firebase Storage u otro) o un link
 * de YouTube (puede ser «no listado»). En los dos casos informa el avance:
 *   onAvance(segundo, duración) cada pocos segundos y al pausar
 *   onCompleta() al pasar del 90% o al terminar.
 */
type Props = {
  url: string;
  inicio: number;
  onAvance: (t: number, d: number) => void;
  onCompleta: () => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let ytPromesa: Promise<any> | null = null;
function cargarYT(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytPromesa) return ytPromesa;
  ytPromesa = new Promise(resolve => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(s);
  });
  return ytPromesa;
}

export default function CursoVideo({ url, inicio, onAvance, onCompleta }: Props) {
  const yt = youtubeId(url);
  // Callbacks en refs: el reproductor no se recrea cuando cambian.
  const cb = useRef({ onAvance, onCompleta });
  cb.current = { onAvance, onCompleta };
  const completada = useRef(false);

  const reportar = (t: number, d: number) => {
    if (!d || !isFinite(d)) return;
    cb.current.onAvance(t, d);
    if (!completada.current && t / d >= UMBRAL_COMPLETA) {
      completada.current = true;
      cb.current.onCompleta();
    }
  };

  // ---- YouTube ----
  const ytDiv = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!yt) return;
    completada.current = false;
    let player: any = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let vivo = true;
    cargarYT().then(YT => {
      if (!vivo || !ytDiv.current) return;
      player = new YT.Player(ytDiv.current, {
        videoId: yt,
        playerVars: { start: Math.floor(inicio || 0), rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: any) => {
            // 0 = terminó, 2 = pausa
            if (e.data === 0) { completada.current = true; cb.current.onCompleta(); }
            if (e.data === 2 || e.data === 0) reportar(player.getCurrentTime(), player.getDuration());
          },
        },
      });
      timer = setInterval(() => {
        try {
          if (player?.getPlayerState?.() === 1) reportar(player.getCurrentTime(), player.getDuration());
        } catch { /* el reproductor todavía no está listo */ }
      }, 5000);
    }).catch(() => {});
    return () => {
      vivo = false;
      if (timer) clearInterval(timer);
      try {
        if (player?.getCurrentTime) reportar(player.getCurrentTime(), player.getDuration());
        player?.destroy?.();
      } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yt]);

  // ---- MP4 ----
  const video = useRef<HTMLVideoElement>(null);
  const ultimo = useRef(0);
  useEffect(() => { completada.current = false; ultimo.current = 0; }, [url]);

  if (yt) {
    return <div className="curso-yt"><div ref={ytDiv} /></div>;
  }

  return (
    <video
      key={url}
      ref={video}
      src={url}
      controls
      playsInline
      controlsList="nodownload"
      onLoadedMetadata={e => {
        const v = e.currentTarget;
        // Retoma donde quedó (salvo que ya estuviera casi al final).
        if (inicio > 0 && inicio < v.duration - 5) v.currentTime = inicio;
      }}
      onTimeUpdate={e => {
        const v = e.currentTarget;
        if (Math.abs(v.currentTime - ultimo.current) >= 5) {
          ultimo.current = v.currentTime;
          reportar(v.currentTime, v.duration);
        }
      }}
      onPause={e => reportar(e.currentTarget.currentTime, e.currentTarget.duration)}
      onEnded={e => { reportar(e.currentTarget.duration, e.currentTarget.duration); completada.current = true; cb.current.onCompleta(); }}
    />
  );
}
