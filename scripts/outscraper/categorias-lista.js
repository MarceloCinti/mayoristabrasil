// Lê a lista de categorias de src/lib/categorias.ts (fonte única), para o
// script não precisar de uma cópia que fique desatualizada.
const fs = require('fs');
const path = require('path');

const ts = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'lib', 'categorias.ts'), 'utf8');
const RE = /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)',\s*grupo:\s*'([^']+)'\s*\}/g;

const CATEGORIAS_LISTA = [...ts.matchAll(RE)].map(m => ({ id: m[1], label: m[2], grupo: m[3] }));

module.exports = { CATEGORIAS_LISTA };
