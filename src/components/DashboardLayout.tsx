import { ReactNode, useState, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaStore, FaMapMarkedAlt, FaUserSecret, FaTruck, FaFire, FaShieldAlt, FaGift, FaSignOutAlt, FaBars, FaTimes, FaCog, FaHandshake, FaHeart, FaExchangeAlt } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import { useContadorClics } from '@/hooks/useTrial';
import { trialUsados, TRIAL_LIMITE } from '@/lib/trial';
import PaywallModal from './PaywallModal';
import styles from './DashboardLayout.module.css';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: <FaStore /> },
  { href: '/dashboard/proveedores', label: 'Proveedores', icon: <FaStore /> },
  { href: '/dashboard/mapa', label: 'Mapa de Brás', icon: <FaMapMarkedAlt /> },
  { href: '/dashboard/secretos', label: 'Proveedores Secretos', icon: <FaUserSecret /> },
  { href: '/dashboard/favoritos', label: 'Favoritos', icon: <FaHeart /> },
  { href: '/cambio', label: 'Cambio R$/Gs', icon: <FaExchangeAlt /> },
  { href: '/dashboard/importar', label: 'Datos para importar', icon: <FaTruck /> },
  { href: '/dashboard/tendencias', label: 'Tendencias', icon: <FaFire /> },
  { href: '/dashboard/estafas', label: 'Lista de Estafas', icon: <FaShieldAlt /> },
  { href: '/dashboard/bonos', label: 'Bonos', icon: <FaGift /> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { userData, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const gastarClic = useContadorClics();

  // Contador optimista: el bloqueo no espera a que Firestore responda, si no
  // el quinto clic alcanzaría a abrir la página antes de bloquear.
  const [usadosLocal, setUsadosLocal] = useState(0);
  const guardados = trialUsados(userData);
  useEffect(() => { setUsadosLocal(p => Math.max(p, guardados)); }, [guardados]);
  const usados = Math.max(usadosLocal, guardados);

  const conAcceso = !!userData && (!!userData.pago || !!userData.esAdmin);
  const bloqueado = !!userData && !conAcceso && usados >= TRIAL_LIMITE;
  // El conteo es deliberadamente invisible para el cliente: no mostramos
  // cuántos clics le quedan. El popup aparece sin aviso previo.

  /**
   * Cuenta un clic de la prueba. Se engancha en la raíz del layout en fase de
   * captura, así atrapa tanto los links del menú como las tarjetas de proveedor
   * (marcadas con data-trial-click) sin tocar cada componente.
   */
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (conAcceso || bloqueado) return;
    const el = (e.target as HTMLElement | null)?.closest?.('a[href], [data-trial-click]');
    if (!el) return;

    // Links que SALEN del contenido pago no gastan prueba: panel admin,
    // panel de afiliado y volver al sitio público.
    const href = el.getAttribute('href') || '';
    if (el.tagName === 'A') {
      if (!href.startsWith('/')) return;                  // externos (WhatsApp, Instagram)
      if (href === '/' || href.startsWith('/admin') || href.startsWith('/afiliado')) return;
    }

    if (gastarClic()) setUsadosLocal(u => u + 1);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className={styles.layout} onClickCapture={onClickCapture}>
      <button className={styles.burger} onClick={() => setOpen(!open)}>
        {open ? <FaTimes /> : <FaBars />}
      </button>

      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <Link href="/dashboard" className={styles.logo}>
          <span className={styles.logoBr}>Mayorista</span>
          <span className={styles.logoPy}>Brasil</span>
        </Link>

        <nav className={styles.nav}>
          {NAV.map(item => {
            const active = router.pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`${styles.navItem} ${active ? styles.active : ''}`} onClick={() => setOpen(false)}>
                <span className={styles.icon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          {userData?.esAfiliado && (
            <Link href="/afiliado" className={styles.adminLink} style={{ background: 'rgba(18,128,59,.1)', color: 'var(--verde)' }}>
              <FaHandshake /> Panel afiliado
            </Link>
          )}
          {userData?.esAdmin && (
            <Link href="/admin" className={styles.adminLink}>
              <FaCog /> Panel admin
            </Link>
          )}
          <div className={styles.userBox}>
            <div className={styles.userName}>{userData?.nombre || 'Usuario'}</div>
            <div className={styles.userEmail}>{userData?.email}</div>
          </div>
          <button onClick={handleLogout} className={styles.logout}>
            <FaSignOutAlt /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={bloqueado ? styles.contenidoBloqueado : undefined} aria-hidden={bloqueado}>
          {children}
        </div>
      </main>

      {bloqueado && <PaywallModal />}
    </div>
  );
}
