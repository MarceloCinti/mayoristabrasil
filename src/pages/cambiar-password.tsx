import Head from 'next/head';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import styles from './auth.module.css';

export default function CambiarPassword() {
  const router = useRouter();
  const { user, loading, refreshUserData } = useAuth();
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [user, loading, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pass.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (pass !== pass2) { toast.error('Las contraseñas no coinciden'); return; }
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updatePassword(auth.currentUser, pass);
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { mustChangePassword: false });
      await refreshUserData();
      toast.success('Contraseña actualizada');
      router.replace('/continuar');
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        toast.error('Por seguridad, volvé a iniciar sesión y reintentá');
        router.replace('/login');
      } else {
        toast.error('Error al cambiar la contraseña');
      }
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <>
      <Head><title>Crear nueva contraseña — Mayorista Brasil</title></Head>
      <div className={styles.page}>
        <div className={styles.box}>
          <h1 className={styles.title}>Creá tu nueva contraseña</h1>
          <p className={styles.sub}>Por seguridad, definí una contraseña nueva para tu cuenta.</p>
          <form onSubmit={submit} className={styles.form}>
            <input type="password" placeholder="Nueva contraseña" value={pass} onChange={e => setPass(e.target.value)} required />
            <input type="password" placeholder="Repetir contraseña" value={pass2} onChange={e => setPass2(e.target.value)} required />
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%' }}>
              {saving ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
