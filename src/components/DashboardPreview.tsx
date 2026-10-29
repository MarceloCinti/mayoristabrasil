import { FaStore, FaMapMarkedAlt, FaUserSecret, FaFire, FaShieldAlt, FaSearch, FaWhatsapp, FaCheckCircle } from 'react-icons/fa';
import styles from './DashboardPreview.module.css';

const PROVEEDORES = [
  { nombre: 'Atelier Premium', cat: 'Femenino', precio: 'R$ 25–80', badge: 'Verificado', badgeType: 'verde' },
  { nombre: 'Jeans São Paulo', cat: 'Jeans', precio: 'R$ 45–120', badge: 'Mejor margen', badgeType: 'cyan' },
  { nombre: 'Fitness Prime', cat: 'Fitness', precio: 'R$ 30–90', badge: 'Tendencia', badgeType: 'azul' },
  { nombre: 'Fábrica Oriente', cat: 'Atacado', precio: 'R$ 18–60', badge: 'Recomendado PY', badgeType: 'verde' },
];

export default function DashboardPreview() {
  return (
    <div className={styles.frame}>
      <div className={styles.glow} />
      <div className={styles.window}>
        <div className={styles.topbar}>
          <span className={styles.dot} style={{ background: '#ff5f56' }} />
          <span className={styles.dot} style={{ background: '#ffbd2e' }} />
          <span className={styles.dot} style={{ background: '#27c93f' }} />
          <span className={styles.url}>plataforma.mayoristabrasil</span>
        </div>
        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <div className={styles.logo}><span className={styles.logoMark}>M</span></div>
            <nav>
              <span className={`${styles.navItem} ${styles.navActive}`}><FaStore /></span>
              <span className={styles.navItem}><FaMapMarkedAlt /></span>
              <span className={styles.navItem}><FaUserSecret /></span>
              <span className={styles.navItem}><FaFire /></span>
              <span className={styles.navItem}><FaShieldAlt /></span>
            </nav>
          </aside>

          <div className={styles.content}>
            <div className={styles.contentHead}>
              <div>
                <h4>Proveedores</h4>
                <span>+200 contactos verificados</span>
              </div>
              <div className={styles.searchBar}><FaSearch /> Buscar proveedor…</div>
            </div>

            <div className={styles.chips}>
              <span className={styles.chipActive}>Todos</span>
              <span className={styles.chip}>Femenino</span>
              <span className={styles.chip}>Jeans</span>
              <span className={styles.chip}>Fitness</span>
              <span className={styles.chip}>Bolsas</span>
            </div>

            <div className={styles.list}>
              {PROVEEDORES.map((p, i) => (
                <div key={i} className={styles.row}>
                  <div className={styles.avatar}>{p.nombre.charAt(0)}</div>
                  <div className={styles.rowInfo}>
                    <strong>{p.nombre}</strong>
                    <span>{p.cat} · {p.precio}</span>
                  </div>
                  <span className={`${styles.badge} ${styles['badge_' + p.badgeType]}`}>{p.badge}</span>
                  <span className={styles.wpp}><FaWhatsapp /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
