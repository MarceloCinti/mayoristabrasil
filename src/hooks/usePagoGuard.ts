import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { trialAgotado } from '@/lib/trial';

/**
 * Protege el contenido pago.
 *
 * Cambio importante: cuando se agota la prueba ya NO redirigimos a /comprar.
 * El usuario se queda en la página y encima aparece el popup de pago con el
 * fondo desenfocado — por eso devolvemos `bloqueado` en vez de navegar.
 */
export function usePagoGuard() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (userData?.archivado && !userData?.esAdmin) { router.push('/cuenta-suspendida'); return; }
    if (userData) setAuthorized(true);
  }, [user, userData, loading, router]);

  // Pagó, es admin, o todavía le queda prueba → ve todo.
  // Si no, la página se renderiza igual pero con el paywall encima.
  const bloqueado = !!userData && !userData.pago && !userData.esAdmin && trialAgotado(userData);

  return { authorized, loading, bloqueado };
}
