// Valor de venda do acesso, editável em /admin/precios (config/precio).
// config/ tem leitura pública e escrita só de admin: nada nas regras mudou.
// Enquanto o documento não carrega (ou se não existir), valem as variáveis
// de ambiente NEXT_PUBLIC_PRECIO_GS / NEXT_PUBLIC_PRECIO_NORMAL_GS.
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, PRECIO_GS, PRECIO_NORMAL_GS } from './firebase';

export const PRECIO_DOC = { col: 'config', id: 'precio' };

export interface PrecioConfig {
  precioGs: number;        // valor cobrado
  precioNormalGs: number;  // valor "de" riscado (0 = não mostrar)
  periodo: string;         // "mes", "año", "pago único"…
}

export const PRECIO_PADRAO: PrecioConfig = { precioGs: PRECIO_GS, precioNormalGs: PRECIO_NORMAL_GS, periodo: 'mes' };

export function mergePrecio(d: Partial<PrecioConfig> | undefined): PrecioConfig {
  const n = (v: unknown, def: number) => (typeof v === 'number' && v >= 0 ? v : def);
  return {
    precioGs: n(d?.precioGs, PRECIO_PADRAO.precioGs) || PRECIO_PADRAO.precioGs,
    precioNormalGs: n(d?.precioNormalGs, PRECIO_PADRAO.precioNormalGs),
    periodo: (d?.periodo || '').trim() || 'mes',
  };
}

/** "/mes", "/año"; pagamento único fica sem barra. */
export const sufijoPeriodo = (p: string) => (/único|unico/i.test(p) ? ` ${p}` : `/${p}`);

let cache: PrecioConfig | null = null;
let pedido: Promise<PrecioConfig> | null = null;
const ouvintes = new Set<(p: PrecioConfig) => void>();

export function carregarPrecio(forcar = false): Promise<PrecioConfig> {
  if (cache && !forcar) return Promise.resolve(cache);
  if (!pedido || forcar) {
    pedido = getDoc(doc(db, PRECIO_DOC.col, PRECIO_DOC.id))
      .then(s => mergePrecio(s.exists() ? (s.data() as Partial<PrecioConfig>) : undefined))
      .catch(() => PRECIO_PADRAO)
      .then(p => { cache = p; ouvintes.forEach(f => f(p)); return p; });
  }
  return pedido;
}

/** Preço atual (começa com o padrão e troca quando o Firestore responde). */
export function usePrecio(): PrecioConfig {
  const [p, setP] = useState<PrecioConfig>(cache || PRECIO_PADRAO);
  useEffect(() => {
    ouvintes.add(setP);
    carregarPrecio().then(setP);
    return () => { ouvintes.delete(setP); };
  }, []);
  return p;
}
