import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FaComments } from 'react-icons/fa';
import { FiPlus, FiMessageCircle, FiHeart, FiX, FiSend, FiLock } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import { apodoDe } from '@/lib/nickname';
import { avatarDe } from '@/lib/avatar';
import Avatar from '@/components/Avatar';
import { CATEGORIAS_FORO, ForoTema, haceCuanto, labelCategoriaForo, LIMITE_TEXTO, LIMITE_TITULO } from '@/lib/foro';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './foro.module.css';

export default function Foro() {
  const router = useRouter();
  const { authorized, loading } = usePagoGuard();
  const { user, userData } = useAuth();
  const [temas, setTemas] = useState<ForoTema[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'cerrado'>('cargando');
  const [cat, setCat] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [catNuevo, setCatNuevo] = useState('general');
  const [enviando, setEnviando] = useState(false);

  const puedePublicar = !!userData && (!!userData.pago || !!userData.esAdmin);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'foroTemas'), orderBy('ultimaEn', 'desc'), limit(150)));
        setTemas(snap.docs.map(d => ({ id: d.id, ...d.data() } as ForoTema)));
        setEstado('ok');
      } catch (e) { console.error(e); setEstado('cerrado'); }
    })();
  }, [authorized]);

  const lista = useMemo(() => (cat ? temas.filter(t => t.categoria === cat) : temas), [temas, cat]);

  if (loading || !authorized) return null;

  const publicar = async () => {
    if (!user || !userData) return;
    if (titulo.trim().length < 5) { toast.error('Escribí un título un poco más largo'); return; }
    if (texto.trim().length < 5) { toast.error('Contá un poco más en el mensaje'); return; }
    setEnviando(true);
    try {
      const ref = await addDoc(collection(db, 'foroTemas'), {
        uid: user.uid, apodo: apodoDe(userData), avatar: avatarDe(userData.avatar, user.uid), titulo: titulo.trim().slice(0, LIMITE_TITULO),
        texto: texto.trim().slice(0, LIMITE_TEXTO), categoria: catNuevo,
        createdAt: serverTimestamp(), ultimaEn: serverTimestamp(), respuestas: 0, likes: [],
      });
      toast.success('Tema publicado');
      router.push(`/dashboard/foro/${ref.id}`);
    } catch (e) { console.error(e); toast.error('No se pudo publicar'); }
    setEnviando(false);
  };

  return (
    <DashboardLayout>
      <Head><title>Foro — Mayorista Brasil</title></Head>

      <div className={styles.header}>
        <div className={styles.headIco}><FaComments /></div>
        <div style={{ flex: 1 }}>
          <h1>Foro de la comunidad</h1>
          <p>Preguntá, compartí proveedores y ayudá a otros revendedores. Todos aparecen con su apodo.</p>
        </div>
        {puedePublicar && estado === 'ok' && (
          <button type="button" className="btn btn-primary" onClick={() => setNuevo(true)}><FiPlus /> Nuevo tema</button>
        )}
      </div>

      <div className={styles.cats}>
        <button type="button" className={`${styles.cat} ${!cat ? styles.catOn : ''}`} onClick={() => setCat('')}>Todos</button>
        {CATEGORIAS_FORO.map(c => (
          <button type="button" key={c.id} className={`${styles.cat} ${cat === c.id ? styles.catOn : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
        ))}
      </div>

      {!puedePublicar && <p className={styles.aviso}><FiLock /> Podés leer el foro. Para publicar y responder, activá tu acceso completo.</p>}

      {estado === 'cargando' && <p className={styles.vazio}>Cargando temas…</p>}
      {estado === 'cerrado' && <p className={styles.vazio}>El foro se está habilitando. Volvé en unos minutos.</p>}
      {estado === 'ok' && !lista.length && (
        <div className={styles.vazio}>
          <FiMessageCircle size={28} />
          <p>Todavía no hay temas{cat ? ' en esta categoría' : ''}. {puedePublicar ? '¡Abrí el primero!' : ''}</p>
        </div>
      )}

      <div className={styles.lista}>
        {lista.map((t, k) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k, 10) * .04 }}>
            <Link href={`/dashboard/foro/${t.id}`} className={`${styles.tema} cardFx`}>
              <Avatar valor={t.avatar} clave={t.uid} size={42} />
              <div className={styles.temaCorpo}>
                <div className={styles.meta}>
                  <span className={styles.tag}>{labelCategoriaForo(t.categoria)}</span>
                  <b>{t.apodo}</b> · {haceCuanto(t.createdAt)}
                </div>
                <strong>{t.titulo}</strong>
                <p>{t.texto}</p>
              </div>
              <div className={styles.numeros}>
                <span><FiMessageCircle /> {t.respuestas || 0}</span>
                <span><FiHeart /> {t.likes?.length || 0}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {nuevo && (
          <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNuevo(false)}>
            <motion.div className={styles.modal} initial={{ y: 30, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <button type="button" className={styles.fechar} onClick={() => setNuevo(false)} aria-label="Cerrar"><FiX /></button>
              <h2>Nuevo tema</h2>
              <p className={styles.comoApodo}>Vas a publicar como <b>{apodoDe(userData)}</b></p>
              <label>Categoría</label>
              <select value={catNuevo} onChange={e => setCatNuevo(e.target.value)}>
                {CATEGORIAS_FORO.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <label>Título</label>
              <input value={titulo} maxLength={LIMITE_TITULO} onChange={e => setTitulo(e.target.value)} placeholder="Ej.: ¿Alguien compró jeans en Goiânia?" />
              <label>Mensaje</label>
              <textarea rows={6} value={texto} maxLength={LIMITE_TEXTO} onChange={e => setTexto(e.target.value)} placeholder="Contá tu duda o experiencia…" />
              <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} disabled={enviando} onClick={publicar}>
                <FiSend /> {enviando ? 'Publicando…' : 'Publicar'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
