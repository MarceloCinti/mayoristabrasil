export interface Proveedor {
  id: string;
  nombre: string;
  categoria: string;
  whatsapp?: string;
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
