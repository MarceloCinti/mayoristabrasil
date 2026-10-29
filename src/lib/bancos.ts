// Bancos y billeteras de Paraguay para datos de transferencia
export const BANCOS = [
  'Banco Continental',
  'Banco Itaú Paraguay',
  'Sudameris Bank',
  'Banco Nacional de Fomento (BNF)',
  'Banco Familiar',
  'Banco Atlas',
  'Visión Banco',
  'Banco GNB Paraguay',
  'Banco Basa',
  'Bancop',
  'Interfisa Banco',
  'Financiera El Comercio',
  'Ueno Bank',
  'Zimple',
  'Tigo Money (billetera)',
  'Personal Pay (billetera)',
  'Wally (billetera)',
  'Otro',
] as const;

export interface CuentaBancaria {
  banco: string;
  nombreCompleto: string;
  ci: string;
  nroCuenta: string;
}
