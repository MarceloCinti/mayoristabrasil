import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Resumen público de la plataforma (config/stats), escrito por el admin.
// La landing es pública y NO puede leer la colección `proveedores`
// (sólo usuarios pagos), por eso los números viven en config/stats.
export type Stats = {
  proveedores: number;
  categorias: number;
  grupos: { nombre: string; total: number }[];
};

const VACIO: Stats = { proveedores: 0, categorias: 0, grupos: [] };

export function useStats(): { stats: Stats; loaded: boolean } {
  const [stats, setStats] = useState<Stats>(VACIO);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'stats'));
        if (activo && snap.exists()) {
          const d = snap.data() as Partial<Stats>;
          setStats({
            proveedores: Number(d.proveedores) || 0,
            categorias: Number(d.categorias) || 0,
            grupos: Array.isArray(d.grupos) ? d.grupos.filter(g => g && g.nombre) : [],
          });
        }
      } catch { /* se queda en 0 y la landing usa sus textos por defecto */ }
      if (activo) setLoaded(true);
    })();
    return () => { activo = false; };
  }, []);

  return { stats, loaded };
}

// Redondea hacia abajo a una cifra "redonda" para mostrar (410 → 400, 1240 → 1200)
export const redondear = (n: number): number => {
  if (n < 50) return n;
  if (n < 100) return Math.floor(n / 10) * 10;
  if (n < 1000) return Math.floor(n / 50) * 50;
  return Math.floor(n / 100) * 100;
};
