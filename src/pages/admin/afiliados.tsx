import Head from 'next/head';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, writeBatch, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiUserPlus, FiCheck, FiX, FiCopy, FiRefreshCw } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { generarCodigo, calcularComision, fmtGs, COMISION_DEFAULT } from '@/lib/afiliados';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

interface U {
  uid: string;
  email: string;
  nombre: string;
  pago?: boolean;
  esAfiliado?: boolean;
  codigoAfiliado?: string | null;
  comisionPorcentaje?: number;
  referidoPor?: string | null;
  montoPagado?: number;
  comisionLiquidada?: boolean;
}

interface SolicitudAfil {
  id: string; uid: string; nombre: string; email: string; whatsapp?: string; estado: string; createdAt?: any;
}

export default function AdminAfiliados() {
  const { isAdmin, loading } = useAdminGuard();
  const [users, setUsers] = useState<U[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [email, setEmail] = useState('');
  const [pct, setPct] = useState(COMISION_DEFAULT);
  const [solicitudes, setSolicitudes] = useState<SolicitudAfil[]>([]);

  const fetchAll = async () => {
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as U)));
      const solSnap = await getDocs(query(collection(db, 'solicitudesAfiliado'), where('estado', '==', 'pendiente')));
      setSolicitudes(solSnap.docs.map(d => ({ id: d.id, ...d.data() } as SolicitudAfil))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (err) { console.error(err); }
    setLoadingData(false);
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  const aprobar = async (sol: SolicitudAfil) => {
    if (!confirm(`¿Aprobar a ${sol.nombre} como afiliado?`)) return;
    const codigo = generarCodigo();
    try {
      await updateDoc(doc(db, 'usuarios', sol.uid), {
        esAfiliado: true, codigoAfiliado: codigo, comisionPorcentaje: COMISION_DEFAULT, afiliadoDesde: serverTimestamp(),
      });
      await updateDoc(doc(db, 'solicitudesAfiliado', sol.id), { estado: 'aprobado', aprobadoEn: serverTimestamp() });
      // Email al afiliado
      fetch('/api/enviar-masivo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ email: sol.email, nombre: sol.nombre }],
          asunto: '¡Tu cuenta de afiliado fue activada! 🎉',
          mensaje: 'Ya podés ingresar a tu panel de afiliado y empezar a ganar comisiones.\n\nEntrá a la plataforma, copiá tu link de referido y compartilo. ¡Éxitos!',
        }),
      }).catch(() => {});
      toast.success('Afiliado aprobado y notificado por email');
      fetchAll();
    } catch { toast.error('Error al aprobar'); }
  };

  const rechazar = async (sol: SolicitudAfil) => {
    if (!confirm(`¿Rechazar la solicitud de ${sol.nombre}?`)) return;
    try {
      await updateDoc(doc(db, 'solicitudesAfiliado', sol.id), { estado: 'rechazado' });
      toast.success('Solicitud rechazada');
      fetchAll();
    } catch { toast.error('Error'); }
  };

  const afiliados = users.filter(u => u.esAfiliado);

  const referidosDe = (codigo?: string | null) => codigo ? users.filter(u => u.referidoPor === codigo) : [];

  const convertir = async () => {
    const e = email.trim().toLowerCase();
    if (!e) { toast.error('Ingresá un correo'); return; }
    const target = users.find(u => (u.email || '').toLowerCase() === e);
    if (!target) { toast.error('No existe un usuario con ese correo (debe registrarse primero)'); return; }
    if (target.esAfiliado) { toast.error('Ese usuario ya es afiliado'); return; }
    const codigo = generarCodigo();
    try {
      await updateDoc(doc(db, 'usuarios', target.uid), {
        esAfiliado: true,
        codigoAfiliado: codigo,
        comisionPorcentaje: Number(pct) || COMISION_DEFAULT,
      });
      toast.success(`Afiliado creado: ${codigo}`);
      setEmail('');
      fetchAll();
    } catch { toast.error('Error al crear afiliado'); }
  };

  const cambiarPct = async (u: U, nuevo: number) => {
    try {
      await updateDoc(doc(db, 'usuarios', u.uid), { comisionPorcentaje: nuevo });
      setUsers(prev => prev.map(x => x.uid === u.uid ? { ...x, comisionPorcentaje: nuevo } : x));
    } catch { toast.error('Error'); }
  };

  const regenerar = async (u: U) => {
    if (!confirm('¿Generar un código nuevo? Los links que ya hayas compartido con el código viejo dejarán de sumar referidos.')) return;
    const codigo = generarCodigo();
    try {
      await updateDoc(doc(db, 'usuarios', u.uid), { codigoAfiliado: codigo });
      toast.success(`Código nuevo: ${codigo}`);
      fetchAll();
    } catch { toast.error('Error al regenerar'); }
  };

  const quitar = async (u: U) => {
    if (!confirm(`¿Quitar a ${u.nombre} como afiliado?`)) return;
    try {
      await updateDoc(doc(db, 'usuarios', u.uid), { esAfiliado: false });
      toast.success('Afiliado removido');
      fetchAll();
    } catch { toast.error('Error'); }
  };

  const liquidar = async (u: U) => {
    const refs = referidosDe(u.codigoAfiliado).filter(r => r.pago && !r.comisionLiquidada);
    if (refs.length === 0) { toast('No hay comisiones pendientes'); return; }
    if (!confirm(`Marcar ${refs.length} comisión(es) como pagadas a ${u.nombre}?`)) return;
    try {
      const batch = writeBatch(db);
      refs.forEach(r => batch.update(doc(db, 'usuarios', r.uid), { comisionLiquidada: true }));
      await batch.commit();
      toast.success('Comisiones marcadas como pagadas');
      fetchAll();
    } catch { toast.error('Error al liquidar'); }
  };

  if (loading || !isAdmin) return null;

  return (
    <AdminLayout>
      <Head><title>Afiliados — Admin</title></Head>
      <div className={styles.toolbar}><h2>Afiliados ({afiliados.length})</h2></div>

      {/* SOLICITUDES DE AFILIACIÓN */}
      {solicitudes.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Solicitudes pendientes ({solicitudes.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {solicitudes.map(s => {
              const wpp = (s.whatsapp || '').replace(/\D/g, '');
              return (
                <div key={s.id} className={styles.afilCard} style={{ borderLeft: '3px solid var(--verde)' }}>
                  <div className={styles.afilHead}>
                    <div>
                      <strong>{s.nombre} <span className={styles.nuevoTag}>NUEVO</span></strong>
                      <span className={styles.afilEmail}>{s.email}{wpp ? ` · WhatsApp: ${s.whatsapp}` : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <button onClick={() => aprobar(s)} className={styles.btnSm}><FiCheck /> Aprobar</button>
                    <button onClick={() => rechazar(s)} className={`${styles.btnSm} ${styles.btnSmDanger}`}><FiX /> Rechazar</button>
                    {wpp && <a href={`https://wa.me/${wpp}`} target="_blank" rel="noreferrer" className={`${styles.btnSm} ${styles.btnSmGhost}`}>WhatsApp</a>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREAR AFILIADO */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Convertir usuario en afiliado</h3>
        <p style={{ color: 'var(--text-mut)', fontSize: 13, marginBottom: 14 }}>El usuario debe haberse registrado antes. Buscalo por su correo.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className={styles.formField} style={{ flex: 1, minWidth: 220 }}>
            <label>Correo del usuario</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="persona@gmail.com" />
          </div>
          <div className={styles.formField} style={{ width: 140 }}>
            <label>Comisión %</label>
            <input type="number" min={1} max={90} value={pct} onChange={e => setPct(Number(e.target.value))} />
          </div>
          <button onClick={convertir} className="btn btn-primary"><FiUserPlus /> Crear afiliado</button>
        </div>
      </div>

      {/* LISTA */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Afiliados activos</h3>
        {loadingData ? (
          <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 30 }}>Cargando…</p>
        ) : afiliados.length === 0 ? (
          <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 30 }}>Todavía no hay afiliados.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {afiliados.map(a => {
              const refs = referidosDe(a.codigoAfiliado);
              const pagados = refs.filter(r => r.pago);
              const pct = a.comisionPorcentaje ?? COMISION_DEFAULT;
              const pendiente = pagados.filter(r => !r.comisionLiquidada).reduce((s, r) => s + calcularComision(r.montoPagado, pct), 0);
              const total = pagados.reduce((s, r) => s + calcularComision(r.montoPagado, pct), 0);
              return (
                <div key={a.uid} className={styles.afilCard}>
                  <div className={styles.afilHead}>
                    <div>
                      <strong>{a.nombre}</strong>
                      <span className={styles.afilEmail}>{a.email}</span>
                    </div>
                    <button onClick={() => quitar(a)} className={styles.afilRemove}><FiX /> Quitar</button>
                  </div>
                  <div className={styles.afilCode}>
                    <span>Código: <b>{a.codigoAfiliado}</b></span>
                    <button onClick={() => { navigator.clipboard.writeText(`${location.origin}/?ref=${a.codigoAfiliado}`); toast.success('Link copiado'); }}><FiCopy /> Copiar link</button>
                    <button onClick={() => regenerar(a)}><FiRefreshCw /> Regenerar</button>
                  </div>
                  <div className={styles.afilStats}>
                    <div><span>Referidos</span><strong>{refs.length}</strong></div>
                    <div><span>Pagaron</span><strong>{pagados.length}</strong></div>
                    <div><span>Comisión</span>
                      <strong style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input type="number" min={1} max={90} defaultValue={pct} onBlur={e => { const v = Number(e.target.value); if (v && v !== pct) cambiarPct(a, v); }} style={{ width: 56, padding: '4px 8px' }} />%
                      </strong>
                    </div>
                    <div><span>Total generado</span><strong>{fmtGs(total)}</strong></div>
                    <div><span>Por pagarle</span><strong className={styles.pend}>{fmtGs(pendiente)}</strong></div>
                  </div>
                  {pendiente > 0 && (
                    <button onClick={() => liquidar(a)} className={`${styles.btnSm}`} style={{ marginTop: 12 }}>
                      <FiCheck /> Marcar comisiones como pagadas
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
