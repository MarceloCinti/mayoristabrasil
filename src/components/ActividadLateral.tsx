import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { candidatos, semilla } from '@/lib/nickname';
import { avatarAleatorio } from '@/lib/avatar';
import Avatar from './Avatar';
import styles from './ActividadLateral.module.css';

/**
 * Barra derecha del Inicio: actividad de la comunidad subiendo de forma
 * continua (como las estrellas cayendo, pero hacia arriba), siempre por
 * APODO + avatar. Los 1000 apodos siguen el estilo de las sugerencias
 * reales (guaraní + raíz de apellido); los proveedores citados se eligen al
 * azar entre los reales que el Inicio ya cargó.
 *
 * Movimiento: un requestAnimationFrame corre la columna hacia arriba a
 * velocidad constante (sin re-render por cuadro). Cuando la primera línea
 * sale por arriba, se quita y entra una nueva abajo.
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

interface Evento { id: number; apodo: string; avatar: string; tipo: Tipo; prov: string; modulo: number; }

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

/** 1000 apodos distintos, en orden aleatorio a cada visita. */
function gerarApodos(rnd: () => number): string[] {
  const set = new Set<string>();
  for (let i = 0; set.size < 1000 && i < 5000; i++) {
    const ap = APELLIDOS[Math.floor(rnd() * APELLIDOS.length)];
    for (const c of candidatos(`X ${ap}`, semilla(`feed${i}`))) {
      // solo juegos de palabras con apellido (sin números)
      if (/\d/.test(c)) continue;
      set.add(c);
      if (set.size >= 1000) break;
    }
  }
  return [...set].sort(() => rnd() - .5);
}

const VELOCIDADE = 22;  // px por segundo
const LINHAS = 22;      // líneas en pantalla (sobra para cubrir la altura)

export default function ActividadLateral({ proveedores }: { proveedores: string[] }) {
  const rnd = useMemo(() => semilla(String(Math.random())), []);
  const apodos = useMemo(() => gerarApodos(rnd), [rnd]);
  const pesoTotal = TIPOS.reduce((s, t) => s + t.peso, 0);
  const pos = useRef(0);
  const provs = useRef<string[]>([]);
  provs.current = proveedores;

  const criar = (): Evento => {
    const i = pos.current++ % apodos.length;
    let r = rnd() * pesoTotal;
    let t = TIPOS[0];
    for (const x of TIPOS) { r -= x.peso; if (r <= 0) { t = x; break; } }
    const lista = provs.current;
    if (t.prov && !lista.length) t = TIPOS.find(x => !x.prov)!;
    return {
      id: pos.current, apodo: apodos[i], avatar: avatarAleatorio(apodos[i]), tipo: t.tipo,
      prov: lista.length ? lista[Math.floor(rnd() * lista.length)] : '',
      modulo: 1 + Math.floor(rnd() * 7),
    };
  };

  const [eventos, setEventos] = useState<Evento[]>([]);
  const coluna = useRef<HTMLDivElement>(null);
  const desloc = useRef(0);
  const trocando = useRef(false);
  const pendente = useRef(0);

  // Llena la columna cuando ya hay proveedores para citar
  useEffect(() => {
    if (eventos.length || !proveedores.length) return;
    setEventos(Array.from({ length: LINHAS }, () => criar()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedores.length]);

  // La primera línea ya salió del DOM: descontar su altura en el mismo
  // cuadro, así la columna no salta.
  useLayoutEffect(() => {
    if (!trocando.current) return;
    desloc.current -= pendente.current;
    if (coluna.current) coluna.current.style.transform = `translate3d(0, ${-desloc.current}px, 0)`;
    trocando.current = false;
  }, [eventos]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let antes = performance.now();
    const passo = (agora: number) => {
      const dt = Math.min(64, agora - antes) / 1000;
      antes = agora;
      const col = coluna.current;
      if (col && col.firstElementChild && !trocando.current) {
        desloc.current += VELOCIDADE * dt;
        const primeira = col.firstElementChild as HTMLElement;
        const alto = primeira.offsetHeight + 14; // + gap
        if (desloc.current >= alto) {
          pendente.current = alto;
          trocando.current = true;
          setEventos(ev => [...ev.slice(1), criar()]);
        }
        col.style.transform = `translate3d(0, ${-desloc.current}px, 0)`;
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside className={styles.barra} aria-label="Actividad de la comunidad">
      <div className={styles.topo}><span className={styles.vivo} /> Actividad en vivo</div>
      <div className={styles.janela}>
        <div ref={coluna} className={styles.coluna}>
          {eventos.map(e => (
            <div key={e.id} className={styles.linha}>
              <Avatar valor={e.avatar} size={26} />
              <p><b className={styles.apodo}>{e.apodo}</b> {texto(e)}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
