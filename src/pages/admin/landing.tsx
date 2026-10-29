import Head from 'next/head';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiSave, FiExternalLink } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { LandingConfig, DEFAULT_LANDING, LANDING_DOC, mergeLanding } from '@/lib/landing';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import MediaUpload from '@/components/admin/MediaUpload';
import styles from './admin.module.css';

export default function AdminLanding() {
  const { isAdmin, loading } = useAdminGuard();
  const [cfg, setCfg] = useState<LandingConfig>(DEFAULT_LANDING);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, LANDING_DOC.col, LANDING_DOC.id));
        if (snap.exists()) setCfg(mergeLanding(snap.data() as Partial<LandingConfig>));
      } catch (err) { console.error(err); }
      setLoadingCfg(false);
    })();
  }, [isAdmin]);

  const set = <K extends keyof LandingConfig>(key: K, val: LandingConfig[K]) =>
    setCfg(prev => ({ ...prev, [key]: val }));

  const setProof = (i: number, url: string) =>
    setCfg(prev => { const arr = [...prev.proofShots]; arr[i] = url; return { ...prev, proofShots: arr }; });

  const setTesti = (i: number, field: 'nombre' | 'ciudad' | 'texto', val: string) =>
    setCfg(prev => { const arr = prev.testimonios.map((t, k) => k === i ? { ...t, [field]: val } : t); return { ...prev, testimonios: arr }; });

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, LANDING_DOC.col, LANDING_DOC.id), { ...cfg, actualizadoEn: serverTimestamp() }, { merge: true });
      toast.success('Landing actualizada');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    }
    setSaving(false);
  };

  if (loading || !isAdmin) return null;

  return (
    <AdminLayout>
      <Head><title>Editar Landing — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>Editar Landing</h2>
        <div className={styles.actions}>
          <a href="/" target="_blank" rel="noreferrer" className="btn btn-secondary"><FiExternalLink /> Ver landing</a>
          <button onClick={save} disabled={saving} className="btn btn-primary"><FiSave /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>

      {loadingCfg ? (
        <p style={{ color: 'var(--text-mut)', padding: 40, textAlign: 'center' }}>Cargando…</p>
      ) : (
        <>

          {/* HERO TEXTOS */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Textos del Hero</h3>
            <div className={styles.formGrid}>
              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label>Título (dejar vacío para usar el predeterminado)</label>
                <input value={cfg.heroTitle} onChange={e => set('heroTitle', e.target.value)} placeholder="Comprá directo del Brás y revendé en Paraguay" />
              </div>
              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label>Subtítulo (vacío = predeterminado)</label>
                <textarea rows={2} value={cfg.heroSubtitle} onChange={e => set('heroSubtitle', e.target.value)} placeholder="Accedé a los proveedores reales que usan los revendedores que ganan de verdad…" />
              </div>
            </div>
            <h4 className={styles.subTitle}>Etiquetas flotantes (ejemplo de ganancia)</h4>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Etiqueta superior</label>
                <input value={cfg.heroBadgeTopLabel} onChange={e => set('heroBadgeTopLabel', e.target.value)} />
              </div>
              <div className={styles.formField}>
                <label>Valor superior</label>
                <input value={cfg.heroBadgeTopValue} onChange={e => set('heroBadgeTopValue', e.target.value)} />
              </div>
              <div className={styles.formField}>
                <label>Etiqueta inferior</label>
                <input value={cfg.heroBadgeBottomLabel} onChange={e => set('heroBadgeBottomLabel', e.target.value)} />
              </div>
              <div className={styles.formField}>
                <label>Valor inferior</label>
                <input value={cfg.heroBadgeBottomValue} onChange={e => set('heroBadgeBottomValue', e.target.value)} />
              </div>
            </div>
          </div>

          {/* VIDEO TOUR */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Video / imagen del tour (sección "Por dentro")</h3>
            <div className={styles.mediaGrid}>
              <MediaUpload
                label="Video tour de la plataforma (16:9)"
                hint="Mostrá cómo es por dentro. Máx 60 MB, .mp4"
                accept="video" folder="landing" ratio="16/9"
                value={cfg.videoTour}
                onChange={(u) => set('videoTour', u)}
              />
            </div>
          </div>

          {/* PRUEBA SOCIAL */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Prueba social (prints y fotos)</h3>
            <p style={{ color: 'var(--text-mut)', fontSize: 13, marginBottom: 16 }}>
              Subí capturas de WhatsApp, fotos de compras o resultados. Se muestran en la sección de testimonios.
            </p>
            <div className={styles.mediaGrid4}>
              {cfg.proofShots.map((url, i) => (
                <MediaUpload
                  key={i}
                  label={`Print ${i + 1}`}
                  accept="image" folder="landing/proof" ratio="9/16"
                  value={url}
                  onChange={(u) => setProof(i, u)}
                />
              ))}
            </div>
          </div>

          {/* TESTIMONIOS */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Testimonios (texto)</h3>
            {cfg.testimonios.map((t, i) => (
              <div key={i} className={styles.testiBlock}>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label>Nombre</label>
                    <input value={t.nombre} onChange={e => setTesti(i, 'nombre', e.target.value)} />
                  </div>
                  <div className={styles.formField}>
                    <label>Ciudad</label>
                    <input value={t.ciudad} onChange={e => setTesti(i, 'ciudad', e.target.value)} />
                  </div>
                  <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                    <label>Testimonio</label>
                    <textarea rows={2} value={t.texto} onChange={e => setTesti(i, 'texto', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={save} disabled={saving} className="btn btn-primary"><FiSave /> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
