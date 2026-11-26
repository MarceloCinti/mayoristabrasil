import { useCallback, useEffect, useRef, useState } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaExpand, FaCompress, FaUndo, FaRedo } from 'react-icons/fa';
import { auth } from '@/lib/firebase';
import { UMBRAL_COMPLETA } from '@/lib/curso';
import styles from './CursoVideo.module.css';

/**
 * Reproductor propio del curso (Bono 3).
 *
 * Lo que el alumno PUEDE hacer: play/pausa, velocidad, volumen, pantalla
 * completa, y saltar ±10 segundos.
 * Lo que NO puede: arrastrar una barra de tiempo, descargar, abrir el menú del
 * botón derecho, sacar el video en ventana flotante (PiP) ni mandarlo a la TV.
 *
 * El video NO tiene link público: se pide a /api/curso-video, que confirma el
 * acceso y devuelve un link firmado que vence en 2 horas (si vence en medio
 * de la clase, se pide otro y sigue desde el mismo segundo).
 * Encima del video flota el e-mail del alumno: si alguien graba la pantalla,
 * la copia queda identificada.
 */
type Props = {
  claseId: string;
  inicio: number;
  marcaAgua: string;
  onAvance: (t: number, d: number) => void;
  onCompleta: () => void;
};

const VELOCIDADES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SALTO = 10;

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(ss).padStart(2, '0')}`;
}

async function pedirLink(claseId: string): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  const r = await fetch('/api/curso-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
    body: JSON.stringify({ clase: claseId }),
  });
  if (!r.ok) throw new Error(String(r.status));
  return (await r.json()).url as string;
}

export default function CursoVideo({ claseId, inicio, marcaAgua, onAvance, onCompleta }: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const v = useRef<HTMLVideoElement>(null);
  const cb = useRef({ onAvance, onCompleta });
  cb.current = { onAvance, onCompleta };

  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const [jugando, setJugando] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [cargado, setCargado] = useState(0);
  const [vel, setVel] = useState(1);
  const [verVel, setVerVel] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [volumen, setVolumen] = useState(1);
  const [pantalla, setPantalla] = useState(false);
  const [controlesVisibles, setControlesVisibles] = useState(true);
  const [posMarca, setPosMarca] = useState({ x: 10, y: 12 });
  const [aviso, setAviso] = useState('');

  // Segundo "legítimo": cualquier salto que no venga de nuestros botones vuelve acá.
  const legit = useRef(0);
  const saltoPropio = useRef(false);
  const completada = useRef(false);
  const ultimoReporte = useRef(0);
  const reanudarEn = useRef<number | null>(inicio > 0 ? inicio : null);
  const reintentos = useRef(0);

  // ---- Pide el link firmado ----
  const cargarLink = useCallback(async () => {
    try {
      const url = await pedirLink(claseId);
      setSrc(url);
      setError('');
    } catch (e) {
      const cod = (e as Error).message;
      setError(cod === '403' ? 'Su acceso no permite ver este video.' : 'No se pudo cargar el video. Revise su conexión e intente de nuevo.');
    }
  }, [claseId]);

  useEffect(() => { cargarLink(); }, [cargarLink]);

  const reportar = useCallback((tt: number, d: number) => {
    if (!d || !isFinite(d)) return;
    cb.current.onAvance(tt, d);
    if (!completada.current && tt / d >= UMBRAL_COMPLETA) {
      completada.current = true;
      cb.current.onCompleta();
    }
  }, []);

  // ---- Acciones ----
  const saltar = useCallback((seg: number) => {
    const el = v.current;
    if (!el || !isFinite(el.duration)) return;
    const destino = Math.max(0, Math.min(el.duration - 0.5, el.currentTime + seg));
    saltoPropio.current = true;
    el.currentTime = destino;
    legit.current = destino;
    setT(destino);
  }, []);

  const alternar = useCallback(() => {
    const el = v.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {}); else el.pause();
  }, []);

  const cambiarVel = (x: number) => {
    setVel(x);
    if (v.current) v.current.playbackRate = x;
    setVerVel(false);
  };

  const alternarPantalla = () => {
    const el = caja.current;
    if (!el) return;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    const enFs = document.fullscreenElement || doc.webkitFullscreenElement;
    const elx = el as HTMLDivElement & { webkitRequestFullscreen?: () => void };
    if (enFs) {
      (document.exitFullscreen || doc.webkitExitFullscreen)?.call(document);
      return;
    }
    if (el.requestFullscreen) el.requestFullscreen().catch(() => setPantalla(p => !p));
    else if (elx.webkitRequestFullscreen) elx.webkitRequestFullscreen();
    // iPhone no deja poner un <div> en pantalla completa: usamos una
    // pantalla completa "simulada" (ocupa toda la ventana) sin controles nativos.
    else setPantalla(p => !p);
  };

  useEffect(() => {
    const f = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setPantalla(!!(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', f);
    document.addEventListener('webkitfullscreenchange', f);
    return () => {
      document.removeEventListener('fullscreenchange', f);
      document.removeEventListener('webkitfullscreenchange', f);
    };
  }, []);

  // ---- Teclado: espacio = pausa, flechas = ±10 s. Nada más. ----
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!caja.current) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); alternar(); }
      else if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); saltar(SALTO); }
      else if (e.key === 'ArrowLeft' || e.key === 'j') { e.preventDefault(); saltar(-SALTO); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [alternar, saltar]);

  // ---- Teclas multimedia del sistema (auriculares, barra de Windows/Android) ----
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms) return;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => { try { ms.setActionHandler(a, h); } catch { /* no soportado */ } };
    set('play', () => v.current?.play());
    set('pause', () => v.current?.pause());
    set('seekforward', () => saltar(SALTO));
    set('seekbackward', () => saltar(-SALTO));
    set('seekto', null);
    return () => { set('seekforward', null); set('seekbackward', null); set('play', null); set('pause', null); };
  }, [saltar]);

  // ---- Marca de agua: cambia de lugar cada 7 s ----
  useEffect(() => {
    const id = setInterval(() => setPosMarca({ x: 4 + Math.random() * 62, y: 6 + Math.random() * 70 }), 7000);
    return () => clearInterval(id);
  }, []);

  // ---- Controles que se esconden mientras reproduce ----
  const timerCtrl = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrarControles = () => {
    setControlesVisibles(true);
    if (timerCtrl.current) clearTimeout(timerCtrl.current);
    timerCtrl.current = setTimeout(() => { if (!v.current?.paused) setControlesVisibles(false); }, 2800);
  };

  const pct = dur ? (t / dur) * 100 : 0;
  const pctCarga = dur ? (cargado / dur) * 100 : 0;

  return (
    <div
      ref={caja}
      className={`${styles.caja} ${pantalla ? styles.pantalla : ''} ${!controlesVisibles && jugando ? styles.ocultar : ''}`}
      onContextMenu={e => e.preventDefault()}
      onMouseMove={mostrarControles}
      onTouchStart={mostrarControles}
      onDragStart={e => e.preventDefault()}
    >
      {src && (
        <video
          ref={v}
          src={src}
          className={styles.video}
          playsInline
          preload="metadata"
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
          onClick={alternar}
          onDoubleClick={e => e.preventDefault()}
          onLoadedMetadata={e => {
            const el = e.currentTarget;
            setDur(el.duration);
            el.playbackRate = vel;
            const r = reanudarEn.current;
            if (r && r > 0 && r < el.duration - 5) {
              saltoPropio.current = true;
              el.currentTime = r;
              legit.current = r;
              setT(r);
            }
            reanudarEn.current = null;
          }}
          onPlay={() => setJugando(true)}
          onPause={e => { setJugando(false); setControlesVisibles(true); reportar(e.currentTarget.currentTime, e.currentTarget.duration); }}
          onSeeking={e => {
            const el = e.currentTarget;
            if (saltoPropio.current) { saltoPropio.current = false; return; }
            // Salto que no vino de nuestros botones (barra nativa, extensión, consola…): se deshace.
            if (Math.abs(el.currentTime - legit.current) > 1) {
              saltoPropio.current = true;
              el.currentTime = legit.current;
              setAviso('Use los botones de ±10 segundos');
              setTimeout(() => setAviso(''), 1800);
            }
          }}
          onTimeUpdate={e => {
            const el = e.currentTarget;
            if (!el.seeking) legit.current = el.currentTime;
            setT(el.currentTime);
            if (Math.abs(el.currentTime - ultimoReporte.current) >= 5) {
              ultimoReporte.current = el.currentTime;
              reportar(el.currentTime, el.duration);
            }
          }}
          onProgress={e => {
            const b = e.currentTarget.buffered;
            if (b.length) setCargado(b.end(b.length - 1));
          }}
          onEnded={e => {
            const el = e.currentTarget;
            reportar(el.duration, el.duration);
            if (!completada.current) { completada.current = true; cb.current.onCompleta(); }
          }}
          onError={() => {
            // Lo más común: venció el link firmado. Pedimos otro y seguimos en el mismo segundo.
            if (reintentos.current >= 3) { setError('No se pudo reproducir el video. Recargue la página.'); return; }
            reintentos.current += 1;
            reanudarEn.current = legit.current;
            cargarLink();
          }}
        />
      )}

      {/* Capa que tapa el video: bloquea "guardar video como" y arrastrar */}
      <div className={styles.escudo} onClick={alternar} onDoubleClick={alternarPantalla} />

      <div className={styles.marca} style={{ left: `${posMarca.x}%`, top: `${posMarca.y}%` }}>{marcaAgua}</div>

      {!jugando && src && !error && (
        <button type="button" className={styles.playGrande} onClick={alternar} aria-label="Reproducir"><FaPlay /></button>
      )}
      {!src && !error && <div className={styles.cargando}>Cargando video…</div>}
      {error && <div className={styles.cargando}>{error}</div>}
      {aviso && <div className={styles.aviso}>{aviso}</div>}

      <div className={styles.controles} onClick={e => e.stopPropagation()}>
        {/* Barra SOLO informativa: no se puede tocar ni arrastrar */}
        <div className={styles.barra} aria-hidden>
          <div className={styles.barraCarga} style={{ width: `${pctCarga}%` }} />
          <div className={styles.barraAvance} style={{ width: `${pct}%` }} />
        </div>

        <div className={styles.fila}>
          <button type="button" onClick={alternar} aria-label={jugando ? 'Pausa' : 'Reproducir'}>
            {jugando ? <FaPause /> : <FaPlay />}
          </button>
          <button type="button" className={styles.salto} onClick={() => saltar(-SALTO)} aria-label="Retroceder 10 segundos">
            <FaUndo /><span>10</span>
          </button>
          <button type="button" className={styles.salto} onClick={() => saltar(SALTO)} aria-label="Avanzar 10 segundos">
            <FaRedo /><span>10</span>
          </button>

          <div className={styles.volumen}>
            <button type="button" onClick={() => { const m = !mudo; setMudo(m); if (v.current) v.current.muted = m; }} aria-label="Silenciar">
              {mudo || volumen === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={mudo ? 0 : volumen}
              onChange={e => {
                const x = Number(e.target.value);
                setVolumen(x); setMudo(x === 0);
                if (v.current) { v.current.volume = x; v.current.muted = x === 0; }
              }}
              aria-label="Volumen"
            />
          </div>

          <span className={styles.tiempo}>{fmt(t)} / {fmt(dur)}</span>

          <div className={styles.derecha}>
            <div className={styles.velCaja}>
              <button type="button" className={styles.velBtn} onClick={() => setVerVel(x => !x)} aria-label="Velocidad">
                {vel}x
              </button>
              {verVel && (
                <div className={styles.velMenu}>
                  {VELOCIDADES.map(x => (
                    <button key={x} type="button" className={x === vel ? styles.velActiva : ''} onClick={() => cambiarVel(x)}>
                      {x === 1 ? 'Normal' : `${x}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={alternarPantalla} aria-label="Pantalla completa">
              {pantalla ? <FaCompress /> : <FaExpand />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
