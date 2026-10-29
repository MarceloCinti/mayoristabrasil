import Head from 'next/head';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiSave, FiAlertCircle } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { DatosPago, DEFAULT_PAGO, PAGO_DOC, mergePago, TRIAL_LIMITE } from '@/lib/trial';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

export default function AdminPago() {
  const { isAdmin, loading } = useAdminGuard();
  const [cfg, setCfg] = useState<DatosPago>(DEFAULT_PAGO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, PAGO_DOC.col, PAGO_DOC.id));
        if (snap.exists()) setCfg(mergePago(snap.data() as Partial<DatosPago>));
      } catch (err) {
        console.error(err);
      }
      setCargando(false);
    })();
  }, [isAdmin]);

  const set = <K extends keyof DatosPago>(k: K, v: DatosPago[K]) =>
    setCfg(prev => ({ ...prev, [k]: v }));

  const guardar = async () => {
    setGuardando(true);
    try {
      await setDoc(
        doc(db, PAGO_DOC.col, PAGO_DOC.id),
        { ...cfg, actualizadoEn: serverTimestamp() },
        { merge: true }
      );
      toast.success('Datos de pago guardados');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    }
    setGuardando(false);
  };

  if (loading || !isAdmin) return null;

  const faltanDatos = !cfg.banco && !cfg.cuenta && !cfg.alias;

  return (
    <AdminLayout>
      <Head><title>Datos de pago — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Datos de pago</h2>
        <button onClick={guardar} disabled={guardando} className="btn btn-primary">
          <FiSave /> {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {faltanDatos && !cargando && (
        <div
          className={styles.section}
          style={{ borderLeft: '3px solid var(--oro)', display: 'flex', gap: 12, alignItems: 'flex-start' }}
        >
          <FiAlertCircle style={{ color: 'var(--oro)', fontSize: 20, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <strong>Todavía no cargaste los datos de transferencia.</strong><br />
            <span style={{ color: 'var(--text-mut)' }}>
              Hasta que los cargues, el popup de pago le muestra al cliente un botón para
              pedirlos por WhatsApp — no queda vacío, pero perdés ventas por la fricción.
            </span>
          </div>
        </div>
      )}

      {cargando ? (
        <p style={{ color: 'var(--text-mut)', textAlign: 'center', padding: 40 }}>Cargando…</p>
      ) : (
        <>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Transferencia bancaria</h3>
            <p style={{ color: 'var(--text-mut)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Estos datos aparecen en el popup de pago, cada uno con botón de copiar.
              Dejá vacío lo que no uses: los campos vacíos no se muestran.
            </p>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Banco / Billetera</label>
                <input value={cfg.banco} onChange={e => set('banco', e.target.value)} placeholder="Ej: Ueno Bank, Tigo Money" />
              </div>
              <div className={styles.formField}>
                <label>Titular de la cuenta</label>
                <input value={cfg.titular} onChange={e => set('titular', e.target.value)} placeholder="Nombre completo" />
              </div>
              <div className={styles.formField}>
                <label>CI del titular</label>
                <input value={cfg.ci} onChange={e => set('ci', e.target.value)} placeholder="Ej: 1.234.567" />
              </div>
              <div className={styles.formField}>
                <label>N° de cuenta</label>
                <input value={cfg.cuenta} onChange={e => set('cuenta', e.target.value)} placeholder="Número de cuenta" />
              </div>
              <div className={styles.formField}>
                <label>Alias (opcional)</label>
                <input value={cfg.alias} onChange={e => set('alias', e.target.value)} placeholder="Alias o teléfono de la billetera" />
              </div>
              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label>Nota para el cliente (opcional)</label>
                <textarea
                  rows={2}
                  value={cfg.nota}
                  onChange={e => set('nota', e.target.value)}
                  placeholder="Ej: Enviá el comprobante por WhatsApp para acelerar la liberación."
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Tarjeta de crédito (Hotmart)</h3>
            <p style={{ color: 'var(--text-mut)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Mientras esté desactivado, el popup muestra «Próximamente» en la pestaña de tarjeta.
              Activalo recién cuando tengas el link de pago de Hotmart funcionando.
            </p>
            <div className={styles.formGrid}>
              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label>Link de pago de Hotmart</label>
                <input
                  value={cfg.hotmartUrl}
                  onChange={e => set('hotmartUrl', e.target.value)}
                  placeholder="https://pay.hotmart.com/..."
                />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={cfg.hotmartActivo}
                onChange={e => set('hotmartActivo', e.target.checked)}
                style={{ width: 'auto' }}
              />
              Activar pago con tarjeta
            </label>
            {cfg.hotmartActivo && !cfg.hotmartUrl && (
              <p style={{ color: 'var(--oro)', fontSize: 12.5, marginTop: 10 }}>
                Falta el link: con la casilla marcada pero sin URL, el popup sigue mostrando «Próximamente».
              </p>
            )}
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Cómo funciona el acceso de prueba</h3>
            <ul style={{ color: 'var(--text-mut)', fontSize: 13.5, lineHeight: 1.8, paddingLeft: 18 }}>
              <li>Al registrarse, la persona entra al panel con acceso completo.</li>
              <li>Tiene <strong>{TRIAL_LIMITE} clics</strong>: cada link del menú y cada tarjeta de proveedor que abre cuenta uno.</li>
              <li>En el quinto clic el contenido se desenfoca y aparece el popup de pago.</li>
              <li>Si avisa que transfirió, aparece acá en <strong>Usuarios</strong> con el aviso, y vos liberás el acceso.</li>
              <li>Con tarjeta (Hotmart) el acceso tendría que liberarse solo — eso requiere conectar el webhook de Hotmart, que todavía no está hecho.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={guardar} disabled={guardando} className="btn btn-primary">
              <FiSave /> {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
