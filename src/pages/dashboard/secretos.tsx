import Head from 'next/head';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { FaUserSecret } from 'react-icons/fa';
import { FiLock } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { Proveedor, Resena, EstadoFav } from '@/lib/proveedorTypes';
import { useAuth } from '@/context/AuthContext';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import ProveedorCard from '@/components/ProveedorCard';
import styles from './proveedores.module.css';

export default function Secretos() {
  const { authorized, loading: guardLoading } = usePagoGuard();
  const { user, userData } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [favMap, setFavMap] = useState<Record<string, EstadoFav>>({});
  const [resenasMap, setResenasMap] = useState<Record<string, Resena[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'proveedores'), orderBy('nombre')));
        setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Proveedor)).filter(p => p.esSecreto));

        const resSnap = await getDocs(collection(db, 'resenas'));
        const rmap: Record<string, Resena[]> = {};
        resSnap.docs.forEach(d => { const r = { id: d.id, ...d.data() } as Resena; (rmap[r.proveedorId] ||= []).push(r); });
        setResenasMap(rmap);

        if (user) {
          const favSnap = await getDocs(query(collection(db, 'favoritos'), where('uid', '==', user.uid)));
          const fmap: Record<string, EstadoFav> = {};
          favSnap.docs.forEach(d => { const f = d.data(); fmap[f.proveedorId] = f.estado; });
          setFavMap(fmap);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, [authorized, user]);

  const guardarFav = async (p: Proveedor, estado: EstadoFav) => {
    if (!user) return;
    await setDoc(doc(db, 'favoritos', `${user.uid}_${p.id}`), {
      uid: user.uid, proveedorId: p.id, estado, nombre: p.nombre, categoria: p.categoria, foto: p.fotos?.[0] || '', createdAt: serverTimestamp(),
    });
    setFavMap(prev => ({ ...prev, [p.id]: estado }));
  };
  const toggleFav = async (p: Proveedor) => {
    if (!user) return;
    if (favMap[p.id]) {
      await deleteDoc(doc(db, 'favoritos', `${user.uid}_${p.id}`));
      setFavMap(prev => { const n = { ...prev }; delete n[p.id]; return n; });
    } else { await guardarFav(p, 'guardado'); }
  };
  const saveResena = async (p: Proveedor, estrellas: number, texto: string) => {
    if (!user) return;
    const resena: Resena = { id: `${user.uid}_${p.id}`, proveedorId: p.id, uid: user.uid, nombre: userData?.nombre || 'Usuario', texto, estrellas };
    await setDoc(doc(db, 'resenas', resena.id), { ...resena, createdAt: serverTimestamp() });
    setResenasMap(prev => {
      const list = (prev[p.id] || []).filter(r => r.uid !== user.uid);
      return { ...prev, [p.id]: [{ ...resena, createdAt: { toDate: () => new Date() } }, ...list] };
    });
  };

  const toggleLike = async (r: Resena) => {
    if (!user) return;
    const liked = (r.likes || []).includes(user.uid);
    await updateDoc(doc(db, 'resenas', r.id), { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
    setResenasMap(prev => ({
      ...prev,
      [r.proveedorId]: (prev[r.proveedorId] || []).map(x => x.id === r.id
        ? { ...x, likes: liked ? (x.likes || []).filter(u => u !== user.uid) : [...(x.likes || []), user.uid] }
        : x),
    }));
  };
  const addRespuesta = async (r: Resena, texto: string) => {
    if (!user) return;
    const resp = { uid: user.uid, nombre: userData?.nombre || 'Usuario', texto, ts: Date.now() };
    await updateDoc(doc(db, 'resenas', r.id), { respuestas: arrayUnion(resp) });
    setResenasMap(prev => ({
      ...prev,
      [r.proveedorId]: (prev[r.proveedorId] || []).map(x => x.id === r.id
        ? { ...x, respuestas: [...(x.respuestas || []), resp] } : x),
    }));
  };

  if (guardLoading || !authorized) return null;

  return (
    <DashboardLayout>
      <Head><title>Proveedores Secretos — Mayorista Brasil</title></Head>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: 13, background: 'rgba(245,181,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--oro)' }}>
          <FaUserSecret />
        </div>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600 }}>Proveedores Secretos</h1>
          <p style={{ color: 'var(--text-mut)', fontSize: 14 }}>
            <FiLock style={{ display: 'inline', marginRight: 6, fontSize: 12 }} />
            Fábricas, distribuidores y tiendas escondidas — exclusivos para vos.
          </p>
        </div>
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando...</p>
      ) : proveedores.length === 0 ? (
        <div className={styles.empty}>Aún no hay proveedores secretos cargados. Esta sección se actualiza periódicamente.</div>
      ) : (
        <div className={styles.grid}>
          {proveedores.map(p => (
            <ProveedorCard
              key={p.id} p={p}
              estadoFav={favMap[p.id] || null}
              resenas={resenasMap[p.id] || []}
              miUid={user?.uid || ''}
              onToggleFav={toggleFav}
              onSetEstado={guardarFav}
              onSaveResena={saveResena}
              onToggleLike={toggleLike}
              onAddRespuesta={addRespuesta}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
