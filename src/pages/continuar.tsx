import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';

// Página puente: decide a dónde mandar al usuario después de iniciar sesión / registrarse
export default function Continuar() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (!userData) return; // espera a que cargue
    if (userData.esAdmin) { router.replace('/dashboard'); return; }
    if (userData.archivado) { router.replace('/cuenta-suspendida'); return; }
    if (userData.mustChangePassword) { router.replace('/cambiar-password'); return; }
    if (!userData.perfilCompleto) { router.replace('/completar-perfil'); return; }
    if (userData.pago) { router.replace('/dashboard'); return; }
    // Afiliado sin guía comprada → su panel de afiliado
    if (userData.esAfiliado) { router.replace('/afiliado'); return; }
    // Recién registrado (o prueba agotada) → entra al panel igual.
    // Si ya gastó la prueba, el propio panel le muestra el popup de pago
    // encima del contenido desenfocado (ver usePagoGuard + PaywallModal).
    router.replace('/dashboard');
  }, [user, userData, loading, router]);

  return (
    <>
      <Head><title>Cargando… — Mayorista Brasil</title></Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mut)' }}>
        Cargando…
      </div>
    </>
  );
}
