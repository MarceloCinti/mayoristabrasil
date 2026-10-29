import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CATEGORIAS_DEFAULT, Categoria } from '@/lib/categorias';

// Lee la lista viva de categorías/áreas desde Firestore (config/categorias).
// Si todavía no hay nada guardado, usa la lista por defecto como fallback.
// Reactivo: si el admin edita la lista, se actualiza en todos lados.
export function useCategorias(): { categorias: Categoria[]; loading: boolean } {
  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'categorias'),
      (snap) => {
        const lista = snap.exists() ? (snap.data().lista as Categoria[]) : null;
        if (Array.isArray(lista) && lista.length > 0) {
          const valida = lista.filter((c) => c && c.id && c.label);
          // Si la lista guardada todavía no tiene grupos (formato viejo), enriquecemos
          // el grupo desde la taxonomía por defecto para mostrar agrupado igual.
          const byId = new Map(CATEGORIAS_DEFAULT.map((c) => [c.id, c.grupo]));
          setCategorias(valida.map((c) => (c.grupo ? c : { ...c, grupo: byId.get(c.id) || 'Otros' })));
        } else {
          setCategorias(CATEGORIAS_DEFAULT);
        }
        setLoading(false);
      },
      () => setLoading(false) // si falla la lectura, quedamos con el default
    );
    return () => unsub();
  }, []);

  return { categorias, loading };
}

// Devuelve la etiqueta de una categoría por id, con fallback al propio id.
export function labelDe(categorias: Categoria[], id: string): string {
  return categorias.find((c) => c.id === id)?.label || id || '';
}
