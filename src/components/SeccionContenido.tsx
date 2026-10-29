import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './SeccionContenido.module.css';

interface Props {
  seccionId: string;
  titulo: string;
  descripcion?: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
}

export default function SeccionContenido({ seccionId, titulo, descripcion, icon, emptyMessage }: Props) {
  const [contenido, setContenido] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'contenido', seccionId));
        if (snap.exists()) setContenido(snap.data().cuerpo || '');
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetch();
  }, [seccionId]);

  return (
    <div>
      <div className={styles.header}>
        {icon && <div className={styles.icon}>{icon}</div>}
        <div>
          <h1>{titulo}</h1>
          {descripcion && <p>{descripcion}</p>}
        </div>
      </div>

      {loading ? (
        <div className={styles.skeleton} />
      ) : contenido ? (
        <div className={styles.contenido} dangerouslySetInnerHTML={{ __html: contenido }} />
      ) : (
        <div className={styles.empty}>
          {emptyMessage || 'Esta sección se está actualizando. Vuelva pronto.'}
        </div>
      )}
    </div>
  );
}
