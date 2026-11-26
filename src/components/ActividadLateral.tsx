import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMessageCircle, FiHeart, FiRefreshCw, FiAward, FiPlayCircle, FiBookmark,
  FiMessageSquare, FiPhone, FiUserPlus, FiStar,
} from 'react-icons/fi';
import { candidatos, semilla } from '@/lib/nickname';
import styles from './ActividadLateral.module.css';

/**
 * Barra derecha del Inicio: actividad de la comunidad subiendo, siempre por
 * APODO (discreción). Los 1000 apodos se generan con el mismo estilo de las
 * sugerencias reales (guaraní + raíz de apellido); los proveedores citados se
 * eligen al azar entre los proveedores reales que el Inicio ya cargó.
 */

const APELLIDOS = [
  'Benítez', 'González', 'Ortiz', 'Ramírez', 'Giménez', 'Cáceres', 'Duarte', 'Acosta', 'Villalba', 'Ayala',
  'Báez', 'Rojas', 'Martínez', 'Fernández', 'Aquino', 'Insfrán', 'Ríos', 'Cabrera', 'Vera', 'Galeano',
  'Recalde', 'Britez', 'Ojeda', 'Franco', 'Riveros', 'Sanabria', 'Espínola', 'Florentín', 'Escobar', 'Paredes',
  'Núñez', 'Torres', 'Lezcano', 'Sosa', 'Zárate', 'Cardozo', 'Amarilla', 'Céspedes', 'Leguizamón', 'Mereles',
  'Alvarenga', 'Bogado', 'Candia', 'Delvalle', 'Estigarribia', 'Fretes', 'Godoy', 'Irala', 'Jara', 'Maidana',
];

type Tipo = 'comento' | 'like' | 'cambio' | 'curso' | 'modulo' | 'favorito' | 'foro' | 'contacto' | 'union' | 'resena';
const TIPOS: { tipo: Tipo; peso: number; prov: boolean }[] = [
  { tipo: 'comento', peso: 16, prov: true },
  { tipo: 'like', peso: 18, prov: true },
  { tipo: 'cambio', peso: 10, prov: false },
  { tipo: 'curso', peso: 5, prov: false },
  { tipo: 'modulo', peso: 8, prov: false },
  { tipo: 'favorito', peso: 12, prov: true },
  { tipo: 'foro', peso: 7, prov: false },
  { tipo: 'contacto', peso: 12, prov: true },
  { tipo: 'union', peso: 6, prov: false },
  { tipo: 'resena', peso: 6, prov: true },
];
const ICONE: Record<Tipo, JSX.Element> = {
  comento: <FiMessageCircle />, like: <FiHeart />, cambio: <FiRefreshCw />, curso: <FiAward />, modulo: <FiPlayCircle />,
  favorito: <FiBookmark />, foro: <FiMessageSquare />, contacto: <FiPhone />, union: <FiUserPlus />, resena: <FiStar />,
};

interface Evento { id: number; apodo: string; tipo: Tipo; prov: string; modulo: number; desde: number; }

function texto(e: Evento): JSX.Element {
  const P = <b className={styles.prov}>{e.prov}</b>;
  switch (e.tipo) {
    case 'comento': return <>comentó en {P}</>;
    case 'like': return <>le dio like a {P}</>;
    case 'cambio': return <>solicitó cambio R$ → Gs</>;
    case 'curso': return <>terminó la Academia Mayorista</>;
    case 'modulo': return <>completó el módulo {e.modulo} del curso</>;
    case 'favorito': return <>guardó {P} en favoritos</>;
    case 'foro': return <>abrió un tema en el foro</>;
    case 'contacto': return <>contactó a {P}</>;
    case 'union': return <>se unió a Mayorista Brasil</>;
    case 'resena': return <>calificó a {P} con 5 estrellas</>;
  }
}

function hace(ms: number) {
  const s = (Date.now() - ms) / 1000;
  if (s < 45) return 'ahora';
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  return `hace ${Math.round(s / 3600)} h`;
}

/** 1000 apodos distintos, en orden aleatorio a cada visita. */
function gerarApodos(rnd: () => number): string[] {
  const set = new Set<string>();
  for (let i = 0; set.size < 1000 && i < 5000; i++) {
    const ap = APELLIDOS[Math.floor(rnd() * APELLIDOS.length)];
    for (const c of candidatos(`X ${ap}`, semilla(`feed${i}`))) {
      // mayoría de juegos de palabras con apellido; pocos con número
      if (/\d/.test(c) && rnd() > .15) continue;
      set.add(c);
      if (set.size >= 1000) break;
    }
  }
  return [...set].sort(() => rnd() - .5);
}

export default function ActividadLateral({ proveedores }: { proveedores: string[] }) {
  const rnd = useMemo(() => semilla(String(Math.random())), []);
  const apodos = useMemo(() => gerarApodos(rnd), [rnd]);
  const pesoTotal = TIPOS.reduce((s, t) => s + t.peso, 0);
  const pos = useRef(0);
  const provs = useRef<string[]>([]);
  provs.current = proveedores;

  const criar = (desde: number): Evento => {
    const i = pos.current++ % apodos.length;
    let r = rnd() * pesoTotal;
    let t = TIPOS[0];
    for (const x of TIPOS) { r -= x.peso; if (r <= 0) { t = x; break; } }
    const lista = provs.current;
    if (t.prov && !lista.length) t = TIPOS.find(x => !x.prov)!;
    return {
      id: pos.current, apodo: apodos[i], tipo: t.tipo,
      prov: lista.length ? lista[Math.floor(rnd() * lista.length)] : '',
      modulo: 1 + Math.floor(rnd() * 7), desde,
    };
  };

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [, setTick] = useState(0);

  // Arranca con unos eventos "de hace un rato" en cuanto hay proveedores
  useEffect(() => {
    if (eventos.length || !proveedores.length) return;
    // horarios en orden: el de arriba es el más viejo
    let t = Date.now() - 20000;
    const antes: Evento[] = [];
    for (let k = 0; k < 9; k++) { antes.unshift(criar(t)); t -= 50000 + rnd() * 90000; }
    setEventos(antes.map((e, k) => ({ ...e, id: -100 + k })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedores.length]);

  // Un evento nuevo cada 2,5–5 s; quedan los últimos 16
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const proximo = () => {
      t = setTimeout(() => {
        setEventos(ev => [...ev, criar(Date.now())].slice(-16));
        proximo();
      }, 2500 + rnd() * 2500);
    };
    proximo();
    const relogio = setInterval(() => setTick(x => x + 1), 30000);
    return () => { clearTimeout(t); clearInterval(relogio); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside className={styles.barra} aria-label="Actividad de la comunidad">
      <div className={styles.topo}>
        <span className={styles.vivo} /> Actividad en vivo
      </div>
      <div className={styles.fluxo}>
        <AnimatePresence initial={false}>
          {eventos.map(e => (
            <motion.div key={e.id} layout className={`${styles.item} ${styles['t_' + e.tipo]}`}
              initial={{ opacity: 0, y: 40, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, transition: { duration: .4 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
              <span className={styles.ico}>{ICONE[e.tipo]}</span>
              <div className={styles.txt}>
                <b className={styles.apodo}>{e.apodo}</b> {texto(e)}
                <small>{hace(e.desde)}</small>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  );
}
