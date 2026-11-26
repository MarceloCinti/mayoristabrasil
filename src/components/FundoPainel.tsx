import { useEffect, useRef } from 'react';
import styles from './FundoPainel.module.css';

/**
 * Fundo animado das áreas logadas (painel, admin, afiliado).
 * Fica fixo atrás do conteúdo: os cards continuam brancos por cima.
 * As manchas derivam sozinhas (CSS) e reagem à rolagem e ao mouse,
 * cada camada numa velocidade diferente (efeito de profundidade).
 * O movimento vai por variáveis CSS (--sy, --mx, --my) num único
 * requestAnimationFrame, sem re-renderizar o React.
 */
export default function FundoPainel() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let mx = 0, my = 0;          // alvo do mouse (-1..1)
    let cx = 0, cy = 0;          // posição suavizada
    let sy = window.scrollY, csy = sy;

    const tick = () => {
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      csy += (sy - csy) * 0.12;
      el.style.setProperty('--mx', cx.toFixed(4));
      el.style.setProperty('--my', cy.toFixed(4));
      el.style.setProperty('--sy', csy.toFixed(1));
      const parado = Math.abs(mx - cx) < 0.001 && Math.abs(my - cy) < 0.001 && Math.abs(sy - csy) < 0.5;
      raf = parado ? 0 : requestAnimationFrame(tick);
    };
    const acordar = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const onScroll = () => { sy = window.scrollY; acordar(); };
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
      acordar();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    acordar();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={styles.fundo} aria-hidden>
      <div className={styles.pontos} />
      <div className={`${styles.camada} ${styles.c1}`}><span className={`${styles.mancha} ${styles.verde}`} /></div>
      <div className={`${styles.camada} ${styles.c2}`}><span className={`${styles.mancha} ${styles.amarelo}`} /></div>
      <div className={`${styles.camada} ${styles.c3}`}><span className={`${styles.mancha} ${styles.azul}`} /></div>
      <div className={`${styles.camada} ${styles.c4}`}><span className={`${styles.mancha} ${styles.verde2}`} /></div>
      <div className={`${styles.camada} ${styles.c5}`}><span className={styles.anel} /></div>
    </div>
  );
}
