/*
 * RE-HOSPEDAR FOTOS DOS PROVEEDORES
 * =================================
 *
 * O problema que isto resolve: o import do Outscraper salva LINKS para fotos do
 * Google Maps (lh3.googleusercontent.com/gps-cs-s/...). Esses links expiram — e
 * quando expiram, voltam 403 e o site fica sem imagem. Nós nunca tivemos as
 * fotos; tínhamos o endereço delas na casa do Google.
 *
 * Este script baixa cada foto e sobe para o Storage DO PROJETO, trocando a URL
 * no Firestore. A partir daí a foto é nossa e não expira.
 *
 * ORDEM IMPORTANTE: rode logo depois de reimportar os proveedores com um export
 * novo do Outscraper. Links velhos já estão 403 e não dá nem para baixar.
 *
 * ---------------------------------------------------------------------------
 * COMO USAR
 *
 *   1) Baixe a chave de serviço do Firebase:
 *      Console → ⚙ Configurações do projeto → Contas de serviço
 *      → "Gerar nova chave privada" → salve como scripts/serviceAccount.json
 *      ATENÇÃO: esse arquivo dá acesso total ao projeto. Não compartilhe,
 *      não suba para lugar nenhum.
 *
 *   2) Veja o que seria feito, sem alterar nada:
 *        node scripts/rehospedar-fotos.js
 *
 *   3) Aplicar de verdade:
 *        node scripts/rehospedar-fotos.js --aplicar
 *
 *   Opções:
 *     --aplicar          grava de verdade (sem isto, é só relatório)
 *     --limite=50        processa só os primeiros N proveedores (teste)
 *     --max-fotos=3      quantas fotos por proveedor (padrão 5)
 *
 * É seguro repetir: fotos que já estão no nosso Storage são puladas, então
 * se o script cair no meio, rodar de novo continua de onde parou.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

// ===== Opções =====
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const LIMITE = Number((args.find(a => a.startsWith('--limite=')) || '').split('=')[1]) || Infinity;
const MAX_FOTOS = Number((args.find(a => a.startsWith('--max-fotos=')) || '').split('=')[1]) || 5;
const CONCORRENCIA = 4;          // downloads simultâneos
const TAMANHO_MAX = 8 * 1024 * 1024; // 8 MB por foto

const CHAVE = path.join(__dirname, 'serviceAccount.json');
const BUCKET = 'mayorista-brasil.firebasestorage.app';

// ===== Checagens antes de começar =====
if (!fs.existsSync(CHAVE)) {
  console.error('\n  Falta a chave de serviço: scripts/serviceAccount.json');
  console.error('  Firebase Console → Configurações do projeto → Contas de serviço');
  console.error('  → Gerar nova chave privada → salvar com esse nome.\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(CHAVE)),
  storageBucket: BUCKET,
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Já está hospedada por nós?
const jaNossa = (url) =>
  typeof url === 'string' &&
  (url.includes('firebasestorage.googleapis.com') || url.includes(BUCKET));

const extDe = (contentType) => {
  if (!contentType) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
};

async function baixar(url) {
  const resp = await fetch(url, {
    redirect: 'follow',
    headers: {
      // Alguns CDNs recusam cliente sem User-Agent de navegador
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36',
    },
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const tipo = resp.headers.get('content-type') || '';
  if (!tipo.startsWith('image/')) throw new Error('não é imagem (' + tipo + ')');
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length > TAMANHO_MAX) throw new Error('muito grande (' + Math.round(buf.length / 1024) + ' KB)');
  if (buf.length < 1024) throw new Error('muito pequena, provável erro disfarçado');
  return { buf, tipo };
}

async function subir(provId, indice, buf, tipo) {
  const destino = `proveedores/${provId}/${indice}.${extDe(tipo)}`;
  // O token faz a URL pública ficar no mesmo formato que o app já usa
  // (getDownloadURL do SDK cliente), então nada mais precisa mudar.
  const token = crypto.randomUUID();
  await bucket.file(destino).save(buf, {
    resumable: false,
    metadata: {
      contentType: tipo,
      cacheControl: 'public, max-age=31536000',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destino)}?alt=media&token=${token}`;
}

// Executa tarefas com limite de simultaneidade
async function emLotes(itens, n, fn) {
  const saida = [];
  for (let i = 0; i < itens.length; i += n) {
    saida.push(...await Promise.all(itens.slice(i, i + n).map(fn)));
  }
  return saida;
}

(async () => {
  console.log('\n=== RE-HOSPEDAR FOTOS ===');
  console.log(APLICAR ? 'MODO: aplicando alterações' : 'MODO: simulação (nada será gravado) — use --aplicar para valer');
  console.log('bucket:', BUCKET, '| máx', MAX_FOTOS, 'fotos por proveedor\n');

  const snap = await db.collection('proveedores').get();
  const docs = snap.docs.slice(0, LIMITE === Infinity ? undefined : LIMITE);
  console.log('proveedores lidos:', snap.size, LIMITE !== Infinity ? `(processando ${docs.length})` : '');

  let semFoto = 0, jaOk = 0, rehospedadas = 0, falhas = 0, docsAtualizados = 0;
  const motivos = {};

  let n = 0;
  for (const doc of docs) {
    n++;
    const d = doc.data();
    const fotos = Array.isArray(d.fotos) ? d.fotos.filter(Boolean).slice(0, MAX_FOTOS) : [];
    if (fotos.length === 0) { semFoto++; continue; }

    const pendentes = fotos.filter(u => !jaNossa(u));
    jaOk += fotos.length - pendentes.length;
    if (pendentes.length === 0) continue;

    const resultados = await emLotes(pendentes, CONCORRENCIA, async (url) => {
      try {
        const { buf, tipo } = await baixar(url);
        if (!APLICAR) return { url, nova: '(simulado)', ok: true };
        const idx = fotos.indexOf(url);
        const nova = await subir(doc.id, idx >= 0 ? idx : 0, buf, tipo);
        return { url, nova, ok: true };
      } catch (err) {
        const m = String(err.message).slice(0, 40);
        motivos[m] = (motivos[m] || 0) + 1;
        return { url, ok: false };
      }
    });

    const oks = resultados.filter(r => r.ok);
    rehospedadas += oks.length;
    falhas += resultados.length - oks.length;

    if (APLICAR && oks.length > 0) {
      const mapa = new Map(oks.map(r => [r.url, r.nova]));
      // Mantém a ordem original e descarta as que não deram
      const novas = fotos.map(u => mapa.get(u) || (jaNossa(u) ? u : null)).filter(Boolean);
      await doc.ref.update({ fotos: novas });
      docsAtualizados++;
    }

    if (n % 25 === 0) {
      process.stdout.write(`  ${n}/${docs.length} · ok ${rehospedadas} · falhas ${falhas}\r`);
    }
  }

  console.log('\n\n=== RESULTADO ===');
  console.log('proveedores sem nenhuma foto :', semFoto);
  console.log('fotos já hospedadas por nós  :', jaOk);
  console.log(APLICAR ? 'fotos re-hospedadas          :' : 'fotos que dariam para baixar :', rehospedadas);
  console.log('fotos que falharam           :', falhas);
  if (APLICAR) console.log('documentos atualizados       :', docsAtualizados);

  if (Object.keys(motivos).length) {
    console.log('\nmotivos das falhas:');
    Object.entries(motivos).sort((a, b) => b[1] - a[1])
      .forEach(([m, c]) => console.log(`  ${String(c).padStart(5)}  ${m}`));
    console.log('\n  "HTTP 403" = link do Google já expirou. Esses só voltam com um export novo.');
  }

  if (!APLICAR) console.log('\nNada foi gravado. Para aplicar: node scripts/rehospedar-fotos.js --aplicar\n');
  process.exit(0);
})().catch(err => {
  console.error('\nFALHOU:', err.message);
  process.exit(1);
});
