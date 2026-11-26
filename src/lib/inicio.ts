// Conteúdo editável da home do painel (/dashboard), gravado em config/inicio.
// config/ já tem leitura pública e escrita só de admin nas regras do
// Firestore — por isso nada nas regras precisou mudar.
// Arquivos (imagens/vídeos) sobem para Storage landing/inicio/ (mesma regra
// da landing: leitura pública, escrita admin, até 60 MB).

export const INICIO_DOC = { col: 'config', id: 'inicio' };

export interface BannerInicio {
  id: string;
  titulo: string;
  texto: string;
  imagen: string;        // URL (vazio = só gradiente)
  enlace: string;        // rota interna (/dashboard/...) ou link externo
  boton: string;         // texto do botão
  tema: 'verde' | 'azul' | 'amarelo' | 'noche';
  arte?: '' | 'proveedores' | 'secretos' | 'bonos' | 'academia';  // ilustração animada
  activo: boolean;
}

export interface NovedadInicio {
  id: string;
  titulo: string;
  texto: string;
  etiqueta: string;      // ex.: "Nuevo", "Promo", "Aviso"
  imagen: string;
  enlace: string;
  fecha: string;         // AAAA-MM-DD
  activa: boolean;
}

export interface VideoInicio {
  id: string;
  titulo: string;
  url: string;           // mp4 subido ou link do YouTube/Vimeo
  activo: boolean;
}

export interface InicioConfig {
  banners: BannerInicio[];
  novedades: NovedadInicio[];
  videos: VideoInicio[];
  destacados: string[];  // ids de proveedores escolhidos pelo admin
}

export const nuevoId = () => Math.random().toString(36).slice(2, 10);

/** Banners de fábrica: aparecem enquanto o admin não cadastrar nenhum. */
export const BANNERS_PADRAO: BannerInicio[] = [
  { id: 'p1', titulo: 'Proveedores de todo Brasil, en un solo lugar', texto: 'Fábricas, mayoristas y distribuidores con contacto directo, fotos y WhatsApp.', imagen: '', enlace: '/dashboard/proveedores', boton: 'Ver proveedores', tema: 'verde', arte: 'proveedores', activo: true },
  { id: 'p2', titulo: 'Proveedores Secretos', texto: 'Fábricas que casi nadie conoce, con precio de origen. Solo para miembros.', imagen: '', enlace: '/dashboard/secretos', boton: 'Descubrir', tema: 'azul', arte: 'secretos', activo: true },
  { id: 'p3', titulo: '4 bonos incluidos en tu acceso', texto: 'Diccionario del Negociador, Academia Mayorista y más, sin pagar nada extra.', imagen: '', enlace: '/dashboard/bonos', boton: 'Ver mis bonos', tema: 'amarelo', arte: 'bonos', activo: true },
  { id: 'p4', titulo: 'Academia Mayorista', texto: 'Paso a paso para comprar mejor, negociar en portugués y revender con margen.', imagen: '', enlace: '/dashboard/curso', boton: 'Empezar el curso', tema: 'noche', arte: 'academia', activo: true },
];

export const DEFAULT_INICIO: InicioConfig = { banners: [], novedades: [], videos: [], destacados: [] };

export function mergeInicio(d: Partial<InicioConfig> | undefined): InicioConfig {
  return {
    banners: Array.isArray(d?.banners) ? d!.banners : [],
    novedades: Array.isArray(d?.novedades) ? d!.novedades : [],
    videos: Array.isArray(d?.videos) ? d!.videos : [],
    destacados: Array.isArray(d?.destacados) ? d!.destacados : [],
  };
}

/** Converte link do YouTube/Vimeo em endereço de embed; null = arquivo de vídeo direto. */
export function embedDe(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
