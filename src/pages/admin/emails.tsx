import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiSend, FiUsers, FiUser, FiGlobe } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { DEPARTAMENTOS, CIUDADES, GENEROS, calcularEdad } from '@/lib/paraguay';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

interface U {
  uid: string; email: string; nombre: string; pago?: boolean; esAdmin?: boolean; archivado?: boolean;
  departamento?: string; ciudad?: string; genero?: string; fechaNacimiento?: string;
  esAfiliado?: boolean; tipoPlan?: string; vip?: boolean;
}

const SEGMENTOS = [
  { id: 'todos', label: 'Todos los usuarios' },
  { id: 'comprados', label: 'Ya compraron' },
  { id: 'no_pagaron', label: 'Registrados sin pagar' },
  { id: 'afiliados', label: 'Solo afiliados' },
  { id: 'mensual', label: 'Suscriptores mensuales' },
  { id: 'vip', label: 'VIP' },
];

export default function AdminEmails() {
  const { isAdmin, loading } = useAdminGuard();
  const [users, setUsers] = useState<U[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [modo, setModo] = useState<'todos' | 'grupo' | 'persona'>('grupo');
  const [segmento, setSegmento] = useState('todos');
  const [fDepto, setFDepto] = useState('');
  const [fCiudad, setFCiudad] = useState('');
  const [fGenero, setFGenero] = useState('');
  const [edadMin, setEdadMin] = useState('');
  const [edadMax, setEdadMax] = useState('');
  const [personaEmail, setPersonaEmail] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as U)));
      } catch (err) { console.error(err); }
      setLoadingData(false);
    })();
  }, [isAdmin]);

  const destinatarios = useMemo(() => {
    if (modo === 'persona') {
      return users.filter(u => u.email === personaEmail && !u.archivado);
    }
    let base = users.filter(u => !u.archivado && u.email);
    if (modo === 'grupo') {
      if (segmento === 'comprados') base = base.filter(u => u.pago);
      else if (segmento === 'no_pagaron') base = base.filter(u => !u.pago && !u.esAdmin);
      else if (segmento === 'afiliados') base = base.filter(u => u.esAfiliado);
      else if (segmento === 'mensual') base = base.filter(u => u.tipoPlan === 'mensual');
      else if (segmento === 'vip') base = base.filter(u => u.vip);
      if (fDepto) base = base.filter(u => u.departamento === fDepto);
      if (fCiudad) base = base.filter(u => u.ciudad === fCiudad);
      if (fGenero) base = base.filter(u => u.genero === fGenero);
      if (edadMin || edadMax) {
        base = base.filter(u => {
          const e = calcularEdad(u.fechaNacimiento);
          if (e === null) return false;
          if (edadMin && e < Number(edadMin)) return false;
          if (edadMax && e > Number(edadMax)) return false;
          return true;
        });
      }
    }
    return base;
  }, [users, modo, segmento, fDepto, fCiudad, fGenero, edadMin, edadMax, personaEmail]);

  const enviar = async () => {
    if (!asunto.trim() || !mensaje.trim()) { toast.error('Completá asunto y mensaje'); return; }
    if (destinatarios.length === 0) { toast.error('No hay destinatarios seleccionados'); return; }
    if (!confirm(`¿Enviar este email a ${destinatarios.length} destinatario(s)?`)) return;
    setEnviando(true);
    try {
      const res = await fetch('/api/enviar-masivo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: destinatarios.map(u => ({ email: u.email, nombre: u.nombre })),
          asunto, mensaje,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.failed && data.sent === 0) {
          // Todo falló: mostramos el motivo real de Brevo
          toast.error(`Falló el envío${data.error ? `: ${data.error}` : ''}`, { duration: 9000 });
        } else {
          toast.success(`Enviados: ${data.sent}${data.failed ? ` · Fallaron: ${data.failed}` : ''}`);
          if (data.failed && data.error) toast(`Motivo de los fallidos: ${data.error}`, { duration: 9000 });
        }
      } else {
        toast.error(data.reason === 'no-config' ? 'Brevo no está configurado' : 'Error al enviar');
      }
    } catch { toast.error('Error al enviar'); }
    setEnviando(false);
  };

  if (loading || !isAdmin) return null;

  return (
    <AdminLayout>
      <Head><title>Emails — Admin</title></Head>
      <div className={styles.toolbar}><h2>Enviar emails</h2></div>

      <div className={styles.emailGrid}>
        {/* Configuración */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>¿A quién enviar?</h3>
          <div className={styles.modoTabs}>
            <button className={`${styles.modoTab} ${modo === 'todos' ? styles.modoActive : ''}`} onClick={() => setModo('todos')}><FiGlobe /> Todos</button>
            <button className={`${styles.modoTab} ${modo === 'grupo' ? styles.modoActive : ''}`} onClick={() => setModo('grupo')}><FiUsers /> Un grupo</button>
            <button className={`${styles.modoTab} ${modo === 'persona' ? styles.modoActive : ''}`} onClick={() => setModo('persona')}><FiUser /> Una persona</button>
          </div>

          {modo === 'grupo' && (
            <div className={styles.formGrid} style={{ marginTop: 16 }}>
              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label>Segmento</label>
                <select value={segmento} onChange={e => setSegmento(e.target.value)}>
                  {SEGMENTOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
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
                <label>Edad (min – max)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" min={0} placeholder="min" value={edadMin} onChange={e => setEdadMin(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                  <input type="number" min={0} placeholder="max" value={edadMax} onChange={e => setEdadMax(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                </div>
              </div>
            </div>
          )}

          {modo === 'persona' && (
            <div className={styles.formField} style={{ marginTop: 16 }}>
              <label>Elegí la persona</label>
              <select value={personaEmail} onChange={e => setPersonaEmail(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {users.filter(u => !u.archivado && u.email).map(u => (
                  <option key={u.uid} value={u.email}>{u.nombre} · {u.email}</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.destBox}>
            <FiUsers /> Destinatarios seleccionados: <strong>{loadingData ? '…' : destinatarios.length}</strong>
          </div>
        </div>

        {/* Mensaje */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Mensaje</h3>
          <div className={styles.formField}>
            <label>Asunto</label>
            <input value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Ej: Nuevos proveedores esta semana 🔥" />
          </div>
          <div className={styles.formField} style={{ marginTop: 12 }}>
            <label>Mensaje</label>
            <textarea rows={10} value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder={'Escribí tu mensaje aquí…\n\nSe agrega automáticamente "Hola {nombre}," arriba y el encabezado de Mayorista Brasil.'} />
          </div>
          <button onClick={enviar} disabled={enviando} className="btn btn-primary" style={{ marginTop: 16, width: '100%' }}>
            <FiSend /> {enviando ? 'Enviando…' : `Enviar a ${destinatarios.length} destinatario(s)`}
          </button>
          <p style={{ color: 'var(--text-mut)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
            Límite gratis de Brevo: 300 emails/día.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
