import Head from 'next/head';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import styles from './admin.module.css';

const SECCIONES = [
  { id: 'mapa', label: 'Mapa Estratégico de Brás', desc: 'Calles, horarios, zonas seguras, dónde comer y cómo negociar' },
  { id: 'importar', label: 'Datos para la Importación', desc: 'Contactos de transportadoras, redespacho y excursiones' },
  { id: 'tendencias', label: 'Tendencias de la Semana', desc: 'Lo que más vende, modelos virales, productos con mayor margen' },
  { id: 'estafas', label: 'Lista de Estafas', desc: 'Proveedores falsos, Instagram fake, estafas de PIX y de flete' },
];

export default function AdminContenido() {
  const { isAdmin, loading } = useAdminGuard();
  const [activeId, setActiveId] = useState(SECCIONES[0].id);
  const [cuerpo, setCuerpo] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      setLoadingContent(true);
      try {
        const snap = await getDoc(doc(db, 'contenido', activeId));
        setCuerpo(snap.exists() ? snap.data().cuerpo || '' : '');
      } catch (err) { console.error(err); }
      setLoadingContent(false);
    };
    fetch();
  }, [activeId, isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'contenido', activeId), {
        cuerpo,
        actualizadoEn: serverTimestamp(),
      }, { merge: true });
      toast.success('Contenido guardado');
    } catch {
      toast.error('Error al guardar');
    }
    setSaving(false);
  };

  if (loading || !isAdmin) return null;

  const seccionActual = SECCIONES.find(s => s.id === activeId)!;

  return (
    <AdminLayout>
      <Head><title>Contenido — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Editar Contenido</h2>
      </div>

      <div className={styles.section}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {SECCIONES.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              style={{
                padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: activeId === s.id ? 'var(--py-rojo)' : 'var(--bg-elev)',
                color: activeId === s.id ? 'white' : 'var(--text-mut)',
                border: '1px solid var(--border)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{seccionActual.label}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-mut)' }}>{seccionActual.desc}</p>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-mut)', marginBottom: 8, lineHeight: 1.6 }}>
          Acepta HTML básico: <code>&lt;h2&gt;</code>, <code>&lt;h3&gt;</code>, <code>&lt;p&gt;</code>, <code>&lt;ul&gt;</code>, <code>&lt;li&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;a href=""&gt;</code>, <code>&lt;img src=""&gt;</code>
        </p>

        {loadingContent ? (
          <p style={{ color: 'var(--text-mut)', padding: 40, textAlign: 'center' }}>Cargando...</p>
        ) : (
          <textarea
            value={cuerpo}
            onChange={e => setCuerpo(e.target.value)}
            rows={20}
            style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
            placeholder={'<h2>Título de sección</h2>\n<p>Contenido aquí...</p>\n<h3>Subtítulo</h3>\n<ul>\n  <li>Punto 1</li>\n  <li>Punto 2</li>\n</ul>'}
          />
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : 'Guardar contenido'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
