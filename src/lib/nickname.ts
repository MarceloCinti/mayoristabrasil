// Apodos (nicknames): identidad PÚBLICA del usuario en comentarios, foro y
// en la barra de actividad. Nosotros (Mayorista Brasil) siempre tratamos al
// cliente por el NOMBRE real; el apodo existe para la discreción entre miembros.
//
// Regla: el apodo NO puede contener el nombre ni el apellido de la persona.
// La sugerencia automática mezcla una palabra en guaraní con la RAÍZ del
// apellido (nunca el apellido entero), así siempre pasa la regla.
//
// Este archivo no importa nada del navegador: lo usa también
// scripts/apodos.js (asignación masiva con el admin SDK).

export const GUARANI = [
  'Porã', 'Mbarete', 'Jaguarete', 'Yvoty', 'Arandu', 'Kuarahy', 'Jasy', 'Guyra',
  'Pira', 'Tatu', 'Jakare', 'Ñandu', 'Kaʼa', 'Terere', 'Chipa', 'Sapukai', 'Vyʼa',
  'Mborayhu', 'Hesãi', 'Karai', 'Avati', 'Mandiʼo', 'Pytã', 'Hovy', 'Kaʼaguy',
  'Arapoty', 'Yvága', 'Yguazu', 'Tape', 'Mitã', 'Kirirĩ', 'Angirũ', 'Tekove',
  'Yvytu', 'Ñeʼẽ', 'Ryguasu', 'Mbopi', 'Panambi', 'Yrupe', 'Kurusu',
];

/** minúsculas, sin acentos ni símbolos — para comparar con el nombre. */
export const normalizar = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** Generador pseudoaleatorio con semilla (mismo uid → misma sugerencia). */
export function semilla(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Raíz del apellido: corta lo suficiente para no quedar el apellido entero. */
function raizApellido(nombre: string): string {
  const partes = (nombre || '').trim().split(/\s+/).filter(p => normalizar(p).length >= 2);
  const ap = partes.length ? partes[partes.length - 1] : '';
  const limpio = ap.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-zñÑ]/g, '');
  if (limpio.length < 3) return '';
  return capital(limpio.slice(0, Math.max(2, Math.min(4, limpio.length - 2))));
}

const vocal = (c: string) => /[aeiouáéíóúãẽĩõũỹ]/i.test(c);

function juntar(a: string, b: string) {
  if (!a || !b) return a + b;
  return vocal(a.slice(-1)) && vocal(b.charAt(0)) ? a + b.slice(1) : a + b;
}

/** Candidatos de apodo para un nombre, en orden de preferencia. */
export function candidatos(nombre: string, rnd: () => number): string[] {
  const raiz = raizApellido(nombre);
  const palavras = [...GUARANI].sort(() => rnd() - .5);
  const out: string[] = [];
  for (const w of palavras.slice(0, 8)) {
    if (raiz) {
      const formas = [
        juntar(raiz, w.toLowerCase()),          // Gom + arandu → Gomarandu
        w + raiz,                               // Porã + Gom → PorãGom
        `${raiz}ʼi${w}`,                        // Gomʼi + Porã (ʼi = diminutivo)
      ];
      out.push(formas[Math.floor(rnd() * formas.length)]);
    }
    out.push(`${w}${10 + Math.floor(rnd() * 90)}`);
  }
  return out.filter(n => n.length >= 3 && n.length <= 20);
}

/** Error en castellano, o null si el apodo es válido para esa persona. */
export function validarApodo(apodo: string, nombre: string): string | null {
  const a = (apodo || '').trim();
  if (a.length < 3) return 'El apodo tiene que tener al menos 3 caracteres.';
  if (a.length > 20) return 'El apodo puede tener hasta 20 caracteres.';
  if (!/^[\p{L}\p{M}0-9_.ʼ'-]+$/u.test(a)) return 'Usá solo letras, números, punto, guion o guion bajo (sin espacios).';
  const n = normalizar(a);
  if (n.length < 3) return 'El apodo necesita al menos 3 letras o números.';
  const partes = (nombre || '').split(/\s+/).map(normalizar).filter(p => p.length >= 3);
  if (partes.some(p => n.includes(p)) || (partes.length && n === partes.join(''))) {
    return 'Tu apodo no puede tener tu nombre ni tu apellido: es para que nadie sepa quién sos.';
  }
  return null;
}

/** Sugerencia que SIEMPRE pasa la validación. `clave` (uid) la hace estable. */
export function sugerirApodo(nombre: string, clave: string = String(Date.now())): string {
  const rnd = semilla(clave + '|' + nombre);
  for (const c of candidatos(nombre, rnd)) if (!validarApodo(c, nombre)) return c;
  return `Angirũ${100 + Math.floor(rnd() * 900)}`;
}

/** Apodo para mostrar: el guardado, o una sugerencia estable (nunca el nombre). */
export function apodoDe(u: { nickname?: string | null; nombre?: string; uid?: string } | null | undefined): string {
  if (!u) return 'Miembro';
  return (u.nickname || '').trim() || sugerirApodo(u.nombre || '', u.uid || '');
}
