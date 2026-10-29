import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { FaGoogle } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import styles from './auth.module.css';

export default function Registro() {
  const router = useRouter();
  const { user, register, loginGoogle } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push('/continuar');
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, nombre);
      toast.success('Cuenta creada');
      router.push('/continuar');
    } catch (err: any) {
      const msg = err?.code === 'auth/email-already-in-use'
        ? 'Este correo ya está registrado'
        : 'Error al crear la cuenta';
      toast.error(msg);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginGoogle();
      router.push('/continuar');
    } catch {
      toast.error('Error con Google');
    }
    setLoading(false);
  };

  return (
    <>
      <Head><title>Crear cuenta — Mayorista Brasil</title></Head>
      <div className={styles.page}>
        <div className={styles.box}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoBr}>Mayorista</span>
            <span className={styles.logoPy}>Brasil</span>
          </Link>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.sub}>Empiece su acceso a la guía completa</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input type="text" placeholder="Su nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
            <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Contraseña (mínimo 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>

          <div className={styles.divider}><span>o</span></div>

          <button onClick={handleGoogle} disabled={loading} className="btn btn-secondary" style={{ width: '100%' }}>
            <FaGoogle /> Continuar con Google
          </button>

          <p className={styles.footer}>
            ¿Ya tiene cuenta? <Link href="/login">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </>
  );
}
