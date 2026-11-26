import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Cantidad de proveedores (no secretos) por categoría, para el menú lateral.
// Sale de config/stats.porCategoria (lo escriben /admin/proveedores y el
// importador): así el menú no necesita bajar los ~2400 proveedores en cada página.
// null = todavía no hay conteo publicado → el menú muestra todas las categorías.
let cache: Record<string, number> | null | undefined;
let pendiente: Promise<Record<string, number> | null> | null = null;

function cargar(): Promise<Record<string, number> | null> {
  if (!pendiente) {
    pendiente = getDoc(doc(db, 'config', 'stats'))
      .then(snap => {
        const pc = snap.exists() ? snap.data().porCategoria : null;
        return pc && typeof pc === 'object' ? (pc as Record<string, number>) : null;
      })
      .catch(() => null)
      .then(r => { cache = r; return r; });
  }
  return pendiente;
}

export function useConteoCategorias(): Record<string, number> | null {
  const [conteo, setConteo] = useState<Record<string, number> | null>(cache ?? null);
  useEffect(() => {
    let activo = true;
    if (cache === undefined) cargar().then(r => { if (activo) setConteo(r); });
    return () => { activo = false; };
  }, []);
  return conteo;
}
