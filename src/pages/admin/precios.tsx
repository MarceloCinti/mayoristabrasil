import Head from 'next/head';
import { useEffect, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiSave, FiExternalLink, FiInfo } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { PRECIO_DOC, PrecioConfig, PRECIO_PADRAO, carregarPrecio, sufijoPeriodo } from '@/lib/precio';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

const fmt = (n: number) => 'Gs. ' + Math.round(n || 0).toLocaleString('es-PY');
const soDigitos = (s: string) => Number(s.replace(/\D/g, '')) || 0;

export default function AdminPrecios() {
  const { isAdmin, loading } = useAdminGuard();
  const [p, setP] = useState<PrecioConfig>(PRECIO_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    carregarPrecio(true).then(x => { setP(x); setCarregando(false); });
  }, [isAdmin]);

  const salvar = async () => {
    if (p.precioGs <= 0) { toast.error('El precio tiene que ser mayor que cero'); return; }
    setSalvando(true);
    try {
      await setDoc(doc(db, PRECIO_DOC.col, PRECIO_DOC.id), { ...p, actualizadoEn: serverTimestamp() });
      await carregarPrecio(true);
      toast.success('Precio actualizado en todo el sitio');
    } catch (e) { console.error(e); toast.error('Error al guardar'); }
    setSalvando(false);
  };

  if (loading || !isAdmin) return null;
  const per = sufijoPeriodo(p.periodo || 'mes');
  const desconto = p.precioNormalGs > p.precioGs ? Math.round((1 - p.precioGs / p.precioNormalGs) * 100) : 0;

  return (
    <AdminLayout>
      <Head><title>Precificación — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Precificación</h2>
        <div className={styles.actions}>
          <a href="/#precio" target="_blank" rel="noreferrer" className="btn btn-secondary"><FiExternalLink /> Ver en la landing</a>
          <button onClick={salvar} disabled={salvando || carregando} className="btn btn-primary"><FiSave /> {salvando ? 'Guardando…' : 'Guardar precio'}</button>
        </div>
      </div>

      {carregando ? <p style={{ color: 'var(--text-mut)', padding: 40, textAlign: 'center' }}>Cargando…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Valor de venta del acceso</h3>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Precio de venta (Gs.)</label>
                <input inputMode="numeric" value={p.precioGs ? p.precioGs.toLocaleString('es-PY') : ''} onChange={e => setP({ ...p, precioGs: soDigitos(e.target.value) })} />
              </div>
              <div className={styles.formField}>
                <label>Precio «normal» tachado (Gs., 0 = no mostrar)</label>
                <input inputMode="numeric" value={p.precioNormalGs ? p.precioNormalGs.toLocaleString('es-PY') : '0'} onChange={e => setP({ ...p, precioNormalGs: soDigitos(e.target.value) })} />
              </div>
              <div className={styles.formField}>
                <label>Período</label>
                <select value={p.periodo} onChange={e => setP({ ...p, periodo: e.target.value })}>
                  <option value="mes">Por mes</option>
                  <option value="año">Por año</option>
                  <option value="pago único">Pago único</option>
                </select>
              </div>
            </div>
            <p style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text-mut)', marginTop: 16, lineHeight: 1.5 }}>
              <FiInfo style={{ flexShrink: 0, marginTop: 3 }} />
              <span>
                Cambia el precio en la landing, en la página de compra, en el popup de pago y en lo que se registra como monto pagado (base de la comisión de afiliados).
                <b> El cobro con tarjeta lo define la Hotmart:</b> si cambiás el precio acá, cambialo también en la Hotmart para que coincida.
              </span>
            </p>
          </div>

          <div className={styles.section} style={{ textAlign: 'center' }}>
            <h3 className={styles.sectionTitle}>Así lo ve el cliente</h3>
            {p.precioNormalGs > p.precioGs && (
              <div style={{ color: 'var(--text-mut)', textDecoration: 'line-through', fontSize: 15 }}>{fmt(p.precioNormalGs)}{per}</div>
            )}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, color: 'var(--brand)', lineHeight: 1.1 }}>
              {fmt(p.precioGs)}<span style={{ fontSize: 15, color: 'var(--text-mut)', fontWeight: 500, marginLeft: 6 }}>{per}</span>
            </div>
            {desconto > 0 && <span className={styles.badge} style={{ background: 'var(--amarelo-tint)', color: 'var(--amarelo-osc)', marginTop: 10 }}>{desconto}% de descuento</span>}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
