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
  tema: 'verde' | 'azul' | 'amarelo';
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
  { id: 'p1', titulo: 'Más de 1.000 proveedores de Brás y alrededores', texto: 'Fábricas, mayoristas y distribuidores con contacto directo.', imagen: '', enlace: '/dashboard/proveedores', boton: 'Ver proveedores', tema: 'verde', activo: true },
  { id: 'p2', titulo: 'Proveedores secretos', texto: 'Fábricas escondidas que casi nadie conoce. Precio de origen.', imagen: '', enlace: '/dashboard/secretos', boton: 'Descubrir', tema: 'azul', activo: true },
  { id: 'p3', titulo: 'Diccionario del Negociador', texto: '204 mensajes listos para copiar y negociar en portugués.', imagen: '', enlace: '/dashboard/mensajes', boton: 'Abrir bono', tema: 'amarelo', activo: true },
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
