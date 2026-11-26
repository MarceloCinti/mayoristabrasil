import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  FaArrowLeft, FaArrowRight, FaCheckCircle, FaRegCircle, FaPlayCircle, FaChevronDown,
  FaGraduationCap, FaLightbulb, FaClipboardCheck, FaExternalLinkAlt, FaTrophy, FaVideo,
} from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import CursoVideo from '@/components/CursoVideo';
import {
  MODULOS, TODAS_CLASES, CURSO_NOMBRE, CURSO_SUBTITULO, pctClase,
  type ProgresoCurso, type ProgresoClase,
} from '@/lib/curso';
import styles from './curso.module.css';

function fmtMin(seg?: number, minEstimado?: number) {
  if (seg && isFinite(seg)) {
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${minEstimado} min`;
}

export default function Curso() {
  const { authorized, loading: guardLoading } = usePagoGuard();
  const { user } = useAuth();
  const router = useRouter();

  const [videos, setVideos] = useState<Record<string, string>>({});
  const [progreso, setProgreso] = useState<ProgresoCurso>({});
  const [cargado, setCargado] = useState(false);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [menuMovil, setMenuMovil] = useState(false);

  // Carga videos (contenido/curso) y el progreso fresco del alumno.
  useEffect(() => {
    if (!authorized || !user) return;
    (async () => {
      try {
        const [c, u] = await Promise.all([
          getDoc(doc(db, 'contenido', 'curso')).catch(() => null),
          getDoc(doc(db, 'usuarios', user.uid)),
        ]);
        if (c?.exists()) setVideos((c.data().videos as Record<string, string>) || {});
        setProgreso((u.data()?.cursoProgreso as ProgresoCurso) || {});
      } catch (e) { console.error(e); }
      setCargado(true);
    })();
  }, [authorized, user]);

  // Clase actual: la de la URL, o la primera sin terminar.
  const qClase = typeof router.query.clase === 'string' ? router.query.clase : '';
  const primeraPendiente = TODAS_CLASES.find(c => !progreso[c.id]?.ok) || TODAS_CLASES[0];
  const actual = TODAS_CLASES.find(c => c.id === qClase) || primeraPendiente;
  const idx = TODAS_CLASES.findIndex(c => c.id === actual.id);
  const anterior = TODAS_CLASES[idx - 1];
  const siguiente = TODAS_CLASES[idx + 1];

  // Abre el módulo de la clase actual en el menú.
  useEffect(() => {
    setAbiertos(a => ({ ...a, [actual.modulo.id]: true }));
  }, [actual.modulo.id]);

  // ---- Guardado del progreso (con freno para no escribir a cada segundo) ----
  const ultimoGuardado = useRef<Record<string, number>>({});
  const guardar = useCallback(async (id: string, p: ProgresoClase, forzar = false) => {
    if (!user) return;
    const ahora = Date.now();
    if (!forzar && ahora - (ultimoGuardado.current[id] || 0) < 15000) return;
    ultimoGuardado.current[id] = ahora;
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), { [`cursoProgreso.${id}`]: p });
    } catch (e) { console.error('No se pudo guardar el progreso', e); }
  }, [user]);

  const onAvance = useCallback((id: string, t: number, d: number) => {
    setProgreso(prev => {
      const p: ProgresoClase = { ...prev[id], t: Math.round(t), d: Math.round(d) };
      guardar(id, p);
      return { ...prev, [id]: p };
    });
  }, [guardar]);

  const marcar = useCallback((id: string, ok: boolean) => {
    setProgreso(prev => {
      const p: ProgresoClase = { ...prev[id], ok };
      guardar(id, p, true);
      return { ...prev, [id]: p };
    });
  }, [guardar]);

  const irA = (id: string) => {
    setMenuMovil(false);
    router.push({ pathname: '/dashboard/curso', query: { clase: id } }, undefined, { shallow: true, scroll: false });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (guardLoading || !authorized) return null;

  const completas = TODAS_CLASES.filter(c => progreso[c.id]?.ok).length;
  const pctTotal = Math.round((completas / TODAS_CLASES.length) * 100);
  const terminado = completas === TODAS_CLASES.length;
  const url = videos[actual.id];
  const pActual = progreso[actual.id];
  const okActual = !!pActual?.ok;

  return (
    <DashboardLayout>
      <Head><title>{CURSO_NOMBRE} — {actual.titulo}</title></Head>

      <Link href="/dashboard/bonos" className={styles.volver}><FaArrowLeft /> Volver a los bonos</Link>

      <header className={styles.header}>
        <div className={styles.iconBox}><FaGraduationCap /></div>
        <div className={styles.headTxt}>
          <span className={styles.kicker}>BONO 3 · MINI CURSO</span>
          <h1>{CURSO_NOMBRE}: <span>{CURSO_SUBTITULO}</span></h1>
        </div>
        <div className={styles.avanceGlobal}>
          <div className={styles.avanceTxt}>
            <strong>{pctTotal}%</strong> completado · {completas} de {TODAS_CLASES.length} clases
          </div>
          <div className={styles.barra}><div style={{ width: `${pctTotal}%` }} /></div>
        </div>
      </header>

      {terminado && (
        <div className={styles.felicitaciones}>
          <FaTrophy /> <div><strong>¡Felicitaciones, terminó la {CURSO_NOMBRE}!</strong> Ya tiene el método completo: ahora repita el ciclo cada mes.</div>
        </div>
      )}

      <button type="button" className={styles.btnMenuMovil} onClick={() => setMenuMovil(v => !v)}>
        <FaChevronDown /> Módulo {actual.modulo.numero} · Clase {idx + 1} de {TODAS_CLASES.length} — ver todas las clases
      </button>

      <div className={styles.layout}>
        <main className={styles.principal}>
          <div className={styles.player}>
            {!cargado ? null : url ? (
              <CursoVideo
                key={actual.id}
                claseId={actual.id}
                marcaAgua={user?.email || ''}
                inicio={pActual?.ok ? 0 : (pActual?.t || 0)}
                onAvance={(t, d) => onAvance(actual.id, t, d)}
                onCompleta={() => marcar(actual.id, true)}
              />
            ) : (
              <div className={styles.sinVideo}>
                <FaVideo />
                <p><strong>El video de esta clase se publica pronto.</strong></p>
                <p>Mientras tanto, el contenido completo está abajo: léalo y marque la clase como completada.</p>
              </div>
            )}
          </div>

          <div className={styles.barraClase}>
            <div>
              <span className={styles.modTag}>Módulo {actual.modulo.numero} · Clase {idx + 1}</span>
              <h2>{actual.titulo}</h2>
            </div>
            <button
              type="button"
              className={`${styles.btnCompletar} ${okActual ? styles.completada : ''}`}
              onClick={() => marcar(actual.id, !okActual)}
              disabled={!cargado}
            >
              {okActual ? <><FaCheckCircle /> Clase completada</> : <><FaRegCircle /> Marcar como completada</>}
            </button>
          </div>

          {url && !okActual && pctClase(pActual) > 0 && (
            <p className={styles.retoma}>Quedó en el {pctClase(pActual)}% del video — sigue desde ahí. Al llegar al 90% la clase se marca sola.</p>
          )}

          <div className={styles.navClases}>
            {anterior
              ? <button type="button" className={styles.btnNav} onClick={() => irA(anterior.id)}><FaArrowLeft /> Anterior</button>
              : <span />}
            {siguiente && (
              <button type="button" className={`${styles.btnNav} ${styles.btnSig}`}
                onClick={() => { if (!okActual && !url) marcar(actual.id, true); irA(siguiente.id); }}>
                {!okActual && !url ? 'Completar y seguir' : 'Siguiente clase'} <FaArrowRight />
              </button>
            )}
          </div>

          <section className={styles.material}>
            <h3>Resumen de la clase</h3>
            {actual.texto.map((p, i) => <p key={i}>{p}</p>)}

            <div className={styles.claves}>
              <h4><FaLightbulb /> Puntos clave</h4>
              <ul>{actual.claves.map(k => <li key={k}>{k}</li>)}</ul>
            </div>

            {actual.tarea && (
              <div className={styles.tarea}>
                <h4><FaClipboardCheck /> Tarea práctica</h4>
                <p>{actual.tarea}</p>
              </div>
            )}

            {actual.enlace && (
              <Link href={actual.enlace.href} className={styles.atajo}>
                <FaExternalLinkAlt /> {actual.enlace.label}
              </Link>
            )}
          </section>
        </main>

        <aside className={`${styles.lateral} ${menuMovil ? styles.lateralAbierto : ''}`}>
          <h3 className={styles.latTitulo}>Contenido del curso</h3>
          {MODULOS.map(mo => {
            const hechas = mo.clases.filter(c => progreso[c.id]?.ok).length;
            const abierto = !!abiertos[mo.id];
            return (
              <div key={mo.id} className={styles.modulo}>
                <button type="button" className={styles.modCab} onClick={() => setAbiertos(a => ({ ...a, [mo.id]: !abierto }))}>
                  <div>
                    <span className={styles.modNum}>Módulo {mo.numero}</span>
                    <strong>{mo.titulo}</strong>
                    <span className={styles.modAvance}>
                      {hechas === mo.clases.length ? <><FaCheckCircle /> Completo</> : `${hechas}/${mo.clases.length} clases`}
                    </span>
                  </div>
                  <FaChevronDown className={abierto ? styles.girado : ''} />
                </button>
                {abierto && (
                  <ul className={styles.clases}>
                    {mo.clases.map(c => {
                      const p = progreso[c.id];
                      const pct = pctClase(p);
                      const esActual = c.id === actual.id;
                      return (
                        <li key={c.id}>
                          <button type="button" className={`${styles.claseItem} ${esActual ? styles.claseActual : ''}`} onClick={() => irA(c.id)}>
                            <span className={styles.estado}>
                              {p?.ok ? <FaCheckCircle className={styles.ok} /> : esActual ? <FaPlayCircle className={styles.play} /> : <FaRegCircle />}
                            </span>
                            <span className={styles.claseTxt}>
                              <span>{c.titulo}</span>
                              <span className={styles.claseMeta}>
                                {fmtMin(p?.d, c.min)}{!videos[c.id] && ' · lectura'}
                                {!p?.ok && pct > 0 && ` · ${pct}% visto`}
                              </span>
                              {!p?.ok && pct > 0 && <span className={styles.miniBarra}><span style={{ width: `${pct}%` }} /></span>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </aside>
      </div>
    </DashboardLayout>
  );
}
