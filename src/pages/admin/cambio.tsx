import Head from 'next/head';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiSave, FiCheck, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { db } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

const fmtGs = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');

interface Solicitud {
  id: string; nombre: string; email: string; whatsapp?: string;
  montoReais: number; montoGs: number; tasaCliente: number; metodoPago: string;
  destinoNombre: string; destinoTipo: string; destinoDato: string; destinoBanco?: string;
  estado: 'pendiente' | 'completado'; createdAt?: any;
}

export default function AdminCambio() {
  const { isAdmin, loading } = useAdminGuard();
  const [margen, setMargen] = useState('0');
  const [comision, setComision] = useState('0');
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [filtro, setFiltro] = useState<'pendiente' | 'completado' | 'todos'>('pendiente');

  const fetchSol = async () => {
    const snap = await getDocs(query(collection(db, 'solicitudesCambio'), orderBy('createdAt', 'desc')));
    setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Solicitud)));
  };

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const cfg = await getDoc(doc(db, 'config', 'cambio'));
        if (cfg.exists()) { const d = cfg.data(); setMargen(String(d.margenPorcentaje ?? 0)); setComision(String(d.comisionFija ?? 0)); }
        const r = await fetch('https://open.er-api.com/v6/latest/BRL'); const d = await r.json();
        if (d?.rates?.PYG) setLiveRate(d.rates.PYG);
        await fetchSol();
      } catch (err) { console.error(err); }
    })();
  }, [isAdmin]);

  const guardarConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'cambio'), { margenPorcentaje: Number(margen) || 0, comisionFija: Number(comision) || 0, actualizadoEn: serverTimestamp() }, { merge: true });
      toast.success('Configuración guardada');
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const marcarCompletado = async (s: Solicitud) => {
    if (!confirm(`¿Marcar como completado el cambio de ${s.nombre}?`)) return;
    await updateDoc(doc(db, 'solicitudesCambio', s.id), { estado: 'completado', completadoEn: serverTimestamp() });
    toast.success('Cambio completado'); fetchSol();
  };
  const eliminar = async (s: Solicitud) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    await deleteDoc(doc(db, 'solicitudesCambio', s.id)); fetchSol();
  };

  if (loading || !isAdmin) return null;

  const tasaCliente = liveRate ? liveRate * (1 + (Number(margen) || 0) / 100) : 0;
  const fmtDate = (ts: any) => ts?.toDate ? ts.toDate().toLocaleDateString('es-PY') : '—';
  const filtradas = solicitudes.filter(s => filtro === 'todos' ? true : s.estado === filtro);
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

  return (
    <AdminLayout>
      <Head><title>Cambio — Admin</title></Head>
      <div className={styles.toolbar}><h2>Servicio de Cambio {pendientes > 0 && <span className={styles.pendBadge}>{pendientes} pendientes</span>}</h2></div>

      {/* Config */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Configuración de la tasa</h3>
        <div className={styles.cambioCfgRate}>
          <FiRefreshCw /> Cotización del día: <strong>{liveRate ? fmtGs(liveRate) : '—'}</strong> por R$ 1
          {tasaCliente > 0 && <> · Tasa al cliente: <strong style={{ color: 'var(--verde)' }}>{fmtGs(tasaCliente)}</strong></>}
        </div>
        <div className={styles.formGrid} style={{ marginTop: 14 }}>
          <div className={styles.formField}>
            <label>Margen sobre la cotización (%)</label>
            <input type="number" step="0.1" value={margen} onChange={e => setMargen(e.target.value)} placeholder="Ej: 8" />
            <span style={{ fontSize: 12, color: 'var(--text-mut)', marginTop: 4 }}>Positivo = ganás más (cliente paga más Gs). Negativo = promoción.</span>
          </div>
          <div className={styles.formField}>
            <label>Comisión fija (Gs)</label>
            <input type="number" value={comision} onChange={e => setComision(e.target.value)} placeholder="Ej: 20000" />
            <span style={{ fontSize: 12, color: 'var(--text-mut)', marginTop: 4 }}>Se suma al total del cliente.</span>
          </div>
        </div>
        <button onClick={guardarConfig} disabled={saving} className="btn btn-primary" style={{ marginTop: 16 }}><FiSave /> {saving ? 'Guardando…' : 'Guardar configuración'}</button>
      </div>

      {/* Solicitudes */}
      <div className={styles.toolbar} style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18 }}>Solicitudes de cambio</h2>
        <select value={filtro} onChange={e => setFiltro(e.target.value as any)} style={{ width: 170 }}>
          <option value="pendiente">Pendientes</option><option value="completado">Completadas</option><option value="todos">Todas</option>
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className={styles.section}><p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 24 }}>No hay solicitudes {filtro === 'pendiente' ? 'pendientes' : ''}.</p></div>
      ) : (
        <div className={styles.pagosGrid}>
          {filtradas.map(s => {
            const wpp = (s.whatsapp || '').replace(/\D/g, '');
            return (
              <div key={s.id} className={styles.pagoCard}>
                <div className={styles.pagoHead}>
                  <div><strong>{s.nombre}</strong><span className={styles.pagoEmail}>{s.email}</span></div>
                  {s.estado === 'completado'
                    ? <span className={`${styles.badge} ${styles.badgePagado}`}>Completado</span>
                    : <span className={styles.badge} style={{ background: 'rgba(245,181,68,.15)', color: 'var(--oro)' }}>Pendiente</span>}
                </div>
                <div className={styles.cambioMonto}>
                  <div><span>Quiere</span><strong>R$ {s.montoReais}</strong></div>
                  <div><span>Paga</span><strong style={{ color: 'var(--verde)' }}>{fmtGs(s.montoGs)}</strong></div>
                </div>
                <span className={styles.pagoFecha}>{fmtDate(s.createdAt)} · Tasa {fmtGs(s.tasaCliente)} · Pago: {s.metodoPago}</span>
                <div className={styles.pagoDatos}>
                  <div><span>Titular (BR)</span><strong>{s.destinoNombre}</strong></div>
                  <div><span>{s.destinoTipo}</span><strong>{s.destinoDato}</strong></div>
                  {s.destinoBanco && <div><span>Banco</span><strong>{s.destinoBanco}</strong></div>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {wpp && <a href={`https://wa.me/${wpp}`} target="_blank" rel="noreferrer" className={`${styles.btnSm} ${styles.btnSmGhost}`}><FaWhatsapp /> WhatsApp</a>}
                  {s.estado === 'pendiente' && <button onClick={() => marcarCompletado(s)} className={styles.btnSm}><FiCheck /> Completar</button>}
                  <button onClick={() => eliminar(s)} className={`${styles.btnSm} ${styles.btnSmDanger}`}><FiTrash2 /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
