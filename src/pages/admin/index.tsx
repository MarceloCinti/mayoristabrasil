import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { FaUsers, FaStore, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const { isAdmin, loading } = useAdminGuard();
  const [stats, setStats] = useState({ totalUsuarios: 0, pagados: 0, proveedores: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      try {
        const [usuariosSnap, proveedoresSnap] = await Promise.all([
          getDocs(collection(db, 'usuarios')),
          getDocs(collection(db, 'proveedores')),
        ]);
        const pagados = usuariosSnap.docs.filter(d => d.data().pago === true).length;
        setStats({
          totalUsuarios: usuariosSnap.size,
          pagados,
          proveedores: proveedoresSnap.size,
        });
      } catch (err) { console.error(err); }
      setStatsLoading(false);
    };
    fetch();
  }, [isAdmin]);

  if (loading || !isAdmin) return null;

  return (
    <AdminLayout>
      <Head><title>Admin — Mayorista Brasil</title></Head>

      <div className={styles.header}>
        <h1>Panel Administrativo</h1>
        <p>Visión general de la plataforma</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <FaUsers className={styles.statIcon} style={{ color: 'var(--br-azul)' }} />
          <div>
            <div className={styles.statLabel}>Usuarios totales</div>
            <div className={styles.statValue}>{statsLoading ? '—' : stats.totalUsuarios}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <FaCheckCircle className={styles.statIcon} style={{ color: 'var(--br-verde)' }} />
          <div>
            <div className={styles.statLabel}>Usuarios pagados</div>
            <div className={styles.statValue}>{statsLoading ? '—' : stats.pagados}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <FaStore className={styles.statIcon} style={{ color: 'var(--py-rojo)' }} />
          <div>
            <div className={styles.statLabel}>Proveedores cargados</div>
            <div className={styles.statValue}>{statsLoading ? '—' : stats.proveedores}</div>
          </div>
        </div>
      </div>

      <div className={styles.quickGrid}>
        {[
          { href: '/admin/usuarios', label: 'Liberar acceso', desc: 'Marcar usuarios que ya pagaron' },
          { href: '/admin/proveedores', label: 'Cargar proveedores', desc: 'Importar CSV o cargar manual' },
          { href: '/admin/contenido', label: 'Editar contenido', desc: 'Mapa, datos de importación, tendencias, estafas' },
          { href: '/admin/bonos', label: 'Gestionar bonos', desc: 'Editar los 4 bonos exclusivos' },
        ].map(q => (
          <Link key={q.href} href={q.href} className={styles.quickCard}>
            <div>
              <h3>{q.label}</h3>
              <p>{q.desc}</p>
            </div>
            <FaArrowRight />
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
