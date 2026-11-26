// Apodos para cuentas existentes + reseñas/respuestas antiguas con el apodo.
//
//   node scripts/apodos.js            → solo muestra qué cambiaría (no graba)
//   node scripts/apodos.js --aplicar  → graba
//
// Usa la chave de serviço em scripts/serviceAccount.json e o MESMO gerador do
// site (src/lib/nickname.ts, transpilado na hora).
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const raiz = path.join(__dirname, '..');
const fonte = fs.readFileSync(path.join(raiz, 'src/lib/nickname.ts'), 'utf8');
const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { sugerirApodo } = mod.exports;

const aplicar = process.argv.includes('--aplicar');
initializeApp({ credential: cert(require(path.join(__dirname, 'serviceAccount.json'))) });
const db = getFirestore();

(async () => {
  const usuarios = await db.collection('usuarios').get();
  const apodo = new Map();
  let novos = 0;
  let lote = db.batch(), n = 0;
  const flush = async () => { if (n && aplicar) await lote.commit(); lote = db.batch(); n = 0; };

  for (const d of usuarios.docs) {
    const u = d.data();
    let a = (u.nickname || '').trim();
    if (!a) {
      a = sugerirApodo(u.nombre || '', d.id);
      novos++;
      lote.update(d.ref, { nickname: a }); n++;
      if (n >= 400) await flush();
    }
    apodo.set(d.id, a);
  }
  await flush();
  console.log(`usuarios: ${usuarios.size} · sin apodo (reciben uno): ${novos}`);

  const resenas = await db.collection('resenas').get();
  let mudam = 0, respMudam = 0;
  for (const d of resenas.docs) {
    const r = d.data();
    const novo = {};
    // conta apagada: mantém o apodo já gravado (senão muda a cada execução)
    const a = apodo.get(r.uid) || r.nickname || sugerirApodo(r.nombre || '', r.uid || d.id);
    if (r.nombre !== a || r.nickname !== a) { novo.nombre = a; novo.nickname = a; }
    if (Array.isArray(r.respuestas) && r.respuestas.length) {
      let mudou = false;
      const rs = r.respuestas.map(x => {
        const ax = apodo.get(x.uid) || x.nickname || sugerirApodo(x.nombre || '', x.uid || '');
        if (x.nombre !== ax || x.nickname !== ax) { mudou = true; respMudam++; return { ...x, nombre: ax, nickname: ax }; }
        return x;
      });
      if (mudou) novo.respuestas = rs;
    }
    if (Object.keys(novo).length) {
      mudam++;
      lote.update(d.ref, novo); n++;
      if (n >= 400) await flush();
    }
  }
  await flush();
  console.log(`reseñas: ${resenas.size} · cambian: ${mudam} · respuestas que cambian: ${respMudam}`);
  console.log('ejemplos de apodos:', [...apodo.values()].slice(0, 8).join(', '));
  console.log(aplicar ? 'GRABADO.' : 'Simulación: nada fue grabado. Usá --aplicar para grabar.');
})().catch(e => { console.error(e); process.exit(1); });
