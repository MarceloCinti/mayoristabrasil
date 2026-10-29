import Head from 'next/head';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { FiHeart, FiTrash2 } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useCategorias } from '@/lib/useCategorias';
import { ESTADOS_FAV, EstadoFav } from '@/lib/proveedorTypes';
import { useAuth } from '@/context/AuthContext';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import Foto from '@/components/Foto';
import styles from './favoritos.module.css';

interface Fav {
  id: string; proveedorId: string; estado: EstadoFav; nombre: string; categoria: string; foto?: string;
}

export default function Favoritos() {
  const { authorized, loading: guardLoading } = usePagoGuard();
  const { user } = useAuth();
  const { categorias } = useCategorias();
  const [favs, setFavs] = useState<Fav[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorized || !user) { if (authorized) setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'favoritos'), where('uid', '==', user.uid)));
        setFavs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fav)));
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, [authorized, user]);

  const quitar = async (f: Fav) => {
    await deleteDoc(doc(db, 'favoritos', f.id));
    setFavs(prev => prev.filter(x => x.id !== f.id));
  };

  if (guardLoading || !authorized) return null;

  return (
    <DashboardLayout>
      <Head><title>Favoritos — Mayorista Brasil</title></Head>
      <div className={styles.header}>
        <h1><FiHeart style={{ verticalAlign: 'middle', marginRight: 8, color: '#f43f5e' }} />Mis favoritos</h1>
        <p>Tus proveedores guardados, organizados por estado.</p>
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : favs.length === 0 ? (
        <div className={styles.empty}>Todavía no guardaste proveedores. Tocá el ❤ en cualquier proveedor para agregarlo.</div>
      ) : (
        ESTADOS_FAV.map(est => {
          const lista = favs.filter(f => f.estado === est.id);
          if (lista.length === 0) return null;
          return (
            <div key={est.id} className={styles.grupo}>
              <h2 className={styles.grupoTitulo}>{est.label} <span>{lista.length}</span></h2>
              <div className={styles.grid}>
                {lista.map(f => {
                  const cat = categorias.find(c => c.id === f.categoria);
                  return (
                    <div key={f.id} className={styles.card}>
                      <div className={styles.thumb}>
                        <Foto src={f.foto} alt={f.nombre} lazy fallback={<div className={styles.thumbEmpty}><FiHeart /></div>} />
                        <button className={styles.del} onClick={() => quitar(f)} title="Quitar"><FiTrash2 /></button>
                      </div>
                      <div className={styles.body}>
                        <h3>{f.nombre}</h3>
                        {cat && <span className={styles.cat}>{cat.label}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </DashboardLayout>
  );
}
