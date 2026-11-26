import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { ref, uploadBytesResumable, deleteObject } from 'firebase/storage';
import toast from 'react-hot-toast';
import { FiUploadCloud, FiTrash2, FiCheckCircle, FiVideo } from 'react-icons/fi';
import { db, storage } from '@/lib/firebase';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import CursoVideo from '@/components/CursoVideo';
import { MODULOS, TODAS_CLASES, CURSO_NOMBRE } from '@/lib/curso';
import styles from './admin.module.css';

/**
 * Videos del mini curso (Bono 3) — almacenamiento propio.
 * Cada video se sube al Storage del proyecto en `curso/<claseId>/…` (carpeta
 * sin lectura pública) y en `contenido/curso.videos[claseId]` se guarda la RUTA,
 * no un link. El alumno sólo lo ve por el reproductor propio, con link firmado.
 * Al subir o quitar, se guarda solo: no hay botón de guardar.
 */
const MAX_GB = 2;

function FilaClase({ id, titulo, ruta, onCambia }: { id: string; titulo: string; ruta: string; onCambia: (r: string) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [prog, setProg] = useState<number | null>(null);
  const [ver, setVer] = useState(false);

  const subir = (f: File) => {
    if (!f.type.startsWith('video/')) { toast.error('Elija un archivo de video (.mp4)'); return; }
    if (f.size > MAX_GB * 1024 ** 3) { toast.error(`El archivo supera ${MAX_GB} GB`); return; }
    const ext = (f.name.split('.').pop() || 'mp4').toLowerCase();
    const nueva = `curso/${id}/${Date.now()}.${ext}`;
    const task = uploadBytesResumable(ref(storage, nueva), f, { contentType: f.type });
    setProg(0);
    task.on('state_changed',
      s => setProg(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      err => {
        console.error(err);
        toast.error('Error al subir. ¿Ya pegó las nuevas reglas de Storage en la consola?');
        setProg(null);
      },
      async () => {
        const vieja = ruta;
        await onCambia(nueva);
        if (vieja) { try { await deleteObject(ref(storage, vieja)); } catch { /* ya no existe */ } }
        setProg(null);
        toast.success('Video subido y guardado');
      });
  };

  const quitar = async () => {
    if (!confirm('¿Quitar el video de esta clase? El archivo se borra del almacenamiento.')) return;
    const vieja = ruta;
    await onCambia('');
    try { await deleteObject(ref(storage, vieja)); } catch { /* ya no existe */ }
    setVer(false);
  };

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontWeight: 700 }}>{titulo}</p>
          <p style={{ fontSize: 12.5, color: ruta ? 'var(--brand)' : 'var(--text-mut)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {ruta ? <><FiCheckCircle /> Con video</> : 'Sin video (se muestra sólo el resumen)'}
          </p>
        </div>
        {prog !== null ? (
          <div style={{ minWidth: 200 }}>
            <div style={{ height: 8, background: 'var(--bg-elev)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${prog}%`, height: '100%', background: 'var(--brand)' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-mut)', marginTop: 4 }}>Subiendo… {prog}% — no cierre esta página</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {ruta && (
              <button type="button" className="btn btn-secondary" onClick={() => setVer(x => !x)}>
                <FiVideo /> {ver ? 'Ocultar' : 'Ver'}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()}>
              <FiUploadCloud /> {ruta ? 'Reemplazar' : 'Subir video'}
            </button>
            {ruta && (
              <button type="button" className="btn btn-secondary" style={{ color: 'var(--perigo)' }} onClick={quitar}>
                <FiTrash2 /> Quitar
              </button>
            )}
          </div>
        )}
        <input ref={input} type="file" accept="video/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ''; }} />
      </div>
      {ver && ruta && (
        <div style={{ position: 'relative', aspectRatio: '16/9', maxWidth: 560, marginTop: 12, borderRadius: 10, overflow: 'hidden' }}>
          <CursoVideo key={ruta} claseId={id} inicio={0} marcaAgua="vista previa admin" onAvance={() => {}} onCompleta={() => {}} />
        </div>
      )}
    </div>
  );
}

export default function AdminCurso() {
  const { isAdmin, loading } = useAdminGuard();
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    getDoc(doc(db, 'contenido', 'curso'))
      .then(s => {
        const v = (s.data()?.videos || {}) as Record<string, string>;
        // Sólo rutas de nuestro almacenamiento (se descartan links externos viejos).
        setVideos(Object.fromEntries(Object.entries(v).filter(([, r]) => r.startsWith('curso/'))));
      })
      .catch(console.error)
      .finally(() => setCargando(false));
  }, [isAdmin]);

  const cambiar = async (id: string, ruta: string) => {
    // Escribe sólo la clase que cambió (dos subidas simultáneas no se pisan).
    const d = doc(db, 'contenido', 'curso');
    if (ruta) await setDoc(d, { videos: { [id]: ruta } }, { merge: true });
    else await updateDoc(d, { [`videos.${id}`]: deleteField() });
    setVideos(v => {
      const n = { ...v };
      if (ruta) n[id] = ruta; else delete n[id];
      return n;
    });
  };

  if (loading || !isAdmin) return null;

  const conVideo = TODAS_CLASES.filter(c => videos[c.id]).length;

  return (
    <AdminLayout>
      <Head><title>Curso — Admin</title></Head>

      <div className={styles.toolbar}>
        <h2>{CURSO_NOMBRE} (Bono 3) — videos</h2>
      </div>

      <div className={styles.section}>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          <strong>{cargando ? '…' : conVideo} de {TODAS_CLASES.length} clases con video.</strong> Las clases sin video
          se muestran igual, con el resumen escrito.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-mut)', lineHeight: 1.6, marginTop: 6 }}>
          Los videos quedan en el almacenamiento propio del proyecto, sin link público, y se ven sólo
          en nuestro reproductor (sin barra para adelantar: sólo ±10 segundos, pausa y velocidad).
          Formato recomendado: <strong>.mp4 (H.264), 720p</strong>, hasta {MAX_GB} GB por clase.
          Al subir se guarda solo.
        </p>
      </div>

      {MODULOS.map(mo => (
        <div key={mo.id} className={styles.section}>
          <h3 className={styles.sectionTitle}>Módulo {mo.numero}: {mo.titulo}</h3>
          {mo.clases.map(c => (
            <FilaClase key={c.id} id={c.id} titulo={c.titulo} ruta={videos[c.id] || ''} onCambia={r => cambiar(c.id, r)} />
          ))}
        </div>
      ))}
    </AdminLayout>
  );
}
