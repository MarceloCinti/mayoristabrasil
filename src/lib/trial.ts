// ===== ACCESO DE PRUEBA =====
// Al registrarse, la persona entra con acceso completo y gasta 5 CLICS.
// Cuenta cualquier clic de navegación dentro del panel: links del menú lateral
// y tarjetas de proveedor. Al llegar al quinto, la pantalla se bloquea.
export const TRIAL_LIMITE = 5;

// OJO con el nombre del campo: en Firestore se llama `trialVistas` por
// histórico, pero hoy guarda UN MARCADOR POR CLIC (no secciones).
// Se dejó ese nombre a propósito: las reglas de seguridad ya publicadas
// cuentan el TAMAÑO de ese array, así que cambiar el nombre obligaría a
// volver a pegar las reglas en la consola de Firebase sin ganar nada.
export interface ConTrial {
  trialVistas?: string[];
  pago?: boolean;
  esAdmin?: boolean;
}

export const trialUsados = (u?: ConTrial | null): number => u?.trialVistas?.length ?? 0;
export const trialRestantes = (u?: ConTrial | null): number => Math.max(0, TRIAL_LIMITE - trialUsados(u));
export const trialAgotado = (u?: ConTrial | null): boolean => trialUsados(u) >= TRIAL_LIMITE;

// Acceso total: pagó, es admin, o todavía le quedan clics de prueba.
export const tieneAcceso = (u?: ConTrial | null): boolean =>
  !!u && (!!u.pago || !!u.esAdmin || !trialAgotado(u));

// Marcador único por clic. Tiene que ser único para que arrayUnion lo agregue
// siempre: si se repitiera, Firestore lo ignoraría y el clic no contaría.
export const nuevoMarcadorClic = (): string =>
  Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

// ===== DATOS DE PAGO (config/pago, lectura pública, escritura solo admin) =====
// Se editan desde el panel admin. NO van escritos en el código: son datos
// bancarios reales y tienen que poder cambiarse sin tocar el proyecto.
export interface DatosPago {
  // Transferencia
  banco: string;
  titular: string;
  ci: string;
  cuenta: string;
  alias: string;
  nota: string;
  // Tarjeta (Hotmart)
  hotmartActivo: boolean;
  hotmartUrl: string;
}

export const PAGO_DOC = { col: 'config', id: 'pago' };

export const DEFAULT_PAGO: DatosPago = {
  banco: '',
  titular: '',
  ci: '',
  cuenta: '',
  alias: '',
  nota: '',
  hotmartActivo: false,
  hotmartUrl: '',
};

export const mergePago = (d?: Partial<DatosPago>): DatosPago => ({ ...DEFAULT_PAGO, ...(d || {}) });

// Plazo que se le promete al cliente tras avisar que transfirió.
export const PLAZO_TRANSFERENCIA_MS = 60 * 60 * 1000; // 1 hora
