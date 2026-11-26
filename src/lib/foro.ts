// Foro entre miembros. Cada autor aparece SOLO por su apodo (nunca el nombre).
// Colecciones: foroTemas/{id} y foroRespuestas/{id} — reglas en firestore.rules
// (bloque "Foro"), que hay que pegar a mano en la consola de Firebase.

export interface ForoTema {
  id: string;
  uid: string;
  apodo: string;
  titulo: string;
  texto: string;
  categoria: string;
  createdAt?: any;
  ultimaEn?: any;
  respuestas?: number;
  likes?: string[];
}

export interface ForoRespuesta {
  id: string;
  temaId: string;
  uid: string;
  apodo: string;
  texto: string;
  createdAt?: any;
  likes?: string[];
}

export const CATEGORIAS_FORO = [
  { id: 'general', label: 'General' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'compras', label: 'Compras y viajes' },
  { id: 'envios', label: 'Envíos y aduana' },
  { id: 'cambio', label: 'Cambio y pagos' },
  { id: 'ventas', label: 'Ventas y reventa' },
];

export const labelCategoriaForo = (id: string) => CATEGORIAS_FORO.find(c => c.id === id)?.label || 'General';

export const LIMITE_TITULO = 120;
export const LIMITE_TEXTO = 4000;

export function haceCuanto(ts: any): string {
  const ms = ts?.toMillis ? ts.toMillis() : typeof ts === 'number' ? ts : 0;
  if (!ms) return 'ahora';
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(ms).toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
}
