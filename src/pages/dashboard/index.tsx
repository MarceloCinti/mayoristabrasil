import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useRef, ReactNode } from 'react';
import { motion, AnimatePresence, animate, useInView } from 'framer-motion';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { FaStore, FaFire, FaPlay } from 'react-icons/fa';
import { FiTrendingUp, FiRefreshCw, FiZap, FiArrowRight, FiChevronLeft, FiChevronRight, FiStar, FiBell, FiVideo, FiGrid, FiSettings } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useCategorias } from '@/lib/useCategorias';
import { agrupar } from '@/lib/categorias';
import { Proveedor } from '@/lib/proveedorTypes';
import { INICIO_DOC, InicioConfig, DEFAULT_INICIO, mergeInicio, BANNERS_PADRAO, BannerInicio, embedDe } from '@/lib/inicio';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Foto from '@/components/Foto';
import BannerArte from '@/components/BannerArte';
import styles from './index.module.css';

const TIPS = [
  'Comprá temprano (8-10h): los mayoristas atienden mejor y hay stock fresco.',
  'Negociá por cantidad: a más piezas, mejor precio por unidad.',
  'Pedí el precio "à vista" (al contado) — suele ser más barato que con tarjeta.',
  'Sacá fotos de las etiquetas y precios para comparar después.',
  'Llevá efectivo en reales: muchos dan descuento que no figura en el catálogo.',
  'Confirmá siempre si el proveedor envía a Paraguay antes de cerrar el pedido.',
  'Revisá la lista de estafas antes de pagar señas a cuentas desconocidas.',
];

const fmtGs = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');
const TEMAS = ['verde', 'azul', 'amarelo'] as const;

/** Aparece suave ao entrar na tela (rolando). */
function Surge({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className}
      initial={{ opacity: 0, y: 28, scale: .98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: .6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}>
      {children}
    </motion.div>
  );
}

/** Número que conta de 0 até o valor quando aparece. */
function Contador({ valor }: { valor: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true });
  useEffect(() => {
    if (!visto || !ref.current) return;
    const c = animate(0, valor, { duration: 1.4, ease: 'easeOut', onUpdate: v => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString('es-PY'); } });
    return () => c.stop();
  }, [visto, valor]);
  return <span ref={ref}>0</span>;
}

const ehExterno = (href: string) => /^https?:\/\//.test(href);
function Enlace({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  return ehExterno(href)
    ? <a href={href} target="_blank" rel="noreferrer" className={className}>{children}</a>
    : <Link href={href} className={className}>{children}</Link>;
}

function Banners({ banners }: { banners: BannerInicio[] }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [pausa, setPausa] = useState(false);
  const n = banners.length;
  const ir = (d: number) => { setDir(d); setI(x => (x + d + n) % n); };

  useEffect(() => {
    if (n < 2 || pausa) return;
    const t = setInterval(() => { setDir(1); setI(x => (x + 1) % n); }, 5500);
    return () => clearInterval(t);
  }, [n, pausa]);

  if (!n) return null;
  const b = banners[i % n];
  return (
    <div className={styles.banners} onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}>
      <AnimatePresence initial={false} custom={dir}>
        <motion.div key={b.id} custom={dir}
          className={`${styles.banner} ${styles['tema_' + b.tema] || ''}`}
          variants={{
            entra: (d: number) => ({ x: `${d * 100}%`, opacity: .4 }),
            fica: { x: 0, opacity: 1 },
            sai: (d: number) => ({ x: `${d * -100}%`, opacity: .4 }),
          }}
          initial="entra" animate="fica" exit="sai"
          transition={{ duration: .7, ease: [0.65, 0, 0.35, 1] }}
          drag={n > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.2}
          onDragEnd={(_, info) => { if (info.offset.x < -60) ir(1); else if (info.offset.x > 60) ir(-1); }}
        >
          {b.imagen && <div className={styles.bannerImg} style={{ backgroundImage: `url("${b.imagen}")` }} />}
          <div className={styles.bannerVeu} />
          {b.arte ? <BannerArte arte={b.arte} /> : (<>
            <span className={styles.bannerOrbe} />
            <span className={`${styles.bannerOrbe} ${styles.bannerOrbe2}`} />
          </>)}
          <div className={styles.bannerTexto}>
            <motion.h2 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25, duration: .5 }}>{b.titulo}</motion.h2>
            {b.texto && <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .38, duration: .5 }}>{b.texto}</motion.p>}
            {b.enlace && (
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5, duration: .5 }}>
                <Enlace href={b.enlace} className={styles.bannerBtn}>{b.boton || 'Ver más'} <FiArrowRight /></Enlace>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {n > 1 && (
        <>
          <button type="button" className={`${styles.bannerSeta} ${styles.setaEsq}`} onClick={() => ir(-1)} aria-label="Anterior"><FiChevronLeft /></button>
          <button type="button" className={`${styles.bannerSeta} ${styles.setaDir}`} onClick={() => ir(1)} aria-label="Siguiente"><FiChevronRight /></button>
          <div className={styles.bannerDots}>
            {banners.map((x, k) => (
              <button type="button" key={x.id} aria-label={`Banner ${k + 1}`} onClick={() => { setDir(k > i ? 1 : -1); setI(k); }}
                className={k === i ? styles.dotAtivo : ''}>
                {k === i && !pausa && <span key={i} className={styles.dotBarra} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { authorized, loading } = usePagoGuard();
  const { userData } = useAuth();
  const { categorias } = useCategorias();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cfg, setCfg] = useState<InicioConfig>(DEFAULT_INICIO);
  const [rate, setRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [reais, setReais] = useState('100');
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'proveedores'));
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() } as Proveedor)).filter(p => !p.esSecreto);
        arr.sort((a: any, b: any) => (b.actualizadoEn?.seconds || 0) - (a.actualizadoEn?.seconds || 0));
        setProveedores(arr);
      } catch (err) { console.error(err); }
    })();
    (async () => {
      try {
        const s = await getDoc(doc(db, INICIO_DOC.col, INICIO_DOC.id));
        if (s.exists()) setCfg(mergeInicio(s.data() as Partial<InicioConfig>));
      } catch (err) { console.error(err); }
    })();
  }, [authorized]);

  // Cotización real R$ → Gs (API gratuita)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('https://open.er-api.com/v6/latest/BRL');
        const d = await r.json();
        if (d?.rates?.PYG) setRate(d.rates.PYG);
      } catch { /* noop */ }
      setRateLoading(false);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);

  if (loading || !authorized) return null;

  const esAdmin = !!userData?.esAdmin;
  const catLabel = (id: string) => categorias.find(c => c.id === id)?.label || '';
  const numReais = Number(reais.replace(',', '.')) || 0;
  const recientes = proveedores.filter(p => p.fotos?.length).slice(0, 14);
  const banners = (cfg.banners.filter(b => b.activo).length ? cfg.banners.filter(b => b.activo) : BANNERS_PADRAO);
  const novedades = cfg.novedades.filter(n => n.activa).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const videos = cfg.videos.filter(v => v.activo && v.url);
  const porId = new Map(proveedores.map(p => [p.id, p]));
  const destacados = cfg.destacados.map(id => porId.get(id)).filter(Boolean) as Proveedor[];
  const tendencia = proveedores.filter(p => p.esTendencia).length;

  const menuHome = (() => {
    const counts: Record<string, number> = {};
    proveedores.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
    return agrupar(categorias)
      .map(g => ({
        grupo: g.grupo,
        total: g.items.reduce((s, c) => s + (counts[c.id] || 0), 0),
        items: g.items.filter(c => (counts[c.id] || 0) > 0).map(c => ({ ...c, count: counts[c.id] || 0 })),
      }))
      .filter(g => g.items.length > 0);
  })();

  return (
    <DashboardLayout>
      <Head><title>Inicio — Mayorista Brasil</title></Head>

      {/* Bienvenida */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className={styles.hero}>
        <span className={styles.heroAnel} />
        <span className={styles.heroBrilho} />
        <div className={styles.heroTexto}>
          <span className={styles.heroPill}><span className={styles.pulso} /> Base actualizada</span>
          <h1>Hola, <span className={styles.grad}>{userData?.nombre?.split(' ')[0] || 'revendedor'}</span></h1>
          <p>Tu central para comprar en Brasil y revender en Paraguay.</p>
        </div>
        <div className={styles.heroStats}>
          <div><FaStore /><strong>{proveedores.length ? <Contador valor={proveedores.length} /> : '…'}</strong><span>Proveedores</span></div>
          <div><FiGrid /><strong>{categorias.length ? <Contador valor={categorias.length} /> : '…'}</strong><span>Categorías</span></div>
          <div><FaFire /><strong>{proveedores.length ? <Contador valor={tendencia} /> : '…'}</strong><span>En tendencia</span></div>
        </div>
      </motion.div>

      {/* Banners rotativos */}
      <Surge delay={.05}>
        <Banners banners={banners} />
        {esAdmin && <Link href="/admin/inicio" className={styles.editarAdmin}><FiSettings /> Editar banners, novedades y videos</Link>}
      </Surge>

      {/* Novedades + columna (cotización y tip) */}
      <div className={styles.duo}>
        <Surge className={styles.novedadesBox}>
          <div className={styles.secHead}>
            <h2><span className={`${styles.secIco} ${styles.icoAmarelo}`}><FiBell /></span> Novedades</h2>
          </div>
          {novedades.length ? (
            <div className={styles.novedades}>
              {novedades.map((n, k) => (
                <motion.div key={n.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: k * .07, duration: .45 }}>
                  <Enlace href={n.enlace} className={`${styles.novedad} cardFx`}>
                    {n.imagen
                      ? <div className={styles.novImg} style={{ backgroundImage: `url("${n.imagen}")` }} />
                      : <div className={`${styles.novImg} ${styles['novTema' + (k % 3)]}`}><FiZap /></div>}
                    <div className={styles.novCorpo}>
                      <div className={styles.novMeta}>
                        {n.etiqueta && <span className={styles.novTag}>{n.etiqueta}</span>}
                        {n.fecha && <span>{new Date(n.fecha + 'T12:00:00').toLocaleDateString('es-PY', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                      <strong>{n.titulo}</strong>
                      {n.texto && <p>{n.texto}</p>}
                    </div>
                    {n.enlace && <FiArrowRight className={styles.novSeta} />}
                  </Enlace>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className={styles.novedades}>
              <Link href="/dashboard/proveedores" className={`${styles.novedad} cardFx`}>
                <div className={`${styles.novImg} ${styles.novTema0}`}><FiRefreshCw /></div>
                <div className={styles.novCorpo}>
                  <div className={styles.novMeta}><span className={styles.novTag}>Base</span></div>
                  <strong>{proveedores.length ? `${proveedores.length.toLocaleString('es-PY')} proveedores disponibles` : 'Proveedores actualizados'}</strong>
                  <p>Sumamos proveedores nuevos y fotos todas las semanas.</p>
                </div>
                <FiArrowRight className={styles.novSeta} />
              </Link>
              <Link href="/dashboard/bonos" className={`${styles.novedad} cardFx`}>
                <div className={`${styles.novImg} ${styles.novTema2}`}><FiStar /></div>
                <div className={styles.novCorpo}>
                  <div className={styles.novMeta}><span className={styles.novTag}>Bonos</span></div>
                  <strong>Diccionario del Negociador y Academia Mayorista</strong>
                  <p>Mensajes listos para negociar y un mini curso paso a paso.</p>
                </div>
                <FiArrowRight className={styles.novSeta} />
              </Link>
            </div>
          )}
        </Surge>

        <div className={styles.coluna}>
          <Surge delay={.08} className={styles.cambioCard}>
            <div className={styles.cambioHead}>
              <span><FiRefreshCw className={rateLoading ? styles.spin : ''} /> Cotización en vivo</span>
              <span className={styles.cambioLive}><span className={styles.pulso} /> R$ → Gs</span>
            </div>
            {rate ? (
              <>
                <div className={styles.cambioRate}><span className={styles.cambioBig}>1 R$ = {fmtGs(rate)}</span></div>
                <div className={styles.conversor}>
                  <div className={styles.convInput}>
                    <span>R$</span>
                    <input value={reais} onChange={e => setReais(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" />
                  </div>
                  <FiArrowRight className={styles.convArrow} />
                  <div className={styles.convOut}>
                    <AnimatePresence mode="popLayout">
                      <motion.span key={Math.round(numReais * rate)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .25 }}>
                        {fmtGs(numReais * rate)}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.cambioRate}><span className={styles.cambioBig} style={{ fontSize: 18, color: 'var(--text-mut)' }}>{rateLoading ? 'Cargando cotización…' : 'No disponible ahora'}</span></div>
            )}
          </Surge>

          <Surge delay={.14} className={styles.tipCard}>
            <span className={styles.tipBadge}><FiZap /> Tip del día</span>
            <AnimatePresence mode="wait">
              <motion.p key={tipIdx} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: .35 }}>
                {TIPS[tipIdx]}
              </motion.p>
            </AnimatePresence>
            <div className={styles.tipDots}>
              {TIPS.map((_, i) => <span key={i} className={i === tipIdx ? styles.dotOn : ''} />)}
            </div>
          </Surge>
        </div>
      </div>

      {/* Destacados elegidos por el admin */}
      {destacados.length > 0 && (
        <Surge>
          <div className={styles.secHead}>
            <h2><span className={`${styles.secIco} ${styles.icoVerde}`}><FiStar /></span> Destacados de la semana</h2>
          </div>
          <div className={styles.destacados}>
            {destacados.map((p, k) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * .06, duration: .45 }}>
                <Link href={`/dashboard/proveedores?cat=${p.categoria}`} className={`${styles.destCard} cardFx`}>
                  <div className={styles.destFoto}>
                    <Foto src={p.fotos?.[0]} alt={p.nombre} lazy fallback={<div className={styles.recEmpty}><FaStore /></div>} />
                    <span className={styles.destSelo}><FiStar /> Destacado</span>
                  </div>
                  <div className={styles.destCorpo}>
                    <strong>{p.nombre}</strong>
                    <span>{catLabel(p.categoria)}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </Surge>
      )}

      {/* Recién actualizados — cinta que corre sola */}
      {recientes.length > 0 && (
        <Surge>
          <div className={styles.secHead}>
            <h2><span className={`${styles.secIco} ${styles.icoAzul}`}><FiTrendingUp /></span> Recién actualizados</h2>
            <Link href="/dashboard/proveedores" className={styles.verTodo}>Ver todos <FiArrowRight /></Link>
          </div>
          <div className={styles.cinta}>
            <div className={styles.cintaTrilho}>
              {[...recientes, ...recientes].map((p, k) => (
                <Link key={p.id + '-' + k} href={`/dashboard/proveedores?cat=${p.categoria}`} className={styles.recCard} aria-hidden={k >= recientes.length} tabIndex={k >= recientes.length ? -1 : undefined}>
                  <div className={styles.recThumb}>
                    <Foto src={p.fotos?.[0]} alt={p.nombre} lazy fallback={<div className={styles.recEmpty}><FaStore /></div>} />
                    {p.esTendencia && <span className={styles.recTend}><FiTrendingUp /></span>}
                  </div>
                  <strong>{p.nombre}</strong>
                  <span>{catLabel(p.categoria)}</span>
                </Link>
              ))}
            </div>
          </div>
        </Surge>
      )}

      {/* Videos */}
      {(videos.length > 0 || esAdmin) && (
        <Surge>
          <div className={styles.secHead}>
            <h2><span className={`${styles.secIco} ${styles.icoVerde}`}><FiVideo /></span> Videos</h2>
          </div>
          {videos.length ? (
            <div className={styles.videos}>
              {videos.map(v => {
                const emb = embedDe(v.url);
                return (
                  <div key={v.id} className={`${styles.videoCard} cardFx`}>
                    <div className={styles.videoTela}>
                      {emb
                        ? <iframe src={emb} title={v.titulo} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
                        : <video src={v.url} controls playsInline preload="metadata" controlsList="nodownload" />}
                    </div>
                    {v.titulo && <strong><FaPlay /> {v.titulo}</strong>}
                  </div>
                );
              })}
            </div>
          ) : (
            <Link href="/admin/inicio" className={styles.videoVazio}>
              <FiVideo /> Todavía no hay videos. Solo vos (admin) ves este espacio: tocá para agregar.
            </Link>
          )}
        </Surge>
      )}

      {/* Explorar por categoría */}
      {menuHome.length > 0 && (
        <Surge>
          <div className={styles.secHead}>
            <h2><span className={`${styles.secIco} ${styles.icoAmarelo}`}><FiGrid /></span> Explorá por categoría</h2>
          </div>
          <div className={styles.grupos}>
            {menuHome.map((g, k) => (
              <motion.div key={g.grupo} className={`${styles.grupo} ${styles['grupo_' + TEMAS[k % 3]]}`}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: (k % 3) * .08, duration: .5 }}>
                <Link href={`/dashboard/proveedores?grupo=${encodeURIComponent(g.grupo)}`} className={styles.grupoTopo}>
                  <strong>{g.grupo}</strong>
                  <span>{g.total} <FiArrowRight /></span>
                </Link>
                <div className={styles.chips}>
                  {g.items.map(c => (
                    <Link key={c.id} href={`/dashboard/proveedores?cat=${c.id}`} className={styles.chip}>
                      {c.label} <span>{c.count}</span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </Surge>
      )}
    </DashboardLayout>
  );
}
