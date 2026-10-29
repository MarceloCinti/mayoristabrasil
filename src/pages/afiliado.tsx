import Head from 'next/head';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FaWhatsapp, FaCopy } from 'react-icons/fa';
import { FiUsers, FiCheckCircle, FiDollarSign, FiClock, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useAfiliadoGuard } from '@/hooks/useAfiliadoGuard';
import { calcularComision, fmtGs, COMISION_DEFAULT } from '@/lib/afiliados';
import { BANCOS, CuentaBancaria } from '@/lib/bancos';
import AfiliadoLayout from '@/components/AfiliadoLayout';
import styles from './afiliado.module.css';

interface Referido {
  uid: string; nombre: string; email: string; pago: boolean;
  fechaCompra?: any; createdAt?: any; montoPagado?: number; comisionLiquidada?: boolean;
}

interface Solicitud {
  id: string; numero?: string; monto: number; estado: 'pendiente' | 'pagado'; createdAt?: any;
}

const genNumero = () => 'SOL-' + Math.random().toString(36).slice(2, 8).toUpperCase();

export default function PanelAfiliado() {
  const { authorized, loading } = useAfiliadoGuard();
  const { user, userData, refreshUserData } = useAuth();
  const [referidos, setReferidos] = useState<Referido[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [solicitudPendiente, setSolicitudPendiente] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  const codigo = userData?.codigoAfiliado || '';
  const porcentaje = userData?.comisionPorcentaje ?? COMISION_DEFAULT;
  const link = typeof window !== 'undefined' && codigo ? `${window.location.origin}/?ref=${codigo}` : '';

  const fetchSolicitudes = async (uid: string) => {
    const sp = await getDocs(query(collection(db, 'solicitudesPago'), where('afiliadoUid', '==', uid)));
    const arr = sp.docs
      .map(d => ({ id: d.id, ...d.data() } as Solicitud))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setSolicitudes(arr);
    setSolicitudPendiente(arr.some(s => s.estado === 'pendiente'));
  };

  useEffect(() => {
    if (!authorized || !codigo) { if (authorized) setLoadingData(false); return; }
    (async () => {
      try {
        const q = query(collection(db, 'usuarios'), where('referidoPor', '==', codigo));
        const snap = await getDocs(q);
        setReferidos(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Referido)));
        if (user) await fetchSolicitudes(user.uid);
      } catch (err) { console.error(err); }
      setLoadingData(false);
    })();
  }, [authorized, codigo]);

  const copy = () => { navigator.clipboard.writeText(link); toast.success('Link copiado'); };

  const pagados = referidos.filter(r => r.pago);
  const comisionGanada = pagados.reduce((a, r) => a + calcularComision(r.montoPagado, porcentaje), 0);
  const comisionPendiente = pagados.filter(r => !r.comisionLiquidada).reduce((a, r) => a + calcularComision(r.montoPagado, porcentaje), 0);

  const maskEmail = (e: string) => { if (!e) return '—'; const [u, d] = e.split('@'); return d ? `${u.slice(0, 2)}***@${d}` : e; };
  const fmtDate = (ts: any) => ts?.toDate ? ts.toDate().toLocaleDateString('es-PY') : '—';

  if (loading || !authorized) return null;

  return (
    <AfiliadoLayout>
      <Head><title>Panel de Afiliado — Mayorista Brasil</title></Head>

      <h1 className={styles.title}>Panel de Afiliado</h1>
      <p className={styles.subtitle}>Compartí tu link, sumá referidos y ganá {porcentaje}% por cada venta confirmada.</p>

      {!codigo ? (
        <div className={styles.notice}>Tu cuenta de afiliado todavía no tiene un código asignado. Escribinos por WhatsApp para activarlo.</div>
      ) : (
        <>
          <div className={styles.linkCard}>
            <span className={styles.linkLabel}>Tu link de referido</span>
            <div className={styles.linkRow}>
              <input readOnly value={link} className={styles.linkInput} />
              <button onClick={copy} className="btn btn-primary"><FaCopy /> Copiar</button>
            </div>
            <a href={`https://wa.me/?text=${encodeURIComponent('Mirá esta plataforma para comprar directo del Brás y revender en Paraguay 👉 ' + link)}`} target="_blank" rel="noreferrer" className={styles.shareWpp}>
              <FaWhatsapp /> Compartir por WhatsApp
            </a>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}><FiUsers className={styles.statIcon} /><div><span>Referidos totales</span><strong>{referidos.length}</strong></div></div>
            <div className={styles.statCard}><FiCheckCircle className={styles.statIcon} style={{ color: 'var(--verde)' }} /><div><span>Compras confirmadas</span><strong>{pagados.length}</strong></div></div>
            <div className={styles.statCard}><FiDollarSign className={styles.statIcon} style={{ color: 'var(--cyan)' }} /><div><span>Comisión ganada</span><strong>{fmtGs(comisionGanada)}</strong></div></div>
            <div className={`${styles.statCard} ${styles.statPend}`}>
              <FiClock className={styles.statIcon} style={{ color: 'var(--oro)' }} />
              <div style={{ flex: 1 }}>
                <span>Pendiente de cobro</span>
                <strong className={styles.pend}>{fmtGs(comisionPendiente)}</strong>
                {solicitudPendiente && <span className={styles.enProceso}>Solicitud en proceso</span>}
              </div>
              <button onClick={() => setShowPopup(true)} className={styles.cobrarBtn} disabled={comisionPendiente <= 0 || solicitudPendiente}>
                {solicitudPendiente ? 'En proceso' : 'Solicitar cobro'}
              </button>
            </div>
          </div>

          <div className={styles.tableCard}>
            <h2>Tus referidos</h2>
            {loadingData ? (
              <p className={styles.empty}>Cargando…</p>
            ) : referidos.length === 0 ? (
              <p className={styles.empty}>Todavía no tenés referidos. Compartí tu link para empezar.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                  <thead><tr><th>Registrado</th><th>Correo</th><th>Estado</th><th>Tu comisión</th><th>Cobro</th></tr></thead>
                  <tbody>
                    {referidos.map(r => {
                      const com = calcularComision(r.montoPagado, porcentaje);
                      return (
                        <tr key={r.uid}>
                          <td>{fmtDate(r.createdAt)}</td>
                          <td>{maskEmail(r.email)}</td>
                          <td>{r.pago ? <span className={`${styles.badge} ${styles.badgePagado}`}>Pagó</span> : <span className={`${styles.badge} ${styles.badgePend}`}>Registrado</span>}</td>
                          <td>{r.pago ? fmtGs(com) : '—'}</td>
                          <td>{!r.pago ? '—' : r.comisionLiquidada ? <span className={styles.cobrado}>Cobrado</span> : <span className={styles.porCobrar}>Por cobrar</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showPopup && (
        <CobroPopup
          montoPendiente={comisionPendiente}
          cuentas={userData?.cuentasBancarias || []}
          onClose={() => setShowPopup(false)}
          onSaveCuentas={async (cuentas) => {
            if (!user) return;
            await updateDoc(doc(db, 'usuarios', user.uid), { cuentasBancarias: cuentas });
            await refreshUserData();
          }}
          onSolicitar={async (cuenta) => {
            if (!user || !userData) return;
            // Verifica que no exista ya una solicitud pendiente
            const ya = await getDocs(query(collection(db, 'solicitudesPago'), where('afiliadoUid', '==', user.uid), where('estado', '==', 'pendiente')));
            if (ya.size > 0) {
              toast.error('Ya tenés una solicitud de cobro en proceso');
              setSolicitudPendiente(true);
              setShowPopup(false);
              return;
            }
            await addDoc(collection(db, 'solicitudesPago'), {
              numero: genNumero(),
              afiliadoUid: user.uid,
              afiliadoNombre: userData.nombre,
              afiliadoEmail: userData.email,
              codigoAfiliado: codigo,
              monto: comisionPendiente,
              cantidadReferidos: pagados.filter(r => !r.comisionLiquidada).length,
              banco: cuenta.banco,
              nombreCompleto: cuenta.nombreCompleto,
              ci: cuenta.ci,
              nroCuenta: cuenta.nroCuenta,
              estado: 'pendiente',
              createdAt: serverTimestamp(),
            });
            toast.success('Solicitud de cobro enviada');
            setShowPopup(false);
            await fetchSolicitudes(user.uid);
          }}
        />
      )}
    </AfiliadoLayout>
  );
}

function CobroPopup({ montoPendiente, cuentas, onClose, onSaveCuentas, onSolicitar }: {
  montoPendiente: number;
  cuentas: CuentaBancaria[];
  onClose: () => void;
  onSaveCuentas: (c: CuentaBancaria[]) => Promise<void>;
  onSolicitar: (c: CuentaBancaria) => Promise<void>;
}) {
  const [lista, setLista] = useState<CuentaBancaria[]>(cuentas);
  const [sel, setSel] = useState(0);
  const [adding, setAdding] = useState(cuentas.length === 0);
  const [banco, setBanco] = useState<string>(BANCOS[0]);
  const [nombreCompleto, setNombre] = useState('');
  const [ci, setCi] = useState('');
  const [nroCuenta, setNro] = useState('');
  const [busy, setBusy] = useState(false);

  const agregar = async () => {
    if (!nombreCompleto.trim() || !ci.trim() || !nroCuenta.trim()) { toast.error('Completá todos los datos de la cuenta'); return; }
    if (lista.length >= 2) { toast.error('Máximo 2 cuentas'); return; }
    const nueva = { banco, nombreCompleto: nombreCompleto.trim(), ci: ci.trim(), nroCuenta: nroCuenta.trim() };
    const nuevaLista = [...lista, nueva];
    setBusy(true);
    try {
      await onSaveCuentas(nuevaLista);
      setLista(nuevaLista);
      setSel(nuevaLista.length - 1);
      setAdding(false);
      setNombre(''); setCi(''); setNro(''); setBanco(BANCOS[0]);
      toast.success('Cuenta agregada');
    } catch { toast.error('Error al guardar la cuenta'); }
    setBusy(false);
  };

  const quitar = async (i: number) => {
    const nuevaLista = lista.filter((_, k) => k !== i);
    setBusy(true);
    try { await onSaveCuentas(nuevaLista); setLista(nuevaLista); setSel(0); if (nuevaLista.length === 0) setAdding(true); }
    catch { toast.error('Error'); }
    setBusy(false);
  };

  const solicitar = async () => {
    if (lista.length === 0) { toast.error('Agregá una cuenta bancaria'); return; }
    setBusy(true);
    try { await onSolicitar(lista[sel]); } catch { toast.error('Error al solicitar'); setBusy(false); }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h3>Solicitar cobro</h3>
          <button onClick={onClose}><FiX /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.montoBox}>
            <span>Monto a cobrar</span>
            <strong>{fmtGs(montoPendiente)}</strong>
          </div>

          <h4 className={styles.cuentasTitle}>Tus cuentas bancarias</h4>
          {lista.length === 0 && <p className={styles.cuentasEmpty}>Todavía no registraste ninguna cuenta.</p>}

          {lista.map((c, i) => (
            <label key={i} className={`${styles.cuentaItem} ${sel === i ? styles.cuentaSel : ''}`}>
              <input type="radio" name="cuenta" checked={sel === i} onChange={() => setSel(i)} />
              <div className={styles.cuentaInfo}>
                <strong>{c.banco}</strong>
                <span>{c.nombreCompleto} · CI {c.ci}</span>
                <span>Cuenta: {c.nroCuenta}</span>
              </div>
              <button type="button" className={styles.cuentaDel} onClick={() => quitar(i)} disabled={busy}><FiTrash2 /></button>
            </label>
          ))}

          {adding ? (
            <div className={styles.addForm}>
              <label>Banco / Billetera</label>
              <select value={banco} onChange={e => setBanco(e.target.value)}>
                {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <label>Nombre completo del titular</label>
              <input value={nombreCompleto} onChange={e => setNombre(e.target.value)} placeholder="Como figura en la cuenta" />
              <label>Cédula (CI)</label>
              <input value={ci} onChange={e => setCi(e.target.value)} placeholder="Ej: 1.234.567" />
              <label>Número de cuenta</label>
              <input value={nroCuenta} onChange={e => setNro(e.target.value)} placeholder="Nro de cuenta o alias" />
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {lista.length > 0 && <button type="button" className="btn btn-secondary" onClick={() => setAdding(false)}>Cancelar</button>}
                <button type="button" className="btn btn-primary" onClick={agregar} disabled={busy} style={{ flex: 1 }}>Guardar cuenta</button>
              </div>
            </div>
          ) : (
            lista.length < 2 && (
              <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}><FiPlus /> Agregar otra cuenta</button>
            )
          )}
        </div>
        <div className={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn btn-primary" onClick={solicitar} disabled={busy || lista.length === 0} style={{ flex: 1 }}>
            Solicitar transferencia
          </button>
        </div>
      </div>
    </div>
  );
}
