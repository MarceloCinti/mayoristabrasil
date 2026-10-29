import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import {
  FaStore, FaMapMarkedAlt, FaUserSecret, FaTruck, FaFire, FaShieldAlt, FaGift, FaArrowRight,
} from 'react-icons/fa';
import { FiTrendingUp, FiRefreshCw, FiZap, FiArrowRight } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useCategorias } from '@/lib/useCategorias';
import { agrupar } from '@/lib/categorias';
import { Proveedor } from '@/lib/proveedorTypes';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import Foto from '@/components/Foto';
import styles from './index.module.css';

const SECCIONES = [
  { href: '/dashboard/proveedores', icon: <FaStore />, title: 'Proveedores', desc: 'Más de 200 contactos por categoría', color: 'var(--verde)' },
  { href: '/dashboard/mapa', icon: <FaMapMarkedAlt />, title: 'Mapa de Brás', desc: 'Calles, horarios y zonas seguras', color: 'var(--azul)' },
  { href: '/dashboard/secretos', icon: <FaUserSecret />, title: 'Proveedores Secretos', desc: 'Fábricas y distribuidores escondidos', color: 'var(--oro)' },
  { href: '/dashboard/importar', icon: <FaTruck />, title: 'Datos para importar', desc: 'Transportadoras y redespacho', color: 'var(--cyan)' },
  { href: '/dashboard/tendencias', icon: <FaFire />, title: 'Tendencias', desc: 'Lo que más vende esta semana', color: '#ff6b35' },
  { href: '/dashboard/estafas', icon: <FaShieldAlt />, title: 'Lista de Estafas', desc: 'Para que no pierdas dinero', color: '#ef4444' },
  { href: '/dashboard/favoritos', icon: <FaGift />, title: 'Favoritos', desc: 'Tus proveedores guardados', color: '#f43f5e' },
];

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

export default function Dashboard() {
  const { authorized, loading } = usePagoGuard();
  const { userData } = useAuth();
  const { categorias } = useCategorias();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
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

  // Rotar tips
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(t);
  }, []);

  if (loading || !authorized) return null;

  const recientes = proveedores.slice(0, 8);
  const numReais = Number(reais.replace(',', '.')) || 0;

  // Grupos con proveedores, para explorar por categoría desde la home
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
        <div className={styles.heroGlow} />
        <h1>Hola, {userData?.nombre?.split(' ')[0] || 'revendedor'} 👋</h1>
        <p>Tu central para comprar en Brás y revender en Paraguay.</p>
      </motion.div>

      {/* Fila superior: cotización + stats */}
      <div className={styles.topGrid}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .05 }} className={styles.cambioCard}>
          <div className={styles.cambioHead}>
            <span><FiRefreshCw className={rateLoading ? styles.spin : ''} /> Cotización en vivo</span>
            <span className={styles.cambioLive}>● R$ → Gs</span>
          </div>
          {rate ? (
            <>
              <div className={styles.cambioRate}>
                <span className={styles.cambioBig}>1 R$ = {fmtGs(rate)}</span>
              </div>
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
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .1 }} className={styles.statsCard}>
          <div className={styles.statItem}><FaStore className={styles.statIco} /><div><strong>{proveedores.length || '200+'}</strong><span>Proveedores</span></div></div>
          <div className={styles.statItem}><FiTrendingUp className={styles.statIco} style={{ color: '#ff6b35' }} /><div><strong>{categorias.length}</strong><span>Categorías</span></div></div>
          <div className={styles.statItem}><FaFire className={styles.statIco} style={{ color: 'var(--oro)' }} /><div><strong>{proveedores.filter((p: any) => p.esTendencia).length}</strong><span>En tendencia</span></div></div>
        </motion.div>
      </div>

      {/* Tip rotativo */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .15 }} className={styles.tipCard}>
        <span className={styles.tipBadge}><FiZap /> Tip</span>
        <AnimatePresence mode="wait">
          <motion.p key={tipIdx} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: .35 }}>
            {TIPS[tipIdx]}
          </motion.p>
        </AnimatePresence>
        <div className={styles.tipDots}>
          {TIPS.map((_, i) => <span key={i} className={i === tipIdx ? styles.dotOn : ''} />)}
        </div>
      </motion.div>

      {/* Recién actualizados */}
      {recientes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .2 }} className={styles.recientes}>
          <div className={styles.recHead}>
            <h2><FiRefreshCw /> Recién actualizados</h2>
            <Link href="/dashboard/proveedores" className={styles.verTodo}>Ver todos <FiArrowRight /></Link>
          </div>
          <div className={styles.recScroll}>
            {recientes.map(p => (
              <Link key={p.id} href="/dashboard/proveedores" className={styles.recCard}>
                <div className={styles.recThumb}>
                  <Foto src={p.fotos?.[0]} alt={p.nombre} lazy fallback={<div className={styles.recEmpty}><FaStore /></div>} />
                  {p.esTendencia && <span className={styles.recTend}>🔥</span>}
                </div>
                <strong>{p.nombre}</strong>
                <span>{categorias.find(c => c.id === p.categoria)?.label || ''}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Explorar por categoría (agrupado) */}
      {menuHome.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .22 }} style={{ marginTop: 8 }}>
          <h2 className={styles.seccionesTitulo}>Explorá por categoría</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {menuHome.map(g => (
              <div key={g.grupo} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--oro)' }}>{g.grupo}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-mut)' }}>{g.total}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {g.items.map(c => (
                    <Link
                      key={c.id}
                      href={`/dashboard/proveedores?cat=${c.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: 'var(--bg-elev)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12.5, fontWeight: 500 }}
                    >
                      {c.label} <span style={{ color: 'var(--text-mut)', fontSize: 11 }}>{c.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Secciones */}
      <h2 className={styles.seccionesTitulo}>Explorá la plataforma</h2>
      <motion.div
        className={styles.grid}
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: .06 } } }}
      >
        {SECCIONES.map(s => (
          <motion.div key={s.href} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} transition={{ duration: .4 }}>
            <Link href={s.href} className={styles.card}>
              <div className={styles.iconBox} style={{ color: s.color }}>{s.icon}</div>
              <div className={styles.cardBody}>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
              <FaArrowRight className={styles.arrow} />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </DashboardLayout>
  );
}
