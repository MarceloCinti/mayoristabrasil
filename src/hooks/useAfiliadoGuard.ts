import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export function useAfiliadoGuard() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    if (userData?.archivado && !userData?.esAdmin) { router.push('/cuenta-suspendida'); return; }
    if (userData?.esAfiliado || userData?.esAdmin) {
      setAuthorized(true);
    } else {
      router.push('/dashboard');
    }
  }, [user, userData, loading, router]);

  return { authorized, loading };
}
