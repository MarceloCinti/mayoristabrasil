import { FaStore, FaTshirt, FaShoePrints, FaMapMarkerAlt, FaUserSecret, FaGift, FaPlay, FaStar, FaGem, FaBoxOpen } from 'react-icons/fa';
import type React from 'react';
import styles from './BannerArte.module.css';

export type ArteBanner = '' | 'proveedores' | 'secretos' | 'bonos' | 'academia';

export const ARTES: { id: ArteBanner; label: string }[] = [
  { id: '', label: 'Ninguna' },
  { id: 'proveedores', label: 'Tarjetas de proveedores' },
  { id: 'secretos', label: 'Radar secreto' },
  { id: 'bonos', label: 'Regalo con estrellas' },
  { id: 'academia', label: 'Video / curso' },
];

/** Ilustração animada do lado direito do banner (só CSS, sem imagem). */
export default function BannerArte({ arte }: { arte?: ArteBanner }) {
  if (!arte) return null;

  if (arte === 'proveedores') return (
    <div className={styles.arte} aria-hidden>
      <div className={`${styles.mini} ${styles.m1}`}><span className={styles.ico}><FaTshirt /></span><i /><i /></div>
      <div className={`${styles.mini} ${styles.m2}`}><span className={styles.ico}><FaStore /></span><i /><i /></div>
      <div className={`${styles.mini} ${styles.m3}`}><span className={styles.ico}><FaShoePrints /></span><i /><i /></div>
      <div className={styles.pin}><FaMapMarkerAlt /><span className={styles.pinOnda} /></div>
      <div className={styles.contador}>+1.000<small>proveedores</small></div>
    </div>
  );

  if (arte === 'secretos') return (
    <div className={styles.arte} aria-hidden>
      <div className={styles.radar}>
        <span className={styles.radarAnel} /><span className={`${styles.radarAnel} ${styles.ra2}`} /><span className={`${styles.radarAnel} ${styles.ra3}`} />
        <span className={styles.radarVarre} />
        <span className={`${styles.ponto} ${styles.p1}`} /><span className={`${styles.ponto} ${styles.p2}`} /><span className={`${styles.ponto} ${styles.p3}`} /><span className={`${styles.ponto} ${styles.p4}`} />
        <span className={styles.radarCentro}><FaUserSecret /></span>
      </div>
    </div>
  );

  if (arte === 'bonos') return (
    <div className={styles.arte} aria-hidden>
      <span className={styles.raios} />
      <div className={styles.presente}><FaGift /></div>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={styles.faisca} style={{ ['--ang' as string]: `${i * 36}deg`, animationDelay: `${(i % 5) * .32}s` } as React.CSSProperties}><FaStar /></span>
      ))}
      <span className={`${styles.flutua} ${styles.f1}`}><FaGem /></span>
      <span className={`${styles.flutua} ${styles.f2}`}><FaBoxOpen /></span>
    </div>
  );

  return (
    <div className={styles.arte} aria-hidden>
      <div className={styles.tela}>
        <span className={styles.play}><FaPlay /></span>
        <div className={styles.barra}><span /></div>
        <div className={styles.linhas}><i /><i /></div>
      </div>
      <span className={`${styles.balao} ${styles.b1}`}>Módulo 1</span>
      <span className={`${styles.balao} ${styles.b2}`}>24 clases</span>
    </div>
  );
}
