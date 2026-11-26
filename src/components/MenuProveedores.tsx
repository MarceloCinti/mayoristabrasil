import { useEffect, useLayoutEffect, useMemo, useRef, useState, ReactNode, RefObject } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { useCategorias } from '@/lib/useCategorias';
import { useConteoCategorias } from '@/lib/useConteoCategorias';
import { agrupar } from '@/lib/categorias';
import styles from './MenuProveedores.module.css';

const BASE = '/dashboard/proveedores';
const hrefGrupo = (g: string) => `${BASE}?grupo=${encodeURIComponent(g)}`;
const hrefCat = (id: string) => `${BASE}?cat=${encodeURIComponent(id)}`;

type Pos = { top: number; left: number };

/**
 * Ítem "Proveedores" del menú lateral con submenús en cascata:
 *   Proveedores → grupos (Moda, Casa...) → categorías (Jeans, Bolsas...).
 * En escritorio se abren al pasar el mouse (paneles flotantes a la derecha).
 * En celular (menú hamburguesa) no hay hover: una flecha despliega los mismos
 * niveles en acordeón dentro del menú.
 */
export default function MenuProveedores({ icon, className, activeClass, onNavigate }: {
  icon: ReactNode; className: string; activeClass: string; onNavigate: () => void;
}) {
  const router = useRouter();
  const { categorias } = useCategorias();
  const conteo = useConteoCategorias();

  const menu = useMemo(() => agrupar(categorias)
    .map(g => {
      const items = g.items
        .filter(c => !conteo || (conteo[c.id] || 0) > 0)
        .map(c => ({ ...c, count: conteo?.[c.id] || 0 }));
      return { grupo: g.grupo, items, total: items.reduce((s, c) => s + c.count, 0) };
    })
    .filter(g => g.items.length > 0), [categorias, conteo]);
  const totalGeneral = menu.reduce((s, g) => s + g.total, 0);

  const enPagina = router.pathname === BASE;
  const catActual = enPagina && typeof router.query.cat === 'string' ? router.query.cat : '';
  const grupoActual = enPagina && typeof router.query.grupo === 'string' ? router.query.grupo : '';

  // ===== Escritorio: paneles flotantes =====
  const [pos1, setPos1] = useState<Pos | null>(null);
  const [grupoHover, setGrupoHover] = useState<string | null>(null);
  const [pos2, setPos2] = useState<Pos | null>(null);
  const cierre = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panel1 = useRef<HTMLDivElement>(null);
  const panel2 = useRef<HTMLDivElement>(null);

  // Depois de desenhar, mede a altura REAL do painel: se passa do fim da tela,
  // sobe o painel; se nem assim cabe, ele fica com a altura da tela e rola.
  const encaixar = (ref: RefObject<HTMLDivElement>, pos: Pos | null, set: (p: Pos) => void) => {
    const el = ref.current;
    if (!el || !pos) return;
    const h = el.scrollHeight + 2;
    const limite = window.innerHeight - 8;
    if (pos.top + h > limite && pos.top > 8) set({ ...pos, top: Math.max(8, limite - h) });
  };
  useLayoutEffect(() => encaixar(panel1, pos1, setPos1), [pos1]);
  useLayoutEffect(() => encaixar(panel2, pos2, setPos2), [pos2, grupoHover]);

  const conHover = () => typeof window !== 'undefined'
    && window.matchMedia('(hover: hover) and (min-width: 901px)').matches;

  const cancelarCierre = () => { if (cierre.current) { clearTimeout(cierre.current); cierre.current = null; } };
  const programarCierre = () => {
    cancelarCierre();
    cierre.current = setTimeout(() => { setPos1(null); setGrupoHover(null); setPos2(null); }, 220);
  };
  const cerrarYa = () => { cancelarCierre(); setPos1(null); setGrupoHover(null); setPos2(null); };
  useEffect(() => cancelarCierre, []);
  // Cerrar al cambiar de página (por si el clic no pasó por un link del panel).
  useEffect(() => { cerrarYa(); }, [router.asPath]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Ubica un panel a la derecha de `el`, sin salirse de la pantalla por abajo. */
  const ubicar = (el: HTMLElement, desdeX?: number): Pos => {
    const r = el.getBoundingClientRect();
    return { top: Math.max(8, r.top - 6), left: (desdeX ?? r.right) + 4 };
  };
  const estilo = (p: Pos) => ({ top: p.top, left: p.left, maxHeight: `calc(100vh - ${p.top + 8}px)` });

  const abrirNivel1 = (el: HTMLElement) => {
    if (!conHover()) return;
    cancelarCierre();
    if (!pos1) setPos1(ubicar(el));
  };

  const abrirNivel2 = (el: HTMLElement, grupo: string) => {
    cancelarCierre();
    setGrupoHover(grupo);
    const derecha = panel1.current?.getBoundingClientRect().right;
    setPos2(ubicar(el, derecha));
  };

  const grupoAbierto = menu.find(g => g.grupo === grupoHover);

  // ===== Celular: acordeón =====
  const [acordeon, setAcordeon] = useState(false);
  const [grupoAcordeon, setGrupoAcordeon] = useState<string | null>(null);

  const ir = () => { cerrarYa(); onNavigate(); };
  const num = (n: number) => conteo ? <span className={styles.count}>{n}</span> : null;

  return (
    <div className={styles.wrap} onMouseEnter={e => abrirNivel1(e.currentTarget)} onMouseLeave={programarCierre}>
      <div className={styles.fila}>
        <Link href={BASE} className={`${className} ${styles.principal} ${enPagina ? activeClass : ''} ${pos1 ? styles.principalHover : ''}`} onClick={ir}>
          <span className={styles.icon}>{icon}</span>
          <span>Proveedores</span>
          <FiChevronRight className={styles.flechaDesk} />
        </Link>
        <button type="button" className={styles.flechaMovil} aria-label="Ver categorías" onClick={() => setAcordeon(a => !a)}>
          {acordeon ? <FiChevronDown /> : <FiChevronRight />}
        </button>
      </div>

      {/* Nivel 1 (escritorio): grupos */}
      {pos1 && (
        <div ref={panel1} className={styles.panel} style={estilo(pos1)}
          onMouseEnter={cancelarCierre} onMouseLeave={programarCierre}>
          <Link href={BASE} className={`${styles.opcion} ${styles.todos} ${enPagina && !catActual && !grupoActual ? styles.activa : ''}`}
            onClick={ir} onMouseEnter={() => { setGrupoHover(null); setPos2(null); }}>
            <span>Todos los proveedores</span>{num(totalGeneral)}
          </Link>
          {menu.map(g => (
            <Link key={g.grupo} href={hrefGrupo(g.grupo)}
              className={`${styles.opcion} ${grupoHover === g.grupo ? styles.hover : ''} ${grupoActual === g.grupo ? styles.activa : ''}`}
              onClick={ir} onMouseEnter={e => abrirNivel2(e.currentTarget, g.grupo)}>
              <span>{g.grupo}</span>
              <span className={styles.der}>{num(g.total)}<FiChevronRight size={13} /></span>
            </Link>
          ))}
        </div>
      )}

      {/* Nivel 2 (escritorio): categorías del grupo */}
      {pos1 && pos2 && grupoAbierto && (
        <div ref={panel2} className={styles.panel} style={estilo(pos2)}
          onMouseEnter={cancelarCierre} onMouseLeave={programarCierre}>
          <Link href={hrefGrupo(grupoAbierto.grupo)} className={`${styles.opcion} ${styles.todos}`} onClick={ir}>
            <span>Todo {grupoAbierto.grupo}</span>{num(grupoAbierto.total)}
          </Link>
          {grupoAbierto.items.map(c => (
            <Link key={c.id} href={hrefCat(c.id)}
              className={`${styles.opcion} ${catActual === c.id ? styles.activa : ''}`} onClick={ir}>
              <span>{c.label}</span>{num(c.count)}
            </Link>
          ))}
        </div>
      )}

      {/* Celular: acordeón dentro del menú */}
      {acordeon && (
        <div className={styles.acordeon}>
          {menu.map(g => {
            const abierto = grupoAcordeon === g.grupo;
            return (
              <div key={g.grupo}>
                <button type="button" className={styles.accGrupo} onClick={() => setGrupoAcordeon(abierto ? null : g.grupo)}>
                  <span>{g.grupo}</span>
                  <span className={styles.der}>{num(g.total)}{abierto ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}</span>
                </button>
                {abierto && (
                  <div className={styles.accItems}>
                    <Link href={hrefGrupo(g.grupo)} className={`${styles.accItem} ${styles.todos}`} onClick={ir}>Todo {g.grupo}</Link>
                    {g.items.map(c => (
                      <Link key={c.id} href={hrefCat(c.id)}
                        className={`${styles.accItem} ${catActual === c.id ? styles.activa : ''}`} onClick={ir}>
                        <span>{c.label}</span>{num(c.count)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
