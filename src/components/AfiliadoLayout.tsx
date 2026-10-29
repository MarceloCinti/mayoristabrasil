import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaHandshake, FaSignOutAlt, FaBars, FaTimes, FaCog, FaStore, FaArrowLeft, FaMoneyBillWave } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import styles from './AfiliadoLayout.module.css';

export default function AfiliadoLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { userData, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => { await logout(); router.push('/'); };

  return (
    <div className={styles.layout}>
      <button className={styles.burger} onClick={() => setOpen(!open)}>{open ? <FaTimes /> : <FaBars />}</button>

      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <Link href="/afiliado" className={styles.logo}>
          <span className={styles.logoMark}>M</span>
          <span className={styles.logoText}>Mayorista <b>Brasil</b></span>
        </Link>

        <nav className={styles.nav}>
          <Link href="/afiliado" className={`${styles.navItem} ${router.pathname === '/afiliado' ? styles.active : ''}`} onClick={() => setOpen(false)}>
            <FaHandshake /> <span>Panel de afiliado</span>
          </Link>
          <Link href="/cobros" className={`${styles.navItem} ${router.pathname === '/cobros' ? styles.active : ''}`} onClick={() => setOpen(false)}>
            <FaMoneyBillWave /> <span>Cobro</span>
          </Link>
          {userData?.pago && (
            <Link href="/dashboard" className={styles.navItem} onClick={() => setOpen(false)}>
              <FaStore /> <span>Mi acceso</span>
            </Link>
          )}
        </nav>

        <div className={styles.footer}>
          {userData?.esAdmin && (
            <Link href="/admin" className={styles.adminLink}><FaCog /> Panel admin</Link>
          )}
          <Link href="/" className={styles.backLink}><FaArrowLeft /> Ir al sitio</Link>
          <div className={styles.userBox}>
            <div className={styles.userName}>{userData?.nombre}</div>
            <div className={styles.userEmail}>{userData?.email}</div>
          </div>
          <button onClick={handleLogout} className={styles.logout}><FaSignOutAlt /> Cerrar sesión</button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
