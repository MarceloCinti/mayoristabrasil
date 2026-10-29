import Head from 'next/head';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FiFileText, FiExternalLink } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useAfiliadoGuard } from '@/hooks/useAfiliadoGuard';
import { fmtGs } from '@/lib/afiliados';
import AfiliadoLayout from '@/components/AfiliadoLayout';
import styles from './afiliado.module.css';

interface Solicitud {
  id: string; numero?: string; monto: number; estado: 'pendiente' | 'pagado';
  createdAt?: any; pagadoEn?: any; banco?: string; nroCuenta?: string; comprobanteUrl?: string;
}

export default function Cobros() {
  const { authorized, loading } = useAfiliadoGuard();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authorized || !user) { if (authorized) setLoadingData(false); return; }
    (async () => {
      try {
        const sp = await getDocs(query(collection(db, 'solicitudesPago'), where('afiliadoUid', '==', user.uid)));
        const arr = sp.docs.map(d => ({ id: d.id, ...d.data() } as Solicitud))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setSolicitudes(arr);
      } catch (err) { console.error(err); }
      setLoadingData(false);
    })();
  }, [authorized, user]);

  const fmtDate = (ts: any) => ts?.toDate ? ts.toDate().toLocaleDateString('es-PY') : '—';

  if (loading || !authorized) return null;

  return (
    <AfiliadoLayout>
      <Head><title>Mis cobros — Mayorista Brasil</title></Head>
      <h1 className={styles.title}>Mis cobros</h1>
      <p className={styles.subtitle}>Acá ves el estado de tus solicitudes de cobro y los comprobantes de transferencia.</p>

      {loadingData ? (
        <p className={styles.empty}>Cargando…</p>
      ) : solicitudes.length === 0 ? (
        <div className={styles.notice}>Todavía no hiciste ninguna solicitud de cobro. Cuando tengas comisión pendiente, solicitala desde el Panel de afiliado.</div>
      ) : (
        <div className={styles.solicitudesGrid}>
          {solicitudes.map(s => (
            <div key={s.id} className={styles.solCard}>
              <div className={styles.solHead}>
                <span className={styles.solNum}>{s.numero || ('SOL-' + s.id.slice(0, 6).toUpperCase())}</span>
                {s.estado === 'pagado'
                  ? <span className={`${styles.solBadge} ${styles.solPagado}`}>Pagado</span>
                  : <span className={`${styles.solBadge} ${styles.solAnalisis}`}>En análisis</span>}
              </div>
              <div className={styles.solMonto}>{fmtGs(s.monto)}</div>
              <span className={styles.solFecha}>Solicitado el {fmtDate(s.createdAt)}</span>
              {s.estado === 'pagado' && (
                <div className={styles.solPagoInfo}>
                  <span>Pagado el {fmtDate(s.pagadoEn)}</span>
                  {s.comprobanteUrl
                    ? <a href={s.comprobanteUrl} target="_blank" rel="noreferrer" className={styles.verComprobante}><FiFileText /> Ver comprobante <FiExternalLink size={12} /></a>
                    : <span className={styles.sinComprobante}>Comprobante aún no disponible</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AfiliadoLayout>
  );
}
