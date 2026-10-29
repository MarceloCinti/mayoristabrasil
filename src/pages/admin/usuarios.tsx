import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import toast from 'react-hot-toast';
import { FiArchive, FiTrash2, FiKey, FiRotateCcw, FiFilter, FiStar, FiX, FiShield } from 'react-icons/fi';
import { db, auth, PRECIO_GS } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { DEPARTAMENTOS, CIUDADES, GENEROS, calcularEdad } from '@/lib/paraguay';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

interface Usuario {
  uid: string;
  email: string;
  nombre: string;
  pago: boolean;
  fechaCompra?: any;
  createdAt?: any;
  esAdmin?: boolean;
  whatsapp?: string;
  departamento?: string;
  ciudad?: string;
  comercio?: string;
  profesion?: string;
  fechaNacimiento?: string;
  genero?: string;
  archivado?: boolean;
  esAfiliado?: boolean;
  codigoAfiliado?: string | null;
  referidoPor?: string | null;
  tipoPlan?: 'unico' | 'mensual';
  vip?: boolean;
  suscripcionVence?: string;
  // Avisó que transfirió (desde el popup de pago) — falta que vos confirmes
  pagoPendiente?: boolean;
  pagoMetodo?: 'transferencia' | 'hotmart';
  pagoSolicitadoEn?: any;
  // Secciones consumidas del acceso de prueba
  trialVistas?: string[];
}

const fmtDate = (ts: any) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
};
const toDate = (ts: any): Date | null => (ts?.toDate ? ts.toDate() : null);

export default function AdminUsuarios() {
  const { isAdmin, loading: guardLoading } = useAdminGuard();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltros, setShowFiltros] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<'todos' | 'aviso' | 'pendientes' | 'pagados' | 'archivados'>('todos');
  const [fDepto, setFDepto] = useState('');
  const [fCiudad, setFCiudad] = useState('');
  const [fGenero, setFGenero] = useState('');
  const [fAfiliado, setFAfiliado] = useState('');
  const [edadMin, setEdadMin] = useState('');
  const [edadMax, setEdadMax] = useState('');
  const [ingresoDesde, setIngresoDesde] = useState('');
  const [ingresoHasta, setIngresoHasta] = useState('');
  const [pagoDesde, setPagoDesde] = useState('');
  const [pagoHasta, setPagoHasta] = useState('');

  const fetchUsuarios = async () => {
    try {
      const q = query(collection(db, 'usuarios'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsuarios(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Usuario)));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchUsuarios(); }, [isAdmin]);

  const afiliados = useMemo(() => usuarios.filter(u => u.esAfiliado && u.codigoAfiliado), [usuarios]);
  const nombrePorCodigo = useMemo(() => {
    const m: Record<string, string> = {};
    afiliados.forEach(a => { if (a.codigoAfiliado) m[a.codigoAfiliado] = a.nombre; });
    return m;
  }, [afiliados]);

  const togglePago = async (u: Usuario) => {
    const nuevo = !u.pago;
    try {
      await updateDoc(doc(db, 'usuarios', u.uid), {
        pago: nuevo, fechaCompra: nuevo ? serverTimestamp() : null, montoPagado: nuevo ? PRECIO_GS : 0,
        // al liberar, el aviso de transferencia deja de estar pendiente
        pagoPendiente: false,
      });
      toast.success(nuevo ? 'Acceso liberado' : 'Acceso revocado');
      fetchUsuarios();
    } catch { toast.error('Error al actualizar'); }
  };

  const toggleArchivo = async (u: Usuario) => {
    const nuevo = !u.archivado;
    if (nuevo && !confirm(`¿Archivar a ${u.nombre}? Perderá el acceso y verá la pantalla de soporte.`)) return;
    try {
      await updateDoc(doc(db, 'usuarios', u.uid), { archivado: nuevo });
      toast.success(nuevo ? 'Usuario archivado' : 'Usuario reactivado');
      fetchUsuarios();
    } catch { toast.error('Error al archivar'); }
  };

  const eliminar = async (u: Usuario) => {
    if (!confirm(`¿Eliminar a ${u.nombre}? Esta acción borra sus datos y no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'usuarios', u.uid));
      toast.success('Usuario eliminado');
      fetchUsuarios();
    } catch { toast.error('Error al eliminar'); }
  };

  // Modal de plan/VIP
  const [planTarget, setPlanTarget] = useState<Usuario | null>(null);
  const [planTipo, setPlanTipo] = useState<'unico' | 'mensual'>('unico');
  const [planVip, setPlanVip] = useState(false);
  const [planVence, setPlanVence] = useState('');

  const abrirPlan = (u: Usuario) => {
    setPlanTarget(u);
    setPlanTipo(u.tipoPlan || 'unico');
    setPlanVip(!!u.vip);
    setPlanVence(u.suscripcionVence || '');
  };
  const guardarPlan = async () => {
    if (!planTarget) return;
    try {
      await updateDoc(doc(db, 'usuarios', planTarget.uid), {
        tipoPlan: planTipo,
        vip: planVip,
        suscripcionVence: planTipo === 'mensual' ? planVence : '',
      });
      toast.success('Plan actualizado');
      setPlanTarget(null);
      fetchUsuarios();
    } catch { toast.error('Error al guardar el plan'); }
  };

  const toggleAdmin = async (u: Usuario) => {
    const nuevo = !u.esAdmin;
    if (!confirm(`¿${nuevo ? 'Dar permisos de ADMIN a' : 'Quitar permisos de admin a'} ${u.nombre}? El admin puede ver y modificar todo el sistema.`)) return;
    try {
      await updateDoc(doc(db, 'usuarios', u.uid), { esAdmin: nuevo });
      toast.success(nuevo ? 'Ahora es admin' : 'Permisos de admin removidos');
      fetchUsuarios();
    } catch { toast.error('Error'); }
  };

  const resetPass = async (u: Usuario) => {
    if (!u.email) { toast.error('Sin correo'); return; }
    if (!confirm(`Enviar email de reseteo de contraseña a ${u.email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, u.email);
      toast.success('Email de reseteo enviado');
    } catch { toast.error('Error al enviar (¿la cuenta usa Google?)'); }
  };

  const limpiarFiltros = () => {
    setBusqueda(''); setEstado('todos'); setFDepto(''); setFCiudad(''); setFGenero('');
    setFAfiliado(''); setEdadMin(''); setEdadMax(''); setIngresoDesde(''); setIngresoHasta('');
    setPagoDesde(''); setPagoHasta('');
  };

  const filtrados = usuarios.filter(u => {
    // Estado
    if (estado === 'aviso' && (!u.pagoPendiente || u.pago)) return false;
    if (estado === 'pagados' && !u.pago) return false;
    if (estado === 'pendientes' && (u.pago || u.esAdmin || u.archivado)) return false;
    if (estado === 'archivados' && !u.archivado) return false;
    if (estado !== 'archivados' && u.archivado) return false; // por defecto ocultar archivados
    // Búsqueda
    if (busqueda) {
      const t = busqueda.toLowerCase();
      if (!((u.email || '').toLowerCase().includes(t) || (u.nombre || '').toLowerCase().includes(t) || (u.whatsapp || '').includes(t))) return false;
    }
    if (fDepto && u.departamento !== fDepto) return false;
    if (fCiudad && u.ciudad !== fCiudad) return false;
    if (fGenero && u.genero !== fGenero) return false;
    if (fAfiliado && u.referidoPor !== fAfiliado) return false;
    // Edad
    const edad = calcularEdad(u.fechaNacimiento);
    if (edadMin && (edad === null || edad < Number(edadMin))) return false;
    if (edadMax && (edad === null || edad > Number(edadMax))) return false;
    // Fecha ingreso
    const ci = toDate(u.createdAt);
    if (ingresoDesde && (!ci || ci < new Date(ingresoDesde))) return false;
    if (ingresoHasta && (!ci || ci > new Date(ingresoHasta + 'T23:59:59'))) return false;
    // Fecha pago
    const cp = toDate(u.fechaCompra);
    if (pagoDesde && (!cp || cp < new Date(pagoDesde))) return false;
    if (pagoHasta && (!cp || cp > new Date(pagoHasta + 'T23:59:59'))) return false;
    return true;
  });

  if (guardLoading || !isAdmin) return null;

  return (
    <AdminLayout>
      <Head><title>Usuarios — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Usuarios ({filtrados.length})</h2>
        <div className={styles.actions}>
          <button onClick={() => setShowFiltros(s => !s)} className="btn btn-secondary"><FiFilter /> Filtros</button>
          <button onClick={limpiarFiltros} className="btn btn-secondary"><FiRotateCcw /> Limpiar</button>
        </div>
      </div>

      <div className={styles.section}>
        <div style={{ display: 'flex', gap: 12, marginBottom: showFiltros ? 16 : 0, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Buscar por correo, nombre o WhatsApp..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ flex: 1, minWidth: 240 }} />
          <select value={estado} onChange={e => setEstado(e.target.value as any)} style={{ width: 180 }}>
            <option value="todos">Todos (activos)</option>
            <option value="aviso">Avisaron que transfirieron</option>
            <option value="pendientes">Pendientes de pago</option>
            <option value="pagados">Pagados</option>
            <option value="archivados">Archivados</option>
          </select>
        </div>

        {showFiltros && (
          <div className={styles.formGrid} style={{ marginBottom: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div className={styles.formField}>
              <label>Departamento</label>
              <select value={fDepto} onChange={e => { setFDepto(e.target.value); setFCiudad(''); }}>
                <option value="">Todos</option>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className={styles.formField}>
              <label>Ciudad</label>
              <select value={fCiudad} onChange={e => setFCiudad(e.target.value)} disabled={!fDepto}>
                <option value="">Todas</option>
                {(fDepto ? (CIUDADES[fDepto] || []) : []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.formField}>
              <label>Género</label>
              <select value={fGenero} onChange={e => setFGenero(e.target.value)}>
                <option value="">Todos</option>
                {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className={styles.formField}>
              <label>Referido por (afiliado)</label>
              <select value={fAfiliado} onChange={e => setFAfiliado(e.target.value)}>
                <option value="">Todos</option>
                {afiliados.map(a => <option key={a.codigoAfiliado} value={a.codigoAfiliado!}>{a.nombre} ({a.codigoAfiliado})</option>)}
              </select>
            </div>
            <div className={styles.formField}>
              <label>Edad (min – max)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" min={0} placeholder="min" value={edadMin} onChange={e => setEdadMin(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <input type="number" min={0} placeholder="max" value={edadMax} onChange={e => setEdadMax(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              </div>
            </div>
            <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
              <label>Fecha de ingreso (desde – hasta)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={ingresoDesde} onChange={e => setIngresoDesde(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <input type="date" value={ingresoHasta} onChange={e => setIngresoHasta(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              </div>
            </div>
            <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
              <label>Fecha de pago (desde – hasta)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={pagoDesde} onChange={e => setPagoDesde(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                <input type="date" value={pagoHasta} onChange={e => setPagoHasta(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 40 }}>Cargando...</p>
        ) : filtrados.length === 0 ? (
          <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 40 }}>Sin resultados</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>WhatsApp</th>
                  <th>Ubicación</th>
                  <th>Género / Edad</th>
                  <th>Rubro</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(u => {
                  const wpp = u.whatsapp ? u.whatsapp.replace(/\D/g, '') : '';
                  const edad = calcularEdad(u.fechaNacimiento);
                  return (
                  <tr key={u.uid}>
                    <td>
                      {u.nombre}
                      {u.comercio ? <span style={{ display: 'block', fontSize: 11, color: 'var(--text-mut)' }}>{u.comercio}</span> : null}
                      {u.referidoPor ? <span style={{ display: 'block', fontSize: 10, color: 'var(--cyan)' }}>ref: {nombrePorCodigo[u.referidoPor] || u.referidoPor}</span> : null}
                    </td>
                    <td style={{ wordBreak: 'break-all' }}>{u.email}</td>
                    <td>{wpp ? <a href={`https://wa.me/${wpp}`} target="_blank" rel="noreferrer" style={{ color: 'var(--wpp)' }}>{u.whatsapp}</a> : '—'}</td>
                    <td>{u.departamento ? <>{u.ciudad || '—'}<span style={{ display: 'block', fontSize: 11, color: 'var(--text-mut)' }}>{u.departamento}</span></> : '—'}</td>
                    <td>{u.genero || '—'}{edad !== null ? <span style={{ display: 'block', fontSize: 11, color: 'var(--text-mut)' }}>{edad} años</span> : null}</td>
                    <td>{u.profesion || '—'}</td>
                    <td>{fmtDate(u.createdAt)}{u.pago ? <span style={{ display: 'block', fontSize: 10, color: 'var(--verde)' }}>pagó {fmtDate(u.fechaCompra)}</span> : null}</td>
                    <td>
                      {u.esAdmin ? <span className={`${styles.badge} ${styles.badgeAdmin}`}>Admin</span>
                        : u.archivado ? <span className={`${styles.badge}`} style={{ background: 'rgba(245,181,68,.15)', color: 'var(--oro)' }}>Archivado</span>
                        : u.pago ? <span className={`${styles.badge} ${styles.badgePagado}`}>Pagado</span>
                        : <span className={`${styles.badge} ${styles.badgePendiente}`}>Pendiente</span>}
                      {u.vip && <span className={`${styles.badge}`} style={{ background: 'rgba(34,211,238,.15)', color: 'var(--cyan)', marginLeft: 4 }}>VIP</span>}
                      {u.pagoPendiente && !u.pago && (
                        <span className={styles.badge} style={{ background: 'rgba(242,196,12,.2)', color: 'var(--oro)', marginLeft: 4 }} title="Avisó que transfirió — falta confirmar el comprobante">
                          Avisó transferencia
                        </span>
                      )}
                      {u.tipoPlan === 'mensual' && <span style={{ display: 'block', fontSize: 10, color: 'var(--text-mut)', marginTop: 3 }}>Mensual{u.suscripcionVence ? ` · vence ${u.suscripcionVence}` : ''}</span>}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {!u.esAdmin && (
                          <button onClick={() => togglePago(u)} className={`${styles.btnSm} ${u.pago ? styles.btnSmDanger : ''}`} title={u.pago ? 'Revocar acceso' : 'Liberar acceso'}>
                            {u.pago ? 'Revocar' : 'Liberar'}
                          </button>
                        )}
                        <button onClick={() => toggleAdmin(u)} className={`${styles.btnSm} ${styles.btnSmGhost}`} title={u.esAdmin ? 'Quitar admin' : 'Hacer admin'} style={u.esAdmin ? { color: 'var(--oro)' } : undefined}>
                          <FiShield />
                        </button>
                        {!u.esAdmin && (
                          <>
                            <button onClick={() => abrirPlan(u)} className={`${styles.btnSm} ${styles.btnSmGhost}`} title="Plan / VIP">
                              <FiStar />
                            </button>
                            <button onClick={() => toggleArchivo(u)} className={`${styles.btnSm} ${styles.btnSmGhost}`} title={u.archivado ? 'Reactivar' : 'Archivar'}>
                              <FiArchive />
                            </button>
                            <button onClick={() => resetPass(u)} className={`${styles.btnSm} ${styles.btnSmGhost}`} title="Enviar reseteo de contraseña">
                              <FiKey />
                            </button>
                            <button onClick={() => eliminar(u)} className={`${styles.btnSm} ${styles.btnSmDanger}`} title="Eliminar">
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {planTarget && (
        <div className={styles.modalOverlay} onClick={() => setPlanTarget(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className={styles.modalHead}>
              <h3>Plan de {planTarget.nombre}</h3>
              <button onClick={() => setPlanTarget(null)}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formField}>
                <label>Tipo de plan</label>
                <select value={planTipo} onChange={e => setPlanTipo(e.target.value as any)}>
                  <option value="unico">Pago único</option>
                  <option value="mensual">Suscripción mensual</option>
                </select>
              </div>
              {planTipo === 'mensual' && (
                <div className={styles.formField} style={{ marginTop: 12 }}>
                  <label>Vence el (próxima renovación)</label>
                  <input type="date" value={planVence} onChange={e => setPlanVence(e.target.value)} />
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 14 }}>
                <input type="checkbox" checked={planVip} onChange={e => setPlanVip(e.target.checked)} style={{ width: 'auto' }} />
                Marcar como VIP
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setPlanTarget(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={guardarPlan} className="btn btn-primary" style={{ flex: 1 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
