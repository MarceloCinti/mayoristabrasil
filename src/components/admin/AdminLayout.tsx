import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FaUsers, FaStore, FaBookOpen, FaGift, FaSignOutAlt, FaArrowLeft, FaBars, FaTimes, FaTachometerAlt, FaDesktop, FaHandshake, FaMoneyBillWave, FaEnvelope, FaExchangeAlt, FaCreditCard } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminLayout.module.css';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: <FaTachometerAlt /> },
  { href: '/admin/landing', label: 'Editar Landing', icon: <FaDesktop /> },
  { href: '/admin/usuarios', label: 'Usuarios', icon: <FaUsers /> },
  { href: '/admin/afiliados', label: 'Afiliados', icon: <FaHandshake /> },
  { href: '/admin/pagos', label: 'Pagos', icon: <FaMoneyBillWave /> },
  { href: '/admin/datos-pago', label: 'Datos de pago', icon: <FaCreditCard /> },
  { href: '/admin/cambio', label: 'Cambio', icon: <FaExchangeAlt /> },
  { href: '/admin/emails', label: 'Emails', icon: <FaEnvelope /> },
  { href: '/admin/proveedores', label: 'Proveedores', icon: <FaStore /> },
  { href: '/admin/contenido', label: 'Contenido', icon: <FaBookOpen /> },
  { href: '/admin/bonos', label: 'Bonos', icon: <FaGift /> },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { logout, userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [pagosPendientes, setPagosPendientes] = useState(0);
  const [cambioPendientes, setCambioPendientes] = useState(0);
  const [afiliadosNuevos, setAfiliadosNuevos] = useState(0);
  const [avisosTransferencia, setAvisosTransferencia] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'solicitudesPago'), where('estado', '==', 'pendiente')));
        setPagosPendientes(snap.size);
      } catch { /* noop */ }
      try {
        const snap = await getDocs(query(collection(db, 'solicitudesCambio'), where('estado', '==', 'pendiente')));
        setCambioPendientes(snap.size);
      } catch { /* noop */ }
      try {
        const snap = await getDocs(query(collection(db, 'solicitudesAfiliado'), where('estado', '==', 'pendiente')));
        setAfiliadosNuevos(snap.size);
      } catch { /* noop */ }
      try {
        // Quien avisó que transfirió y todavía no fue liberado
        const snap = await getDocs(query(collection(db, 'usuarios'), where('pagoPendiente', '==', true)));
        setAvisosTransferencia(snap.docs.filter(d => d.data().pago !== true).length);
      } catch { /* noop */ }
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className={styles.layout}>
      <button className={styles.burger} onClick={() => setOpen(!open)}>
        {open ? <FaTimes /> : <FaBars />}
      </button>

      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <span className={styles.brandTag}>ADMIN</span>
          <Link href="/admin" className={styles.brandName}>
            <span className={styles.logoBr}>Mayorista</span>
            <span className={styles.logoPy}>Brasil</span>
          </Link>
        </div>

        <nav className={styles.nav}>
          {NAV.map(item => {
            const active = item.href === '/admin'
              ? router.pathname === '/admin'
              : router.pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`${styles.navItem} ${active ? styles.active : ''}`} onClick={() => setOpen(false)}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '/admin/pagos' && pagosPendientes > 0 && (
                  <span className={styles.navBadge}>{pagosPendientes}</span>
                )}
                {item.href === '/admin/cambio' && cambioPendientes > 0 && (
                  <span className={styles.navBadge}>{cambioPendientes}</span>
                )}
                {item.href === '/admin/afiliados' && afiliadosNuevos > 0 && (
                  <span className={styles.navBadge}>{afiliadosNuevos}</span>
                )}
                {item.href === '/admin/usuarios' && avisosTransferencia > 0 && (
                  <span className={styles.navBadge} title="Avisaron que transfirieron">{avisosTransferencia}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <Link href="/dashboard" className={styles.backLink}>
            <FaArrowLeft /> Ir al sitio
          </Link>
          <div className={styles.userBox}>
            <div className={styles.userName}>{userData?.nombre}</div>
            <div className={styles.userEmail}>{userData?.email}</div>
          </div>
          <button onClick={handleLogout} className={styles.logout}>
            <FaSignOutAlt /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
