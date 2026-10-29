import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, ADMIN_EMAIL } from '@/lib/firebase';

export function useAdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); setLoading(false); return; }

    const check = async () => {
      try {
        const snap = await getDoc(doc(db, 'usuarios', user.uid));
        const data = snap.data();
        if ((snap.exists() && data?.esAdmin) || user.email === ADMIN_EMAIL) {
          setIsAdmin(true);
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      }
      setLoading(false);
    };
    check();
  }, [user, authLoading, router]);

  return { isAdmin, loading };
}
