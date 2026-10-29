import { PRECIO_GS } from './firebase';

export const COMISION_DEFAULT = 30; // % por defecto

// Genera un código de afiliado aleatorio y corto, SIN referencia al nombre.
// Alfabeto sin caracteres ambiguos (l, i, o, 0, 1) para que sea fácil de leer/escribir.
export function generarCodigo(): string {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return code;
}

// Comisión de un referido (usa el monto pagado si existe, si no el precio actual)
export function calcularComision(montoPagado: number | undefined, porcentaje: number): number {
  const base = montoPagado && montoPagado > 0 ? montoPagado : PRECIO_GS;
  return Math.round((base * porcentaje) / 100);
}

export const fmtGs = (n: number) => 'Gs. ' + Math.round(n).toLocaleString('es-PY');
