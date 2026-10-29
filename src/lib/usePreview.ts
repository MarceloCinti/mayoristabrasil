import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Vista previa GRATUITA de la landing (config/preview, lectura pública).
// El admin elige hasta 8 proveedores; se publican acá con sus datos de contacto
// porque la landing no puede leer la colección `proveedores` (sólo usuarios pagos).
export type PreviewItem = {
  nombre: string;
  categoria: string;
  foto: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  direccion: string;
  observaciones: string;
};

export function usePreview(): { items: PreviewItem[]; loaded: boolean } {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'preview'));
        if (activo && snap.exists()) {
          const arr = snap.data().items;
          if (Array.isArray(arr)) setItems(arr.filter((i: any) => i && i.nombre));
        }
      } catch { /* sin preview, la landing muestra el teaser por defecto */ }
      if (activo) setLoaded(true);
    })();
    return () => { activo = false; };
  }, []);

  return { items, loaded };
}

// Normaliza el handle de Instagram a URL
export const igUrl = (v: string): string =>
  !v ? '' : v.startsWith('http') ? v : `https://instagram.com/${v.replace('@', '')}`;
