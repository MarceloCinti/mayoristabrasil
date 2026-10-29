import { useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { FiUploadCloud, FiTrash2, FiVideo, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import styles from './MediaUpload.module.css';

interface Props {
  label: string;
  value: string;                 // URL actual (o '')
  onChange: (url: string) => void;
  accept?: 'image' | 'video';
  folder: string;                // carpeta en Storage, ej "landing"
  hint?: string;
  ratio?: string;                // aspecto del preview, ej "16/9"
}

export default function MediaUpload({ label, value, onChange, accept = 'image', folder, hint, ratio = '16/9' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const acceptAttr = accept === 'video' ? 'video/*' : 'image/*';

  const handleFile = (file: File) => {
    const max = accept === 'video' ? 60 : 10; // MB
    if (file.size > max * 1024 * 1024) {
      toast.error(`El archivo supera ${max} MB`);
      return;
    }
    const ext = file.name.split('.').pop() || (accept === 'video' ? 'mp4' : 'jpg');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const sref = ref(storage, path);
    const task = uploadBytesResumable(sref, file);
    setProgress(0);
    task.on('state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        console.error(err);
        toast.error('Error al subir. ¿Está habilitado Storage?');
        setProgress(null);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange(url);
        setProgress(null);
        toast.success('Archivo subido');
      }
    );
  };

  const handleRemove = async () => {
    if (value) {
      try { await deleteObject(ref(storage, value)); } catch { /* ignora si ya no existe */ }
    }
    onChange('');
  };

  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {hint && <p className={styles.hint}>{hint}</p>}

      <div className={styles.preview} style={{ aspectRatio: ratio }}>
        {value ? (
          accept === 'video'
            ? <video src={value} className={styles.media} muted loop autoPlay playsInline />
            : <img src={value} className={styles.media} alt={label} />
        ) : (
          <div className={styles.empty}>
            {accept === 'video' ? <FiVideo /> : <FiImage />}
            <span>Sin archivo</span>
          </div>
        )}
        {progress !== null && (
          <div className={styles.progressOverlay}>
            <div className={styles.progressBar}><div style={{ width: `${progress}%` }} /></div>
            <span>{progress}%</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
          <FiUploadCloud /> {value ? 'Reemplazar' : 'Subir'}
        </button>
        {value && (
          <button type="button" className={styles.removeBtn} onClick={handleRemove} disabled={progress !== null}>
            <FiTrash2 /> Quitar
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}
