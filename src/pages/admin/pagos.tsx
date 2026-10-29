import Head from 'next/head';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiCheck, FiClock, FiCreditCard, FiUsers, FiTrash2 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { fmtGs } from '@/lib/afiliados';
import { enviarReciboComision } from '@/lib/email';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import MediaUpload from '@/components/admin/MediaUpload';
import styles from './admin.module.css';

interface Solicitud {
  id: string;
  numero?: string;
  afiliadoUid: string;
  afiliadoNombre: string;
  afiliadoEmail: string;
  codigoAfiliado: string;
  monto: number;
  cantidadReferidos?: number;
  banco: string;
  nombreCompleto: string;
  ci: string;
  nroCuenta: string;
  estado: 'pendiente' | 'pagado';
  createdAt?: any;
  pagadoEn?: any;
  comprobanteUrl?: string;
}

export default function AdminPagos() {
  const { isAdmin, loading } = useAdminGuard();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filtro, setFiltro] = useState<'pendiente' | 'pagado' | 'todos'>('pendiente');

  const fetchData = async () => {
    try {
      const q = query(collection(db, 'solicitudesPago'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Solicitud)));
    } catch (err) { console.error(err); }
    setLoadingData(false);
  };

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const marcarPagado = async (s: Solicitud) => {
    if (!confirm(`¿Marcar como pagada la solicitud de ${s.afiliadoNombre} por ${fmtGs(s.monto)}?`)) return;
    try {
      // Marca la solicitud como pagada
      await updateDoc(doc(db, 'solicitudesPago', s.id), { estado: 'pagado', pagadoEn: serverTimestamp() });
      // Liquida las comisiones pendientes de ese afiliado
      const refsSnap = await getDocs(query(collection(db, 'usuarios'), where('referidoPor', '==', s.codigoAfiliado)));
      const batch = writeBatch(db);
      let n = 0;
      refsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.pago && !data.comisionLiquidada) { batch.update(d.ref, { comisionLiquidada: true }); n++; }
      });
      if (n > 0) await batch.commit();
      // Envía el recibo por email al afiliado
      const recibo = await enviarReciboComision({
        to_email: s.afiliadoEmail,
        afiliado_nombre: s.afiliadoNombre,
        monto: fmtGs(s.monto),
        cantidad_referidos: String(s.cantidadReferidos ?? n),
        fecha: new Date().toLocaleDateString('es-PY'),
        banco: s.banco,
        nro_cuenta: s.nroCuenta,
        recibo_id: s.numero || s.id.slice(0, 8).toUpperCase(),
      });
      if (recibo.ok) toast.success('Pago registrado y recibo enviado por email');
      else toast.success('Pago registrado (configurá EmailJS para enviar el recibo)');
      fetchData();
    } catch (err) { console.error(err); toast.error('Error al registrar el pago'); }
  };

  const guardarComprobante = async (s: Solicitud, url: string) => {
    try {
      await updateDoc(doc(db, 'solicitudesPago', s.id), { comprobanteUrl: url });
      setSolicitudes(prev => prev.map(x => x.id === s.id ? { ...x, comprobanteUrl: url } : x));
      toast.success(url ? 'Comprobante guardado' : 'Comprobante quitado');
    } catch { toast.error('Error al guardar el comprobante'); }
  };

  const eliminar = async (s: Solicitud) => {
    if (!confirm(`¿Eliminar la solicitud ${s.numero || s.id.slice(0, 6)} de ${s.afiliadoNombre}? (usá esto para borrar duplicados)`)) return;
    try {
      await deleteDoc(doc(db, 'solicitudesPago', s.id));
      toast.success('Solicitud eliminada');
      fetchData();
    } catch { toast.error('Error al eliminar'); }
  };

  const fmtDate = (ts: any) => ts?.toDate ? ts.toDate().toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const filtradas = solicitudes.filter(s => filtro === 'todos' ? true : s.estado === filtro);
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

  if (loading || !isAdmin) return null;

  return (
    <AdminLayout>
      <Head><title>Pagos a afiliados — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Solicitudes de pago {pendientes > 0 && <span className={styles.pendBadge}>{pendientes} pendientes</span>}</h2>
        <select value={filtro} onChange={e => setFiltro(e.target.value as any)} style={{ width: 180 }}>
          <option value="pendiente">Pendientes</option>
          <option value="pagado">Pagadas</option>
          <option value="todos">Todas</option>
        </select>
      </div>

      {loadingData ? (
        <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className={styles.section}><p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 30 }}>No hay solicitudes {filtro === 'pendiente' ? 'pendientes' : ''}.</p></div>
      ) : (
        <div className={styles.pagosGrid}>
          {filtradas.map(s => (
            <div key={s.id} className={styles.pagoCard}>
              <div className={styles.pagoHead}>
                <div>
                  <strong>{s.afiliadoNombre}</strong>
                  <span className={styles.pagoEmail}>{s.afiliadoEmail}</span>
                  {s.numero && <span className={styles.pagoNum}>{s.numero}</span>}
                </div>
                {s.estado === 'pendiente'
                  ? <span className={`${styles.badge}`} style={{ background: 'rgba(245,181,68,.15)', color: 'var(--oro)' }}><FiClock style={{ verticalAlign: 'middle' }} /> Pendiente</span>
                  : <span className={`${styles.badge} ${styles.badgePagado}`}>Pagado</span>}
              </div>

              <div className={styles.pagoMonto}>{fmtGs(s.monto)}</div>
              <span className={styles.pagoFecha}>
                Solicitado el {fmtDate(s.createdAt)}
                {s.cantidadReferidos != null && (
                  <span className={styles.pagoRefs}><FiUsers style={{ verticalAlign: 'middle', marginRight: 4 }} />{s.cantidadReferidos} {s.cantidadReferidos === 1 ? 'indicación' : 'indicaciones'}</span>
                )}
              </span>

              <div className={styles.pagoDatos}>
                <div><span>Banco</span><strong><FiCreditCard style={{ verticalAlign: 'middle', marginRight: 5 }} />{s.banco}</strong></div>
                <div><span>Titular</span><strong>{s.nombreCompleto}</strong></div>
                <div><span>CI</span><strong>{s.ci}</strong></div>
                <div><span>Nro de cuenta</span><strong>{s.nroCuenta}</strong></div>
              </div>

              {s.estado === 'pendiente' && (
                <div className={styles.pagoActions}>
                  <button onClick={() => marcarPagado(s)} className="btn btn-primary" style={{ width: '100%' }}>
                    <FiCheck /> Marcar como pagado
                  </button>
                </div>
              )}
              {s.estado === 'pagado' && <span className={styles.pagoOk}>Pagado el {fmtDate(s.pagadoEn)}</span>}

              <div className={styles.comprobanteBox}>
                <MediaUpload
                  label="Comprobante de transferencia"
                  hint="Subí la captura del comprobante. El afiliado lo verá en su panel."
                  accept="image" folder="comprobantes" ratio="4/3"
                  value={s.comprobanteUrl || ''}
                  onChange={(url) => guardarComprobante(s, url)}
                />
              </div>

              <button onClick={() => eliminar(s)} className={styles.pagoDelete}><FiTrash2 /> Eliminar</button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
