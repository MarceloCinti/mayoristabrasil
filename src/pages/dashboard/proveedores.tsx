import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, where, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { FiSearch, FiChevronRight, FiX } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useCategorias } from '@/lib/useCategorias';
import { Proveedor, Resena, EstadoFav } from '@/lib/proveedorTypes';
import { useAuth } from '@/context/AuthContext';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import DashboardLayout from '@/components/DashboardLayout';
import ProveedorCard from '@/components/ProveedorCard';
import styles from './proveedores.module.css';

export default function Proveedores() {
  const { authorized, loading: guardLoading } = usePagoGuard();
  const { user, userData } = useAuth();
  const { categorias } = useCategorias();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [favMap, setFavMap] = useState<Record<string, EstadoFav>>({});
  const [resenasMap, setResenasMap] = useState<Record<string, Resena[]>>({});
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const router = useRouter();

  // El filtro vive en la URL: lo eligen el menú lateral en cascata
  // (?grupo=Moda o ?cat=jeans) y los atajos de la home (?cat=jeans).
  const cat = typeof router.query.cat === 'string' ? router.query.cat : '';
  const grupo = typeof router.query.grupo === 'string' ? router.query.grupo : '';
  const catInfo = cat ? categorias.find(c => c.id === cat) : undefined;
  const grupoSel = grupo || catInfo?.grupo || '';
  const idsGrupo = useMemo(
    () => new Set(categorias.filter(c => (c.grupo || 'Otros') === grupo).map(c => c.id)),
    [categorias, grupo],
  );

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'proveedores'), orderBy('nombre')));
        setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Proveedor)).filter(p => !p.esSecreto));

        const resSnap = await getDocs(collection(db, 'resenas'));
        const rmap: Record<string, Resena[]> = {};
        resSnap.docs.forEach(d => {
          const r = { id: d.id, ...d.data() } as Resena;
          (rmap[r.proveedorId] ||= []).push(r);
        });
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
      uid: user.uid, proveedorId: p.id, estado,
      nombre: p.nombre, categoria: p.categoria, foto: p.fotos?.[0] || '',
      createdAt: serverTimestamp(),
    });
    setFavMap(prev => ({ ...prev, [p.id]: estado }));
  };

  const toggleFav = async (p: Proveedor) => {
    if (!user) return;
    if (favMap[p.id]) {
      await deleteDoc(doc(db, 'favoritos', `${user.uid}_${p.id}`));
      setFavMap(prev => { const n = { ...prev }; delete n[p.id]; return n; });
    } else {
      await guardarFav(p, 'guardado');
    }
  };

  const saveResena = async (p: Proveedor, estrellas: number, texto: string) => {
    if (!user) return;
    const resena: Resena = {
      id: `${user.uid}_${p.id}`, proveedorId: p.id, uid: user.uid,
      nombre: userData?.nombre || 'Usuario', texto, estrellas,
    };
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

  const filtrados = useMemo(() => proveedores.filter(p => {
    if (cat && p.categoria !== cat) return false;
    if (!cat && grupo && !idsGrupo.has(p.categoria)) return false;
    if (busqueda) {
      const t = busqueda.toLowerCase();
      return p.nombre.toLowerCase().includes(t) || (p.direccion || '').toLowerCase().includes(t);
    }
    return true;
  }), [proveedores, cat, grupo, idsGrupo, busqueda]);

  if (guardLoading || !authorized) return null;

  return (
    <DashboardLayout>
      <Head><title>Proveedores — Mayorista Brasil</title></Head>

      <div className={styles.header}>
        <h1>Proveedores</h1>
        <p>{proveedores.length} contactos verificados de todo Brasil</p>
        {(cat || grupo) && (
          <div className={styles.filtroActual}>
            <Link href="/dashboard/proveedores">Todos</Link>
            {grupoSel && <><FiChevronRight /><Link href={`/dashboard/proveedores?grupo=${encodeURIComponent(grupoSel)}`} className={!cat ? styles.filtroUltimo : ''}>{grupoSel}</Link></>}
            {cat && <><FiChevronRight /><span className={styles.filtroUltimo}>{catInfo?.label || cat}</span></>}
            <span className={styles.filtroCount}>{loading ? '' : `${filtrados.length} proveedores`}</span>
            <Link href="/dashboard/proveedores" className={styles.filtroQuitar} aria-label="Quitar filtro"><FiX /></Link>
          </div>
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <FiSearch />
          <input type="text" placeholder="Buscar por nombre, dirección..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      <div className={styles.layout}>
        {/* Grade de proveedores */}
        <div className={styles.main}>
          {loading ? (
            <p className={styles.empty}>Cargando proveedores...</p>
          ) : filtrados.length === 0 ? (
            <div className={styles.empty}>{proveedores.length === 0 ? 'Aún no hay proveedores cargados. Vuelve pronto.' : 'Ningún proveedor coincide con tu búsqueda.'}</div>
          ) : (
            <div className={styles.grid}>
              {filtrados.map(p => (
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
        </div>
      </div>
    </DashboardLayout>
  );
}
