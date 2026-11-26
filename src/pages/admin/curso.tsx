import Head from 'next/head';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { FiSave, FiYoutube } from 'react-icons/fi';
import { db } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import MediaUpload from '@/components/admin/MediaUpload';
import { MODULOS, TODAS_CLASES, CURSO_NOMBRE, youtubeId } from '@/lib/curso';
import styles from './admin.module.css';

/**
 * Videos del mini curso (Bono 3). Cada clase acepta:
 *  - un MP4 subido acá (máx. 60 MB, va a Storage en landing/curso), o
 *  - un link de YouTube (recomendado: video «No listado», sin límite de tamaño).
 * Se guarda en contenido/curso → { videos: { [claseId]: url } }.
 */
export default function AdminCurso() {
  const { isAdmin, loading } = useAdminGuard();
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    getDoc(doc(db, 'contenido', 'curso'))
      .then(s => { if (s.exists()) setVideos((s.data().videos as Record<string, string>) || {}); })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [isAdmin]);

  const set = (id: string, url: string) => setVideos(v => ({ ...v, [id]: url.trim() }));

  const guardar = async () => {
    setGuardando(true);
    try {
      const limpio = Object.fromEntries(Object.entries(videos).filter(([, u]) => !!u));
      await setDoc(doc(db, 'contenido', 'curso'), { videos: limpio }, { merge: false });
      toast.success('Videos del curso guardados');
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar');
    }
    setGuardando(false);
  };

  if (loading || !isAdmin) return null;

  const conVideo = TODAS_CLASES.filter(c => videos[c.id]).length;

  return (
    <AdminLayout>
      <Head><title>Curso — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>{CURSO_NOMBRE} (Bono 3) — videos</h2>
        <button onClick={guardar} disabled={guardando || cargando} className="btn btn-primary">
          <FiSave /> {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <div className={styles.section}>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          <strong>{conVideo} de {TODAS_CLASES.length} clases con video.</strong> Las clases sin video
          se muestran igual, con el resumen escrito, y el alumno las marca como completadas a mano.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-mut)', lineHeight: 1.6, marginTop: 6 }}>
          Para cada clase: suba un <strong>.mp4 de hasta 60 MB</strong> o pegue un <strong>link de YouTube</strong>
          (súbalo como «No listado»: no aparece en búsquedas y no tiene límite de tamaño).
          En los dos casos el sistema guarda dónde quedó el alumno y marca la clase al llegar al 90%.
          No olvide <strong>Guardar cambios</strong>.
        </p>
      </div>

      {MODULOS.map(mo => (
        <div key={mo.id} className={styles.section}>
          <h3 className={styles.sectionTitle}>Módulo {mo.numero}: {mo.titulo}</h3>
          {mo.clases.map(c => {
            const url = videos[c.id] || '';
            const esYT = !!youtubeId(url);
            return (
              <div key={c.id} style={{ borderTop: '1px solid var(--border)', padding: '16px 0' }}>
                <p style={{ fontWeight: 700, marginBottom: 10 }}>{c.titulo}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) 1fr', gap: 20, alignItems: 'start' }}>
                  {esYT ? (
                    <div style={{ aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${youtubeId(url)}`}
                        style={{ width: '100%', height: '100%', border: 0 }}
                        title={c.titulo}
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <MediaUpload
                      label="Video .mp4"
                      accept="video" folder="landing/curso" ratio="16/9"
                      value={url}
                      onChange={u => set(c.id, u)}
                    />
                  )}
                  <div className={styles.formField}>
                    <label><FiYoutube /> Link de YouTube (o pegue cualquier URL de .mp4)</label>
                    <input
                      value={url}
                      placeholder="https://youtu.be/…"
                      onChange={e => set(c.id, e.target.value)}
                    />
                    {url && (
                      <button type="button" className="btn btn-secondary" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={() => set(c.id, '')}>
                        Quitar video
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </AdminLayout>
  );
}
