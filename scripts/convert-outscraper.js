/*
 * Convertidor de Outscraper → CSV/TSV para Mayorista Brasil.
 * USO: editá IN (ruta al .xlsx de Outscraper) y CAT (id de categoría) abajo,
 *      luego: cd C:/mayorista-brasil && node scripts/convert-outscraper.js
 * Genera Downloads/<CAT>.tsv y <CAT>.csv con las columnas del sistema.
 * Ese .tsv se pega en una Google Sheet (A1, Ctrl+V) y se publica como CSV.
 * NUNCA pegar el xlsx crudo de Outscraper en la Sheet (columnas distintas).
 */
const XLSX = require('C:/mayorista-brasil/node_modules/xlsx');
const fs = require('fs');

const IN = 'C:/Users/IdeateraPC/Downloads/Intima.xlsx';
// Categoría del batch: el nombre del archivo de salida se genera a partir de esto
const CAT = 'lenceria';
const OUT_TSV = `C:/Users/IdeateraPC/Downloads/${CAT}.tsv`;
const OUT_CSV = `C:/Users/IdeateraPC/Downloads/${CAT}.csv`;

const wb = XLSX.readFile(IN);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

// Mapea el query original a categoría del sistema
const catFromQuery = (q) => {
  const s = (q || '').toLowerCase();
  if (s.includes('jeans')) return 'jeans';
  if (s.includes('tênis') || s.includes('tenis') || s.includes('calçado')) return 'tenis';
  if (s.includes('fitness')) return 'fitness';
  if (s.includes('carter') || s.includes('carteira')) return 'carteras-femeninas';
  if (s.includes('bolsa') || s.includes('mochila')) return 'bolsas';
  if (s.includes('infantil') || s.includes('bebê') || s.includes('criança')) return 'infantil';
  if (s.includes('masculin')) return 'masculino';
  if (s.includes('feminin')) return 'femenino';
  if (s.includes('bijuter') || s.includes('acess')) return 'bijuterias';
  if (s.includes('evangélic') || s.includes('evangelic')) return 'evangelica';
  if (s.includes('plus size')) return 'plus-size';
  if (s.includes('streetwear')) return 'streetwear';
  if (s.includes('barat')) return 'moda-barata';
  // Default: atacado-premium (mayorista/atacadista genérico)
  return 'atacado-premium';
};

// Extrae handle de Instagram desde URL
const handleIG = (url) => {
  if (!url) return '';
  const m = String(url).match(/instagram\.com\/(?:_u\/)?([^\/\?]+)/i);
  if (!m) return '';
  const h = m[1].replace(/[^A-Za-z0-9._]/g, '');
  return h ? '@' + h : '';
};

// Limpia teléfono a solo dígitos
const cleanPhone = (p) => (p ? String(p).replace(/\D/g, '') : '');

// Infiere formas de pago desde el campo 'about' JSON
const formasPago = (about) => {
  if (!about) return '';
  try {
    const d = typeof about === 'string' ? JSON.parse(about) : about;
    const pays = d?.Payments || {};
    const arr = [];
    if (pays['Credit cards']) arr.push('Tarjeta de crédito');
    if (pays['Debit cards']) arr.push('Tarjeta de débito');
    if (pays['NFC mobile payments']) arr.push('Pago móvil');
    if (pays['Checks']) arr.push('Cheque');
    return arr.join(', ');
  } catch { return ''; }
};

// Deduplica por place_id + name
const seen = new Set();
const salida = [];
let excluidos = 0;

for (const r of rows) {
  const nombre = String(r.name || '').trim();
  if (!nombre) { excluidos++; continue; }
  if (r.business_status && r.business_status !== 'OPERATIONAL') { excluidos++; continue; }
  const key = (r.place_id || '') + '|' + nombre.toLowerCase();
  if (seen.has(key)) { excluidos++; continue; }
  seen.add(key);

  const ig = handleIG(r.company_instagram) || handleIG(r.contact_instagram);
  const fb = String(r.company_facebook || r.contact_facebook || '').trim();
  // Sin la palabra "Google" — que se vea como reseñas de la plataforma
  const rating = r.rating ? `${r.rating}★ (${r.reviews || 0} reseñas)` : '';

  // Fotos: soporta 1 sola (photo) o múltiples (photos_data JSON, photo_1..photo_15)
  const fotos = [];
  if (r.photo) fotos.push(String(r.photo).trim());
  // photos_data suele ser JSON con array de URLs cuando activás "Google Maps Photos"
  if (r.photos_data) {
    try {
      const arr = typeof r.photos_data === 'string' ? JSON.parse(r.photos_data) : r.photos_data;
      if (Array.isArray(arr)) arr.forEach(p => { const url = p?.photo_url || p?.url || p; if (typeof url === 'string') fotos.push(url); });
    } catch { /* noop */ }
  }
  // Columnas planas photo_1..photo_15
  for (let i = 1; i <= 15; i++) { const url = r[`photo_${i}`]; if (url) fotos.push(String(url).trim()); }
  // Deduplica y limita a 15
  const fotosUnicas = [...new Set(fotos.filter(Boolean))].slice(0, 15).join('|');

  salida.push({
    nombre,
    categoria: CAT,
    whatsapp: cleanPhone(r.phone || r.company_phone || r.contact_phone),
    instagram: ig,
    facebook: fb,
    direccion: String(r.address || '').trim(),
    googleMaps: String(r.location_link || '').trim(),
    rangoPrecio: '',
    pedidoMinimo: '',
    cantidadMinima: '',
    enviaParaguay: 'no',
    formaPago: formasPago(r.about),
    catalogo: String(r.website || '').trim(),
    esSecreto: 'no',
    esTendencia: 'no',
    observaciones: rating,
    fotos: fotosUnicas,
    video: '',
  });
}

const HEADERS = ['nombre','categoria','whatsapp','instagram','facebook','direccion','googleMaps','rangoPrecio','pedidoMinimo','cantidadMinima','enviaParaguay','formaPago','catalogo','esSecreto','esTendencia','observaciones','fotos','video'];

// TSV (mejor para pegar en Sheets)
const tsvLines = [HEADERS.join('\t')];
for (const p of salida) tsvLines.push(HEADERS.map(h => String(p[h] || '').replace(/[\t\r\n]+/g, ' ')).join('\t'));
fs.writeFileSync(OUT_TSV, tsvLines.join('\n'), 'utf8');

// CSV (backup)
const escCsv = (v) => {
  const s = String(v || '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csvLines = [HEADERS.join(',')];
for (const p of salida) csvLines.push(HEADERS.map(h => escCsv(p[h])).join(','));
fs.writeFileSync(OUT_CSV, csvLines.join('\n'), 'utf8');

// Reporte
const porCat = {};
salida.forEach(s => { porCat[s.categoria] = (porCat[s.categoria] || 0) + 1; });
const conWpp = salida.filter(s => s.whatsapp).length;
const conIG = salida.filter(s => s.instagram).length;
const conWeb = salida.filter(s => s.catalogo).length;
const conFoto = salida.filter(s => s.fotos).length;

console.log('=== CONVERSIÓN COMPLETA ===');
console.log('Total filas leídas:', rows.length);
console.log('Excluidos (dup / no operacional / sin nombre):', excluidos);
console.log('Proveedores en salida:', salida.length);
console.log('\nCon WhatsApp/teléfono:', conWpp, `(${Math.round(conWpp/salida.length*100)}%)`);
console.log('Con Instagram:', conIG, `(${Math.round(conIG/salida.length*100)}%)`);
console.log('Con website:', conWeb, `(${Math.round(conWeb/salida.length*100)}%)`);
console.log('Con foto:', conFoto, `(${Math.round(conFoto/salida.length*100)}%)`);
console.log('\nPor categoría:');
Object.entries(porCat).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log('\nArchivos generados:');
console.log('  TSV (pegar directo en Sheets):', OUT_TSV);
console.log('  CSV (importar en Sheets):', OUT_CSV);
console.log('\n=== Primeras 3 filas (preview) ===');
salida.slice(0, 3).forEach((s, i) => {
  console.log(`\n--- ${i + 1} ---`);
  Object.entries(s).forEach(([k, v]) => v && console.log(`  ${k}: ${String(v).slice(0, 90)}`));
});
