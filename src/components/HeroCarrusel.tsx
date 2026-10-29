import { useEffect, useState } from 'react';
import styles from './HeroCarrusel.module.css';

/**
 * Banner del hero: fotos reales de compra, rotando cada 3 segundos.
 * Cada foto trae SUS PROPIOS valores de compra y venta — por eso los badges
 * viven acá adentro y no en la página: tienen que cambiar junto con la imagen.
 *
 * Para cambiar fotos o precios, editá esta lista. Las imágenes están en
 * /public/img/.
 */
const SLIDES = [
  {
    src: '/img/hero-calzados.webp',
    alt: 'Revendedora con cajas de calzados compradas de fábrica',
    compra: 'Gs. 80.000',
    venta: 'Gs. 240.000',
  },
  {
    src: '/img/hero-ropa.webp',
    alt: 'Revendedora con jeans y ropa compradas de fábrica',
    compra: 'Gs. 35.000',
    venta: 'Gs. 120.000',
  },
];

const INTERVALO_MS = 3000;

export default function HeroCarrusel() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (SLIDES.length < 2) return;
    const t = setInterval(() => setI(prev => (prev + 1) % SLIDES.length), INTERVALO_MS);
    return () => clearInterval(t);
  }, []);

  const actual = SLIDES[i];

  return (
    <div className={styles.wrap}>
      <div className={styles.marco}>
        {SLIDES.map((s, k) => (
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            className={k === i ? styles.foto + ' ' + styles.fotoOn : styles.foto}
            // La primera se carga enseguida (está en la primera pantalla);
            // el resto puede esperar.
            loading={k === 0 ? 'eager' : 'lazy'}
            aria-hidden={k !== i}
          />
        ))}
      </div>

      <div className={styles.badge + ' ' + styles.badgeTop}>
        <span className={styles.badgeLabel}>Compraste</span>
        <strong key={'c' + i}>{actual.compra}</strong>
      </div>
      <div className={styles.badge + ' ' + styles.badgeBottom}>
        <span className={styles.badgeLabel}>Vendés en PY</span>
        <strong key={'v' + i} className={styles.badgeVerde}>{actual.venta}</strong>
      </div>

      <div className={styles.puntos} aria-hidden="true">
        {SLIDES.map((s, k) => (
          <span key={s.src} className={k === i ? styles.punto + ' ' + styles.puntoOn : styles.punto} />
        ))}
      </div>
    </div>
  );
}
