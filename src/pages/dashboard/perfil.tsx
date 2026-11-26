import Head from 'next/head';
import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiSave, FiShield, FiUser } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { apodoDe, sugerirApodo, validarApodo } from '@/lib/nickname';
import { avatarDe } from '@/lib/avatar';
import Avatar from '@/components/Avatar';
import AvatarSelector from '@/components/AvatarSelector';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './perfil.module.css';

export default function Perfil() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const [apodo, setApodo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [giro, setGiro] = useState(0);
  const [avatar, setAvatar] = useState('');

  useEffect(() => {
    if (userData) { setApodo(apodoDe(userData)); setAvatar(avatarDe(userData.avatar, userData.uid)); }
  }, [userData]);

  if (loading || !user || !userData) return null;

  const erro = apodo.trim() === (userData.nickname || '') ? null : validarApodo(apodo, userData.nombre);
  const mudou = apodo.trim() !== (userData.nickname || '') || avatar !== (userData.avatar || '');

  const sugerir = () => {
    setGiro(g => g + 1);
    setApodo(sugerirApodo(userData.nombre, `${user.uid}-${Date.now()}`));
  };

  const salvar = async () => {
    const e = apodo.trim() === (userData.nickname || '') ? null : validarApodo(apodo, userData.nombre);
    if (e) { toast.error(e); return; }
    setSalvando(true);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), { nickname: apodo.trim(), avatar });
      await refreshUserData();
      toast.success('Perfil actualizado');
    } catch (err) { console.error(err); toast.error('No se pudo guardar'); }
    setSalvando(false);
  };

  return (
    <DashboardLayout>
      <Head><title>Mi apodo y avatar — Mayorista Brasil</title></Head>

      <div className={styles.wrap}>
        <div className={styles.card}>
          <Avatar valor={avatar} clave={user.uid} size={72} className={styles.avatar} />
          <h1>Tu apodo y avatar</h1>
          <p className={styles.sub}>
            Es como te ven los demás miembros en los comentarios y en el foro.
            Así nadie sabe quién sos.
          </p>

          <label className={styles.label} htmlFor="apodo">Apodo</label>
          <div className={styles.fila}>
            <input id="apodo" value={apodo} maxLength={20} onChange={e => setApodo(e.target.value.replace(/\s/g, ''))} />
            <button type="button" className={styles.sugerir} onClick={sugerir} title="Sugerir otro">
              <FiRefreshCw style={{ transform: `rotate(${giro * 360}deg)`, transition: 'transform .5s' }} /> Sugerir otro
            </button>
          </div>
          {erro && <p className={styles.erro}>{erro}</p>}
          <p className={styles.dica}>Las sugerencias mezclan una palabra en guaraní con tu apellido. Podés escribir el que quieras, sin tu nombre ni apellido.</p>

          <div className={styles.label} style={{ marginTop: 22 }}>Avatar</div>
          <AvatarSelector valor={avatar} clave={user.uid} onChange={setAvatar} />

          <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 18 }} disabled={!mudou || !!erro || salvando} onClick={salvar}>
            <FiSave /> {salvando ? 'Guardando…' : 'Guardar cambios'}
          </button>

          <div className={styles.privado}>
            <FiShield />
            <div>
              <strong>Tus datos siguen privados</strong>
              <span><FiUser /> {userData.nombre} · {userData.email}</span>
              <small>Solo el equipo de Mayorista Brasil ve tu nombre: lo usamos para atenderte, en mensajes y pedidos de cambio.</small>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
