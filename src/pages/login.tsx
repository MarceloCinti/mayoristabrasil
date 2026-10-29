import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { FaGoogle } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import styles from './auth.module.css';

export default function Login() {
  const router = useRouter();
  const { user, loginEmail, loginGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push('/continuar');
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginEmail(email, password);
      toast.success('Bienvenido');
      router.push('/continuar');
    } catch (err: any) {
      toast.error('Credenciales incorrectas');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginGoogle();
      router.push('/continuar');
    } catch {
      toast.error('Error al iniciar sesión con Google');
    }
    setLoading(false);
  };

  return (
    <>
      <Head><title>Iniciar sesión — Mayorista Brasil</title></Head>
      <div className={styles.page}>
        <div className={styles.box}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoBr}>Mayorista</span>
            <span className={styles.logoPy}>Brasil</span>
          </Link>
          <h1 className={styles.title}>Iniciar sesión</h1>
          <p className={styles.sub}>Acceda a su guía completa</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className={styles.divider}><span>o</span></div>

          <button onClick={handleGoogle} disabled={loading} className="btn btn-secondary" style={{ width: '100%' }}>
            <FaGoogle /> Continuar con Google
          </button>

          <p className={styles.footer}>
            ¿No tiene cuenta? <Link href="/registro">Crear cuenta</Link>
          </p>
        </div>
      </div>
    </>
  );
}
