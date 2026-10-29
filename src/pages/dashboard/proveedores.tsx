import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, orderBy, where, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { FiSearch, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useCategorias } from '@/lib/useCategorias';
import { agrupar } from '@/lib/categorias';
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
  const [filtro, setFiltro] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Permite entrar filtrado desde la home: /dashboard/proveedores?cat=jeans
  useEffect(() => {
    const cat = router.query.cat;
    if (typeof cat === 'string' && cat) setFiltro(cat);
  }, [router.query.cat]);

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
    if (filtro !== 'todos' && p.categoria !== filtro) return false;
    if (busqueda) {
      const t = busqueda.toLowerCase();
      return p.nombre.toLowerCase().includes(t) || (p.direccion || '').toLowerCase().includes(t);
    }
    return true;
  }), [proveedores, filtro, busqueda]);

  // Menú lateral: solo grupos/categorías que tienen proveedores.
  const menu = useMemo(() => {
    const counts: Record<string, number> = {};
    proveedores.forEach(p => { counts[p.categoria] = (counts[p.categoria] || 0) + 1; });
    return agrupar(categorias)
      .map(g => ({
        grupo: g.grupo,
        total: g.items.reduce((s, c) => s + (counts[c.id] || 0), 0),
        items: g.items.filter(c => (counts[c.id] || 0) > 0).map(c => ({ ...c, count: counts[c.id] || 0 })),
      }))
      .filter(g => g.items.length > 0);
  }, [proveedores, categorias]);

  const toggleGrupo = (g: string) => setColapsados(prev => {
    const n = new Set(prev);
    n.has(g) ? n.delete(g) : n.add(g);
    return n;
  });

  if (guardLoading || !authorized) return null;

  return (
    <DashboardLayout>
      <Head><title>Proveedores — Mayorista Brasil</title></Head>

      <div className={styles.header}>
        <h1>Proveedores</h1>
        <p>{proveedores.length} contactos verificados de Brás (São Paulo)</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <FiSearch />
          <input type="text" placeholder="Buscar por nombre, dirección..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      <div className={styles.layout}>
        {/* Menú lateral por grupos */}
        <aside className={styles.sidebar}>
          <button onClick={() => setFiltro('todos')} className={`${styles.todos} ${filtro === 'todos' ? styles.todosActive : ''}`}>
            <span>Todos</span><span className={styles.catCount}>{proveedores.length}</span>
          </button>
          {menu.map(g => {
            const abierto = !colapsados.has(g.grupo);
            return (
              <div key={g.grupo} className={styles.grp}>
                <button onClick={() => toggleGrupo(g.grupo)} className={styles.grpHead}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {abierto ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}{g.grupo}
                  </span>
                  <span className={styles.catCount}>{g.total}</span>
                </button>
                {abierto && (
                  <div className={styles.grpItems}>
                    {g.items.map(c => (
                      <button key={c.id} onClick={() => setFiltro(c.id)} className={`${styles.catBtn} ${filtro === c.id ? styles.catActive : ''}`}>
                        <span>{c.label}</span><span className={styles.catCount}>{c.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

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
