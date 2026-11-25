export interface Proveedor {
  id: string;
  nombre: string;
  categoria: string;
  whatsapp?: string;
  // Resultado de la verificación automática (scripts/outscraper, etapa "whatsapp").
  // Vale solo mientras whatsappVerificado === los dígitos de whatsapp: si el admin
  // cambia el número, vuelve a "sin verificar".
  whatsappVerificado?: string;
  whatsappTieneWa?: boolean;
  instagram?: string;
  facebook?: string;
  direccion?: string;
  googleMaps?: string;
  rangoPrecio?: string;
  pedidoMinimo?: string;
  cantidadMinima?: string;
  enviaParaguay?: boolean;
  formaPago?: string;
  catalogo?: string;
  esSecreto?: boolean;
  esTendencia?: boolean;
  vistaPrevia?: boolean; // se muestra GRATIS en la landing pública
  observaciones?: string;
  fotos?: string[];
  video?: string;
}

export interface Respuesta {
  uid: string;
  nombre: string;
  texto: string;
  ts: number;
}

export interface Resena {
  id: string;
  proveedorId: string;
  uid: string;
  nombre: string;
  texto: string;
  estrellas: number;
  createdAt?: any;
  likes?: string[];
  respuestas?: Respuesta[];
}

export type EstadoFav = 'guardado' | 'contactado' | 'comprado';

export const ESTADOS_FAV: { id: EstadoFav; label: string }[] = [
  { id: 'guardado', label: 'Guardado' },
  { id: 'contactado', label: 'Contactado' },
  { id: 'comprado', label: 'Compra realizada' },
];

// Brasil: 55 + DDD (2) + 9 + 8 dígitos = celular. 55 + DDD + 8 dígitos = fijo.
export function esCelularBr(digitos: string): boolean {
  const local = digitos.startsWith('55') ? digitos.slice(2) : digitos;
  return local.length === 11 && local[2] === '9';
}

// Cómo contactar: botón de WhatsApp solo si el número tiene WhatsApp (verificado,
// o celular aún sin verificar); si no, botón de llamar.
export function contactoDe(p: Proveedor): { wa: string | null; tel: string | null } {
  const d = (p.whatsapp || '').replace(/\D/g, '');
  if (d.length < 10) return { wa: null, tel: null };
  const conPais = d.length <= 11 ? '55' + d : d;
  const verificado = p.whatsappVerificado === d;
  const tieneWa = verificado ? !!p.whatsappTieneWa : esCelularBr(d);
  return tieneWa
    ? { wa: `https://wa.me/${conPais}`, tel: null }
    : { wa: null, tel: `tel:+${conPais}` };
}
