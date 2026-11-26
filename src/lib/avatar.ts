// Avatar del miembro: formato + color + figura, guardado como texto
// "forma.color.figura" en usuarios/{uid}.avatar (y copiado en cada
// comentario/tema del foro). Sin imágenes: se dibuja con íconos (Avatar.tsx).
// Este archivo no importa íconos, así el AuthContext y los scripts lo usan liviano.
import { semilla } from './nickname';

export const FORMAS = [
  { id: 'circulo', label: 'Círculo' },
  { id: 'cuadrado', label: 'Cuadrado' },
  { id: 'hexagono', label: 'Hexágono' },
  { id: 'gota', label: 'Gota' },
  { id: 'flor', label: 'Flor' },
  { id: 'rombo', label: 'Rombo' },
] as const;

export const CORES = [
  { id: 'verde', a: '#12803B', b: '#2FA35A' },
  { id: 'amarillo', a: '#E0A800', b: '#FFD447' },
  { id: 'azul', a: '#1D3F94', b: '#2F63C9' },
  { id: 'marino', a: '#0A1B4D', b: '#12276B' },
  { id: 'turquesa', a: '#0E8C8C', b: '#22C1B8' },
  { id: 'cielo', a: '#2B8BE0', b: '#7CC4FF' },
  { id: 'violeta', a: '#5B3CC4', b: '#8F6BF2' },
  { id: 'rosa', a: '#D6337A', b: '#F472B6' },
  { id: 'rojo', a: '#C0262D', b: '#F05252' },
  { id: 'naranja', a: '#E2620F', b: '#FF9A3C' },
  { id: 'cafe', a: '#6B4226', b: '#A9764F' },
  { id: 'grafito', a: '#2B3440', b: '#55677D' },
] as const;

export const FIGURAS = {
  animales: ['gato', 'perro', 'pajaro', 'pez', 'conejo', 'mariposa', 'caballo', 'vaca', 'camaron', 'escarabajo',
    'huella', 'rana', 'hipopotamo', 'kiwi', 'nutria', 'paloma', 'cuervo', 'dragon'],
  personas: ['persona', 'estudiante', 'detective', 'bebe', 'sonrisa', 'guino', 'astronauta', 'ninja', 'ejecutivo',
    'enfermera', 'mujer', 'hombre', 'vaquero', 'chef', 'robot', 'alien', 'fantasma'],
  simbolos: ['estrella', 'corazon', 'rayo', 'sol', 'luna', 'diamante', 'corona', 'cohete', 'fuego', 'ancla',
    'pluma', 'hoja', 'loto', 'cactus', 'palmera', 'planeta', 'musica', 'cafe', 'pizza', 'helado', 'cerezas', 'palta'],
} as const;

export const TODAS_FIGURAS: string[] = [...FIGURAS.animales, ...FIGURAS.personas, ...FIGURAS.simbolos];

export interface AvatarPartes { forma: string; cor: string; figura: string; }

export function lerAvatar(v: string | null | undefined): AvatarPartes | null {
  if (!v) return null;
  const [forma, cor, figura] = v.split('.');
  if (!FORMAS.some(f => f.id === forma) || !CORES.some(c => c.id === cor) || !TODAS_FIGURAS.includes(figura)) return null;
  return { forma, cor, figura };
}

export const montarAvatar = (p: AvatarPartes) => `${p.forma}.${p.cor}.${p.figura}`;

/** Avatar aleatorio pero estable para una clave (uid o apodo). */
export function avatarAleatorio(clave: string): string {
  const r = semilla('av|' + clave);
  const pick = <T,>(l: readonly T[]) => l[Math.floor(r() * l.length)];
  return montarAvatar({ forma: pick(FORMAS).id, cor: pick(CORES).id, figura: pick(TODAS_FIGURAS) });
}

/** Avatar para mostrar: el elegido o uno estable derivado de la clave. */
export const avatarDe = (avatar: string | null | undefined, clave: string) =>
  lerAvatar(avatar) ? (avatar as string) : avatarAleatorio(clave || 'x');
