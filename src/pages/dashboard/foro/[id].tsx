import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs,
  increment, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiHeart, FiSend, FiTrash2, FiLock } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { usePagoGuard } from '@/hooks/usePagoGuard';
import { apodoDe } from '@/lib/nickname';
import { avatarDe } from '@/lib/avatar';
import Avatar from '@/components/Avatar';
import { ForoRespuesta, ForoTema, haceCuanto, labelCategoriaForo, LIMITE_TEXTO } from '@/lib/foro';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './foro.module.css';

const ms = (ts: any) => (ts?.toMillis ? ts.toMillis() : 0);

export default function TemaForo() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const { authorized, loading } = usePagoGuard();
  const { user, userData } = useAuth();
  const [tema, setTema] = useState<ForoTema | null>(null);
  const [resps, setResps] = useState<ForoRespuesta[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'nada'>('cargando');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const puedePublicar = !!userData && (!!userData.pago || !!userData.esAdmin);
  const esAdmin = !!userData?.esAdmin;

  useEffect(() => {
    if (!authorized || !id) return;
    (async () => {
      try {
        const s = await getDoc(doc(db, 'foroTemas', id));
        if (!s.exists()) { setEstado('nada'); return; }
        setTema({ id: s.id, ...s.data() } as ForoTema);
        const r = await getDocs(query(collection(db, 'foroRespuestas'), where('temaId', '==', id)));
        setResps(r.docs.map(d => ({ id: d.id, ...d.data() } as ForoRespuesta)).sort((a, b) => ms(a.createdAt) - ms(b.createdAt)));
        setEstado('ok');
      } catch (e) { console.error(e); setEstado('nada'); }
    })();
  }, [authorized, id]);

  if (loading || !authorized) return null;

  const likeTema = async () => {
    if (!user || !tema || !puedePublicar) return;
    const dio = tema.likes?.includes(user.uid);
    setTema({ ...tema, likes: dio ? (tema.likes || []).filter(x => x !== user.uid) : [...(tema.likes || []), user.uid] });
    try { await updateDoc(doc(db, 'foroTemas', tema.id), { likes: dio ? arrayRemove(user.uid) : arrayUnion(user.uid) }); } catch (e) { console.error(e); }
  };

  const likeResp = async (r: ForoRespuesta) => {
    if (!user || !puedePublicar) return;
    const dio = r.likes?.includes(user.uid);
    setResps(rs => rs.map(x => x.id === r.id ? { ...x, likes: dio ? (x.likes || []).filter(u => u !== user.uid) : [...(x.likes || []), user.uid] } : x));
    try { await updateDoc(doc(db, 'foroRespuestas', r.id), { likes: dio ? arrayRemove(user.uid) : arrayUnion(user.uid) }); } catch (e) { console.error(e); }
  };

  const responder = async () => {
    if (!user || !userData || !tema) return;
    if (texto.trim().length < 2) return;
    setEnviando(true);
    try {
      const nova = { temaId: tema.id, uid: user.uid, apodo: apodoDe(userData), avatar: avatarDe(userData.avatar, user.uid), texto: texto.trim().slice(0, LIMITE_TEXTO), createdAt: serverTimestamp(), likes: [] };
      const ref = await addDoc(collection(db, 'foroRespuestas'), nova);
      setResps(rs => [...rs, { ...nova, id: ref.id, createdAt: { toMillis: () => Date.now() } } as ForoRespuesta]);
      setTexto('');
      try { await updateDoc(doc(db, 'foroTemas', tema.id), { respuestas: increment(1), ultimaEn: serverTimestamp() }); } catch (e) { console.error(e); }
    } catch (e) { console.error(e); toast.error('No se pudo responder'); }
    setEnviando(false);
  };

  const borrarResp = async (r: ForoRespuesta) => {
    if (!confirm('¿Borrar esta respuesta?')) return;
    try {
      await deleteDoc(doc(db, 'foroRespuestas', r.id));
      setResps(rs => rs.filter(x => x.id !== r.id));
      try { await updateDoc(doc(db, 'foroTemas', r.temaId), { respuestas: increment(-1) }); } catch { /* noop */ }
    } catch (e) { console.error(e); toast.error('No se pudo borrar'); }
  };

  const borrarTema = async () => {
    if (!tema || !confirm('¿Borrar este tema y sus respuestas?')) return;
    try {
      await Promise.all(resps.map(r => deleteDoc(doc(db, 'foroRespuestas', r.id)).catch(() => null)));
      await deleteDoc(doc(db, 'foroTemas', tema.id));
      toast.success('Tema borrado');
      router.push('/dashboard/foro');
    } catch (e) { console.error(e); toast.error('No se pudo borrar'); }
  };

  return (
    <DashboardLayout>
      <Head><title>{tema?.titulo ? `${tema.titulo} — Foro` : 'Foro'} — Mayorista Brasil</title></Head>
      <Link href="/dashboard/foro" className={styles.voltar}><FiArrowLeft /> Volver al foro</Link>

      {estado === 'cargando' && <p className={styles.vazio}>Cargando…</p>}
      {estado === 'nada' && <p className={styles.vazio}>Este tema no existe o fue borrado.</p>}

      {tema && estado === 'ok' && (
        <>
          <motion.article className={styles.post} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.meta}>
              <span className={styles.tag}>{labelCategoriaForo(tema.categoria)}</span>
              <Avatar valor={tema.avatar} clave={tema.uid} size={24} />
              <b>{tema.apodo}</b> · {haceCuanto(tema.createdAt)}
            </div>
            <h1 className={styles.postTitulo}>{tema.titulo}</h1>
            <p className={styles.postTexto}>{tema.texto}</p>
            <div className={styles.acoes}>
              <button type="button" className={`${styles.like} ${tema.likes?.includes(user?.uid || '') ? styles.likeOn : ''}`} onClick={likeTema} disabled={!puedePublicar}>
                <FiHeart /> {tema.likes?.length || 0}
              </button>
              {(esAdmin || tema.uid === user?.uid) && (
                <button type="button" className={styles.borrar} onClick={borrarTema}><FiTrash2 /> Borrar tema</button>
              )}
            </div>
          </motion.article>

          <h2 className={styles.respTitulo}>{resps.length} {resps.length === 1 ? 'respuesta' : 'respuestas'}</h2>
          <div className={styles.respostas}>
            {resps.map((r, k) => (
              <motion.div key={r.id} className={styles.resp} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(k, 8) * .04 }}>
                <Avatar valor={r.avatar} clave={r.uid} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.meta}><b>{r.apodo}</b> · {haceCuanto(r.createdAt)}</div>
                  <p className={styles.postTexto}>{r.texto}</p>
                  <div className={styles.acoes}>
                    <button type="button" className={`${styles.like} ${r.likes?.includes(user?.uid || '') ? styles.likeOn : ''}`} onClick={() => likeResp(r)} disabled={!puedePublicar}>
                      <FiHeart /> {r.likes?.length || 0}
                    </button>
                    {(esAdmin || r.uid === user?.uid) && <button type="button" className={styles.borrar} onClick={() => borrarResp(r)}><FiTrash2 /></button>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {puedePublicar ? (
            <div className={styles.responder}>
              <p className={styles.comoApodo}>Respondés como <b>{apodoDe(userData)}</b></p>
              <textarea rows={4} value={texto} maxLength={LIMITE_TEXTO} onChange={e => setTexto(e.target.value)} placeholder="Escribí tu respuesta…" />
              <button type="button" className="btn btn-primary" disabled={enviando || texto.trim().length < 2} onClick={responder}>
                <FiSend /> {enviando ? 'Enviando…' : 'Responder'}
              </button>
            </div>
          ) : (
            <p className={styles.aviso}><FiLock /> Para responder, activá tu acceso completo.</p>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
