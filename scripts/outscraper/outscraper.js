/*
 * OUTSCRAPER → MAYORISTA BRASIL
 * =============================
 *
 * Busca fornecedores no Google Maps pela API do Outscraper, completa as redes
 * sociais lendo o site de cada um, escolhe os melhores (prioridade para quem
 * tem foto, Instagram, Facebook e WhatsApp) e grava direto no Firestore.
 *
 * Etapas — rode nesta ordem. Só "buscar" e "fotos" gastam créditos do
 * Outscraper, e só até o --orcamento que você passar.
 *
 *   node scripts/outscraper/outscraper.js plano    [filtro]
 *        Mostra quantas buscas existem e quanto custariam. Não chama a API.
 *
 *   node scripts/outscraper/outscraper.js buscar   [filtro] --orcamento=450
 *        Faz as buscas no Google Maps. Para antes de passar do orçamento
 *        (em número de empresas). Busca já feita nunca é paga de novo.
 *
 *   node scripts/outscraper/outscraper.js redes    [filtro]
 *        GRÁTIS. Abre o site de cada candidato e pega Instagram, Facebook e
 *        WhatsApp que estão lá.
 *
 *   node scripts/outscraper/outscraper.js fotos    [filtro] --orcamento=2000 [--por-lugar=4]
 *        Fotos extras de cada fornecedor escolhido (em número de fotos).
 *
 *   node scripts/outscraper/outscraper.js revisar  [filtro]
 *        Escolhe, pontua e cruza com a base atual. Gera relatório e planilha
 *        (dados/revisao.tsv) para conferir. Não grava nada.
 *
 *   node scripts/outscraper/outscraper.js gravar   [filtro] [--aplicar]
 *        Grava no Firestore (sem --aplicar é simulação), atualiza os números da
 *        landing e re-hospeda as fotos no Storage do projeto na mesma hora —
 *        os links de foto do Google expiram em poucos dias.
 *
 *   Filtro (opcional, vale para todas): --cat=jeans,tenis   ou   --grupo=Moda
 *   --por-busca=40   empresas por busca (padrão 40)
 *
 * Precisa de OUTSCRAPER_API_KEY no .env.local (só para buscar e fotos) e de
 * scripts/serviceAccount.json (para revisar e gravar).
 * Tudo que vem da API fica em scripts/outscraper/dados/ (fora do git).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PLANO, POLOS_ATACADO, buscasDe } = require('./plano');
const { CATEGORIAS_LISTA } = require('./categorias-lista');

// ===== Opções =====
const [, , ETAPA, ...ARGS] = process.argv;
const opt = (nome, padrao) => {
  const a = ARGS.find(x => x.startsWith(`--${nome}=`));
  return a ? a.slice(nome.length + 3) : padrao;
};
const flag = (nome) => ARGS.includes(`--${nome}`);

const POR_BUSCA = Number(opt('por-busca', 40));
const ORCAMENTO = Number(opt('orcamento', 0));
const APLICAR = flag('aplicar');

const RAIZ = path.join(__dirname, '..', '..');
const DADOS = path.join(__dirname, 'dados');
const DIR_BUSCAS = path.join(DADOS, 'buscas');
const DIR_FOTOS = path.join(DADOS, 'fotos');
const ARQ_REDES = path.join(DADOS, 'redes.json');
const ARQ_GASTO = path.join(DADOS, 'gasto.json');
const ARQ_SELECAO = path.join(DADOS, 'selecionados.json');
for (const d of [DADOS, DIR_BUSCAS, DIR_FOTOS]) fs.mkdirSync(d, { recursive: true });

// Preços públicos do Outscraper (outscraper.com/pricing, nov/2026), em US$ por 1.000.
// Cada serviço tem 500 grátis a cada 30 dias.
const PRECO = { empresas: 3, fotos: 2, gratis: 500 };

const API = 'https://api.app.outscraper.com';

// ===== Utilidades =====
const lerJSON = (arq, padrao) => { try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { return padrao; } };
const gravarJSON = (arq, obj) => fs.writeFileSync(arq, JSON.stringify(obj, null, 1));
const sem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const slug = (s) => sem(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const usd = (n) => 'US$ ' + n.toFixed(2);

function lerEnv() {
  const env = {};
  try {
    for (const linha of fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sem .env.local */ }
  return env;
}

function chaveApi() {
  const k = process.env.OUTSCRAPER_API_KEY || lerEnv().OUTSCRAPER_API_KEY;
  if (!k) {
    console.error('\n  Falta OUTSCRAPER_API_KEY no .env.local');
    console.error('  app.outscraper.com → Profile → API Token. Cole uma linha assim no .env.local:');
    console.error('    OUTSCRAPER_API_KEY=sua_chave_aqui\n');
    process.exit(1);
  }
  return k;
}

// Categorias escolhidas pelo filtro --cat / --grupo
function categoriasFiltradas() {
  const cats = opt('cat', '').split(',').map(s => s.trim()).filter(Boolean);
  const grupo = sem(opt('grupo', ''));
  let lista = CATEGORIAS_LISTA;
  if (cats.length) lista = lista.filter(c => cats.includes(c.id));
  if (grupo) lista = lista.filter(c => sem(c.grupo).startsWith(grupo));
  const semPlano = lista.filter(c => !PLANO[c.id]);
  if (semPlano.length) console.warn('  aviso: categorias sem plano de busca:', semPlano.map(c => c.id).join(', '));
  return lista.filter(c => PLANO[c.id]);
}

const arqBusca = (b) => path.join(DIR_BUSCAS, `${b.cat}--${slug(b.query)}--${POR_BUSCA}.json`);
// Busca já feita com este limite ou com um limite maior serve
function buscaEmCache(b) {
  const prefixo = `${b.cat}--${slug(b.query)}--`;
  const arqs = fs.readdirSync(DIR_BUSCAS).filter(f => f.startsWith(prefixo));
  for (const f of arqs) {
    const lim = Number(f.slice(prefixo.length).replace('.json', ''));
    if (lim >= POR_BUSCA) return path.join(DIR_BUSCAS, f);
  }
  return null;
}

function registrarGasto(tipo, qtd) {
  const g = lerJSON(ARQ_GASTO, { empresas: 0, fotos: 0, historico: [] });
  g[tipo] = (g[tipo] || 0) + qtd;
  g.historico.push({ tipo, qtd, em: new Date().toISOString() });
  gravarJSON(ARQ_GASTO, g);
}

// ===== Chamadas à API (assíncronas: envia, depois consulta até ficar pronto) =====
async function chamar(caminho, params, chave) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(x => qs.append(k, x)); else qs.append(k, String(v));
  }
  const r = await fetch(`${API}${caminho}?${qs}`, { headers: { 'X-API-KEY': chave, client: 'mayorista-brasil' } });
  const txt = await r.text();
  let json; try { json = JSON.parse(txt); } catch { json = { errorMessage: txt.slice(0, 300) }; }
  if (!r.ok || json.error || json.errorMessage) {
    throw new Error(`HTTP ${r.status}: ${json.errorMessage || json.error || txt.slice(0, 200)}`);
  }
  return json;
}

async function aguardar(id, chave) {
  const inicio = Date.now();
  for (;;) {
    const r = await chamar(`/requests/${id}`, {}, chave);
    if (r.status && r.status !== 'Pending') {
      if (r.status !== 'Success') throw new Error(`pedido ${id} terminou com status ${r.status}`);
      return r.data || [];
    }
    if (Date.now() - inicio > 20 * 60 * 1000) throw new Error(`pedido ${id} demorou mais de 20 min`);
    await esperar(6000);
  }
}

// =====================================================================
// PLANO
// =====================================================================
function etapaPlano() {
  const cats = categoriasFiltradas();
  let total = 0, novas = 0;
  console.log(`\n=== PLANO (${POR_BUSCA} empresas por busca) ===\n`);
  const porGrupo = {};
  for (const c of cats) {
    const bs = buscasDe(c.id);
    const pend = bs.filter(b => !buscaEmCache(b));
    total += bs.length; novas += pend.length;
    const g = porGrupo[c.grupo] = porGrupo[c.grupo] || { cats: 0, buscas: 0, pend: 0 };
    g.cats++; g.buscas += bs.length; g.pend += pend.length;
  }
  for (const [g, v] of Object.entries(porGrupo)) {
    console.log(`  ${g.padEnd(22)} ${String(v.cats).padStart(3)} categorias  ${String(v.buscas).padStart(4)} buscas  (${v.pend} ainda não feitas)`);
  }
  const maxEmpresas = novas * POR_BUSCA;
  const custo = Math.max(0, maxEmpresas - PRECO.gratis) * PRECO.empresas / 1000;
  console.log(`\n  categorias: ${cats.length}   buscas: ${total}   ainda não feitas: ${novas}`);
  console.log(`  no máximo ${maxEmpresas.toLocaleString('pt-BR')} empresas → até ${usd(custo)} (os 500 grátis do mês já descontados)`);
  console.log('  Na prática sai menos: busca de nicho devolve menos que o limite e repetidas não são cobradas.\n');
}

// =====================================================================
// BUSCAR
// =====================================================================
async function etapaBuscar() {
  if (!ORCAMENTO) { console.error('\n  Diga o orçamento em empresas: --orcamento=450 (500 por mês são grátis)\n'); process.exit(1); }
  const chave = chaveApi();
  const pend = categoriasFiltradas().flatMap(c => buscasDe(c.id)).filter(b => !buscaEmCache(b));
  console.log(`\n=== BUSCAR === ${pend.length} buscas pendentes · orçamento ${ORCAMENTO} empresas · ${POR_BUSCA} por busca\n`);

  const LOTE = 10; // buscas por pedido
  let gastas = 0;
  for (let i = 0; i < pend.length; i += LOTE) {
    const lote = pend.slice(i, i + LOTE);
    if (gastas + lote.length * POR_BUSCA > ORCAMENTO) {
      console.log(`\n  Parei para não passar do orçamento (${gastas} usadas de ${ORCAMENTO}). Faltam ${pend.length - i} buscas.`);
      break;
    }
    const env = await chamar('/maps/search-v3', {
      query: lote.map(b => b.query),
      organizationsPerQueryLimit: POR_BUSCA,
      language: 'pt',
      region: 'BR',
      dropDuplicates: 'true',
      async: 'true',
    }, chave);
    const dados = await aguardar(env.id, chave);
    let n = 0;
    lote.forEach((b, j) => {
      const lugares = (Array.isArray(dados[j]) ? dados[j] : []).filter(Boolean);
      n += lugares.length;
      gravarJSON(arqBusca(b), { ...b, limite: POR_BUSCA, em: new Date().toISOString(), lugares });
    });
    gastas += n;
    registrarGasto('empresas', n);
    console.log(`  ${String(i + lote.length).padStart(4)}/${pend.length}  +${n} empresas  (total ${gastas})  ${lote[0].cat}…`);
  }
  console.log(`\n  Empresas recebidas nesta rodada: ${gastas}. Próximo passo: redes\n`);
}

// =====================================================================
// LEITURA DOS RESULTADOS + FILTRO DE FORNECEDOR
// =====================================================================
const RE_FORNECEDOR = /atacad|distribui|fabric|industri|confec|importad|fornecedor|representac|faccao|malharia|tecelagem|wholesale|manufactur|supplier/;
const RE_FABRICA = /fabrica|fabricante|industri|confeccao|faccao|malharia|tecelagem|manufactur/;
const RE_NAO_FORNECEDOR = /^(restaurante|lanchonete|igreja|escola|banco|hospital|hotel|pousada|academia de|farmacia|supermercado|posto de|bar$|padaria$|clinica|salao de beleza|barbearia$|oficina mecanica|estacionamento)/;

// Palavras de produto de cada categoria, tiradas dos termos de busca
const GENERICAS = new Set('atacado atacadista distribuidora distribuidor fabrica fabricante confeccao de da do das dos e para a o em com artigos produtos equipamentos moda loja showroom feira insumos'.split(' '));
const palavrasCat = {};
for (const [id, p] of Object.entries(PLANO)) {
  const ws = new Set();
  for (const t of p.termos) for (const w of sem(t).split(/[^a-z0-9]+/)) {
    if (w.length >= 4 && !GENERICAS.has(w)) ws.add(w.slice(0, Math.max(4, w.length - 2)));
  }
  palavrasCat[id] = [...ws];
}

function textoDo(l) {
  return sem([l.name, l.category, l.type, Array.isArray(l.subtypes) ? l.subtypes.join(' ') : l.subtypes, l.description].join(' '));
}

function lerCandidatos(cats) {
  const ids = new Set(cats.map(c => c.id));
  const porLugar = new Map();
  for (const f of fs.readdirSync(DIR_BUSCAS)) {
    const b = lerJSON(path.join(DIR_BUSCAS, f), null);
    if (!b || !ids.has(b.cat)) continue;
    const polo = POLOS_ATACADO.includes(b.polo);
    for (const l of b.lugares || []) {
      const chave = l.google_id || l.place_id || sem(l.name) + '|' + (l.phone || '');
      if (!l.name) continue;
      if (l.business_status && l.business_status !== 'OPERATIONAL') continue;
      const txt = textoDo(l);
      const tipo = sem(l.type || l.category || '');
      const fornecedor = RE_FORNECEDOR.test(txt);
      // Fora dos polos atacadistas, só entra quem se declara fornecedor
      if (!fornecedor && (!polo || RE_NAO_FORNECEDOR.test(tipo))) continue;
      const relev = palavrasCat[b.cat].filter(w => txt.includes(w)).length;
      const atual = porLugar.get(chave);
      // O mesmo lugar aparece em várias categorias: fica onde combina mais
      if (!atual || relev > atual.relev) porLugar.set(chave, { lugar: l, cat: b.cat, relev, polo: b.polo, fabrica: RE_FABRICA.test(txt) });
    }
  }
  return [...porLugar.values()];
}

// =====================================================================
// REDES (grátis): Instagram / Facebook / WhatsApp do site de cada um
// =====================================================================
const RE_IG = /instagram\.com\/(?!p\/|reel|explore|accounts|stories|tv\/|direct|about|legal|developer)([A-Za-z0-9._]{2,30})/i;
const RE_FB = /facebook\.com\/(?!sharer|share|plugins|tr[/?]|dialog|v\d|login|policies|privacy|help|groups\/?$|watch|events|hashtag|photo)((?:profile\.php\?id=\d+)|[A-Za-z0-9.\-]{3,80})/i;
const RE_WA = /(?:wa\.me\/|whatsapp\.com\/send\/?\?phone=|whatsapp:\/\/send\?phone=)\+?(\d{10,13})/i;

function socialDe(texto) {
  const s = String(texto || '');
  const ig = s.match(RE_IG), fb = s.match(RE_FB), wa = s.match(RE_WA);
  return {
    instagram: ig ? '@' + ig[1].replace(/\.+$/, '') : '',
    facebook: fb ? 'https://www.facebook.com/' + fb[1].replace(/\/$/, '') : '',
    whatsapp: wa ? wa[1] : '',
  };
}

// Junta tudo que o próprio Outscraper já trouxe (campos de enriquecimento)
function socialDoLugar(l) {
  const todos = [];
  const varrer = (v) => {
    if (typeof v === 'string') { if (/instagram|facebook|wa\.me|whatsapp/i.test(v)) todos.push(v); }
    else if (Array.isArray(v)) v.forEach(varrer);
    else if (v && typeof v === 'object') Object.values(v).forEach(varrer);
  };
  varrer(l);
  const r = { instagram: '', facebook: '', whatsapp: '' };
  for (const t of todos) { const s = socialDe(t); for (const k in r) if (!r[k] && s[k]) r[k] = s[k]; }
  return r;
}

async function lerSite(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal, redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' },
    });
    if (!r.ok) return { erro: 'HTTP ' + r.status };
    const html = (await r.text()).slice(0, 1_500_000);
    return { ...socialDe(html), final: r.url };
  } catch (e) {
    return { erro: e.name === 'AbortError' ? 'tempo esgotado' : String(e.message).slice(0, 60) };
  } finally { clearTimeout(t); }
}

async function etapaRedes() {
  const cands = lerCandidatos(categoriasFiltradas());
  const redes = lerJSON(ARQ_REDES, {});
  const sites = [...new Set(cands.map(c => c.lugar.website || c.lugar.site).filter(Boolean))]
    .filter(u => /^https?:\/\//i.test(u) && !/instagram\.com|facebook\.com|wa\.me|whatsapp\.com/i.test(u))
    .filter(u => !redes[u]);
  console.log(`\n=== REDES === ${cands.length} candidatos · ${sites.length} sites para ler (grátis)\n`);
  const CONC = 8;
  let n = 0;
  for (let i = 0; i < sites.length; i += CONC) {
    const lote = sites.slice(i, i + CONC);
    const res = await Promise.all(lote.map(lerSite));
    lote.forEach((u, j) => { redes[u] = { ...res[j], em: new Date().toISOString() }; });
    n += lote.length;
    if (n % 80 === 0 || n === sites.length) { gravarJSON(ARQ_REDES, redes); process.stdout.write(`  ${n}/${sites.length}\r`); }
  }
  gravarJSON(ARQ_REDES, redes);
  const vals = Object.values(redes);
  console.log(`\n  sites lidos: ${vals.length} · com Instagram ${vals.filter(v => v.instagram).length} · Facebook ${vals.filter(v => v.facebook).length} · WhatsApp ${vals.filter(v => v.whatsapp).length}\n`);
}

// =====================================================================
// TELEFONE / WHATSAPP
// =====================================================================
function normTel(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return d.length === 12 || d.length === 13 ? d : '';
}
// Celular brasileiro: 55 + DDD + 9 + 8 dígitos
const ehCelular = (d) => /^55\d{2}9\d{8}$/.test(d);

function melhorTelefone(l, site) {
  const lista = [site.whatsapp, l.phone, l.company_phone, ...(Array.isArray(l.company_phones) ? l.company_phones : String(l.company_phones || '').split(/[,;]/))]
    .map(normTel).filter(Boolean);
  return lista.find(ehCelular) || lista[0] || '';
}

// =====================================================================
// FORMA DE PAGAMENTO (campo "about" do Google)
// =====================================================================
function formasPago(about) {
  if (!about || typeof about !== 'object') return '';
  const chaves = [];
  for (const sec of Object.values(about)) if (sec && typeof sec === 'object') for (const [k, v] of Object.entries(sec)) if (v) chaves.push(sem(k));
  const out = [];
  const tem = (re) => chaves.some(k => re.test(k));
  if (tem(/pix/)) out.push('Pix');
  if (tem(/credit|credito/)) out.push('Tarjeta de crédito');
  if (tem(/debit|debito/)) out.push('Tarjeta de débito');
  if (tem(/nfc|movel|mobile/)) out.push('Pago móvil');
  if (tem(/cheque|check/)) out.push('Cheque');
  return out.join(', ');
}

// =====================================================================
// FOTOS
// =====================================================================
function fotosDe(obj) {
  const urls = [];
  const varrer = (v, chave) => {
    if (typeof v === 'string') {
      if (/^https:\/\/[^ ]*(googleusercontent|ggpht)\.com\//.test(v) && !/logo|avatar|street_?view/i.test(chave || '')) urls.push(v);
    } else if (Array.isArray(v)) v.forEach(x => varrer(x, chave));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) varrer(x, k);
  };
  varrer(obj);
  return urls;
}

async function etapaFotos() {
  if (!ORCAMENTO) { console.error('\n  Diga o orçamento em fotos: --orcamento=2000 (500 por mês são grátis)\n'); process.exit(1); }
  const chave = chaveApi();
  const POR_LUGAR = Number(opt('por-lugar', 4));
  const sel = lerJSON(ARQ_SELECAO, null);
  if (!sel) { console.error('\n  Rode "revisar" antes: as fotos extras são só para os escolhidos.\n'); process.exit(1); }
  const ids = new Set(categoriasFiltradas().map(c => c.id));
  const alvo = sel.itens
    .filter(i => ids.has(i.dados.categoria) && i.placeId && !fs.existsSync(path.join(DIR_FOTOS, i.placeId + '.json')))
    .sort((a, b) => b.puntaje - a.puntaje);
  console.log(`\n=== FOTOS === ${alvo.length} fornecedores sem fotos extras · ${POR_LUGAR} por fornecedor · orçamento ${ORCAMENTO} fotos\n`);
  const LOTE = 20;
  let gastas = 0;
  for (let i = 0; i < alvo.length; i += LOTE) {
    const lote = alvo.slice(i, i + LOTE);
    if (gastas + lote.length * POR_LUGAR > ORCAMENTO) { console.log(`\n  Parei no orçamento (${gastas} fotos). Faltam ${alvo.length - i}.`); break; }
    const env = await chamar('/maps/photos-v3', {
      query: lote.map(x => x.placeId), photosLimit: POR_LUGAR, limit: 1, tag: 'all', language: 'pt', region: 'BR', async: 'true',
    }, chave);
    const dados = await aguardar(env.id, chave);
    let n = 0;
    lote.forEach((x, j) => {
      const urls = [...new Set(fotosDe(dados[j]))].slice(0, POR_LUGAR);
      n += urls.length;
      gravarJSON(path.join(DIR_FOTOS, x.placeId + '.json'), { urls, em: new Date().toISOString() });
    });
    gastas += n;
    registrarGasto('fotos', n);
    console.log(`  ${i + lote.length}/${alvo.length}  +${n} fotos (total ${gastas})`);
  }
  console.log('\n  Rode "revisar" de novo para juntar as fotos, depois "gravar".\n');
}

// =====================================================================
// FIRESTORE
// =====================================================================
function firestore() {
  const CHAVE = path.join(RAIZ, 'scripts', 'serviceAccount.json');
  if (!fs.existsSync(CHAVE)) { console.error('\n  Falta scripts/serviceAccount.json (ver rehospedar-fotos.js)\n'); process.exit(1); }
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = getApps()[0] || initializeApp({ credential: cert(require(CHAVE)) });
  const db = getFirestore(app);
  db.settings({ preferRest: true }); // o gRPC trava em algumas redes Windows
  return db;
}

const googleIdDoLink = (u) => (String(u || '').match(/(0x[0-9a-f]+:0x[0-9a-f]+)/i) || [])[1] || '';
const nomeChave = (s) => sem(s).replace(/[^a-z0-9]/g, '');

async function indiceDaBase(db) {
  const snap = await db.collection('proveedores').get();
  const porGid = new Map(), porTel = new Map(), porNome = new Map();
  for (const d of snap.docs) {
    const p = d.data();
    const gid = p.googleId || googleIdDoLink(p.googleMaps);
    if (gid) porGid.set(gid, d.id);
    const tel = normTel(p.whatsapp);
    if (tel) porTel.set(tel, d.id);
    porNome.set(nomeChave(p.nombre), d.id);
  }
  return { docs: new Map(snap.docs.map(d => [d.id, d.data()])), porGid, porTel, porNome };
}

// =====================================================================
// REVISAR: escolhe, pontua e cruza com a base
// =====================================================================
const UF = { 'sao paulo': 'SP', parana: 'PR', 'rio de janeiro': 'RJ', 'minas gerais': 'MG', goias: 'GO', pernambuco: 'PE', ceara: 'CE', 'santa catarina': 'SC', 'rio grande do sul': 'RS', 'mato grosso do sul': 'MS', 'espirito santo': 'ES', bahia: 'BA', 'distrito federal': 'DF' };
const ufDe = (l) => l.state_code || UF[sem(l.state)] || '';

function montar(c, redes) {
  const l = c.lugar;
  const site = String(l.website || l.site || '');
  const doSite = redes[site] || {};
  const doLugar = socialDoLugar(l);
  const daUrl = socialDe(site); // às vezes o "site" no Google É o Instagram
  const instagram = daUrl.instagram || doLugar.instagram || doSite.instagram || '';
  const facebook = daUrl.facebook || doLugar.facebook || doSite.facebook || '';
  const whatsapp = melhorTelefone(l, { whatsapp: daUrl.whatsapp || doSite.whatsapp || doLugar.whatsapp });
  const extras = l.place_id ? lerJSON(path.join(DIR_FOTOS, l.place_id + '.json'), { urls: [] }).urls : [];
  const fotos = [...new Set([l.photo, ...extras].filter(Boolean))].slice(0, 6);
  const reviews = Number(l.reviews || 0), rating = Number(l.rating || 0);
  const tipo = c.fabrica ? 'Fábrica' : /distribui/.test(textoDo(l)) ? 'Distribuidora' : 'Mayorista';
  const cidade = l.city || '';
  const uf = ufDe(l);
  const onde = cidade ? ` en ${cidade}${uf ? ` (${uf})` : ''}` : '';
  const nota = rating ? ` · ${rating}★ (${reviews} reseñas)` : '';

  // Pontuação: o pedido é priorizar foto + Instagram + Facebook + WhatsApp
  let pts = 0;
  if (instagram) pts += 3;
  if (facebook) pts += 2;
  if (ehCelular(whatsapp)) pts += 3; else if (whatsapp) pts += 1;
  if (fotos.length) pts += 1;
  if (Number(l.photos_count || 0) >= 10) pts += 1;
  if (site && !daUrl.instagram && !daUrl.facebook) pts += 1;
  if (rating >= 4.2 && reviews >= 10) pts += 1;
  if (l.verified) pts += 1;
  if (c.fabrica) pts += 2;
  pts += Math.min(2, c.relev);

  return {
    placeId: l.place_id || '',
    googleId: l.google_id || '',
    puntaje: pts,
    // Fábrica pouco conhecida (poucas avaliações) = "Secreto" no site
    secreto: c.fabrica && reviews < 30,
    dados: {
      nombre: String(l.name).trim(),
      categoria: c.cat,
      whatsapp,
      instagram,
      facebook,
      direccion: String(l.address || l.full_address || '').trim(),
      googleMaps: String(l.location_link || '').trim(),
      rangoPrecio: '',
      pedidoMinimo: '',
      cantidadMinima: '',
      enviaParaguay: false,
      formaPago: formasPago(l.about),
      catalogo: daUrl.instagram || daUrl.facebook ? '' : site,
      esTendencia: false,
      observaciones: `${tipo}${onde}${nota}`,
      fotos,
      video: '',
    },
  };
}

async function etapaRevisar() {
  const cats = categoriasFiltradas();
  const redes = lerJSON(ARQ_REDES, {});
  const cands = lerCandidatos(cats);
  console.log(`\n=== REVISAR === ${cands.length} fornecedores únicos nas buscas já feitas\n`);
  const db = firestore();
  const base = await indiceDaBase(db);

  const itens = [];
  const vistosTel = new Set();
  for (const c of cands) {
    const it = montar(c, redes);
    if (!it.dados.whatsapp && !it.dados.instagram && !it.dados.catalogo) continue; // sem forma de contato
    const tel = it.dados.whatsapp;
    const existente = base.porGid.get(it.googleId) || (tel && base.porTel.get(tel)) || base.porNome.get(nomeChave(it.dados.nombre));
    if (!existente && tel && vistosTel.has(tel)) continue; // mesma empresa com duas fichas
    if (tel) vistosTel.add(tel);
    it.acao = existente ? 'atualizar' : 'novo';
    if (existente) it.id = existente;
    itens.push(it);
  }
  itens.sort((a, b) => b.puntaje - a.puntaje);
  gravarJSON(ARQ_SELECAO, { em: new Date().toISOString(), itens });

  // Relatório por categoria
  const atual = {}; for (const p of base.docs.values()) atual[p.categoria] = (atual[p.categoria] || 0) + 1;
  console.log('  categoria                   hoje  +novos  com IG  com FB  celular  foto  secretos');
  let tn = 0;
  const fracas = [];
  for (const cat of cats) {
    const its = itens.filter(i => i.dados.categoria === cat.id);
    const nov = its.filter(i => i.acao === 'novo');
    tn += nov.length;
    const final = (atual[cat.id] || 0) + nov.length;
    if (final < 25) fracas.push(`${cat.id} (${final})`);
    if (!its.length && !atual[cat.id]) continue;
    const q = (f) => String(its.filter(f).length).padStart(6);
    console.log(`  ${cat.id.padEnd(26)} ${String(atual[cat.id] || 0).padStart(5)} ${String(nov.length).padStart(7)} ${q(i => i.dados.instagram)}  ${q(i => i.dados.facebook)}  ${q(i => ehCelular(i.dados.whatsapp))}  ${q(i => i.dados.fotos.length)}  ${q(i => i.secreto)}`);
  }
  const atualiz = itens.filter(i => i.acao === 'atualizar').length;
  console.log(`\n  NOVOS: ${tn}   já existentes que serão completados: ${atualiz}`);
  console.log(`  base hoje ${base.docs.size} → depois de gravar ${base.docs.size + tn}`);
  if (fracas.length) console.log(`\n  Categorias que ficariam com menos de 25: ${fracas.join(', ')}`);

  // Planilha para conferir (abre no Excel / cola no Sheets)
  const H = ['acao', 'puntaje', 'secreto', 'categoria', 'nombre', 'whatsapp', 'instagram', 'facebook', 'catalogo', 'direccion', 'observaciones', 'fotos', 'googleMaps'];
  const linhas = [H.join('\t'), ...itens.map(i => H.map(h => {
    const v = h in i ? i[h] : i.dados[h];
    return String(Array.isArray(v) ? v.length : v ?? '').replace(/[\t\r\n]+/g, ' ');
  }).join('\t'))];
  fs.writeFileSync(path.join(DADOS, 'revisao.tsv'), '﻿' + linhas.join('\n'), 'utf8');
  console.log(`\n  Planilha: ${path.join(DADOS, 'revisao.tsv')}`);
  console.log('  Próximo passo: gravar (simulação) e depois gravar --aplicar\n');
}

// =====================================================================
// GRAVAR
// =====================================================================
async function etapaGravar() {
  const sel = lerJSON(ARQ_SELECAO, null);
  if (!sel) { console.error('\n  Rode "revisar" antes.\n'); process.exit(1); }
  const ids = new Set(categoriasFiltradas().map(c => c.id));
  const itens = sel.itens.filter(i => ids.has(i.dados.categoria));
  const db = firestore();
  const { FieldValue } = require('firebase-admin/firestore');
  const base = await indiceDaBase(db);
  const nossa = (u) => String(u).includes('firebasestorage.googleapis.com');

  let novos = 0, atualizados = 0, intactos = 0;
  const tocados = [];
  let batch = db.batch(), n = 0;
  const commits = [];
  const flush = () => { commits.push(batch.commit()); batch = db.batch(); n = 0; };

  for (const it of itens) {
    if (it.acao === 'novo') {
      const ref = db.collection('proveedores').doc();
      batch.set(ref, {
        ...it.dados, esSecreto: it.secreto, completo: false, vistaPrevia: false,
        googleId: it.googleId, placeId: it.placeId, puntaje: it.puntaje, fonte: 'outscraper',
        actualizadoEn: FieldValue.serverTimestamp(),
      });
      novos++; tocados.push(ref.id);
    } else {
      const atual = base.docs.get(it.id);
      if (!atual) continue;
      // Só preenche o que está vazio. Nunca troca categoria, nome, Online/Off
      // nem o que o admin escreveu à mão. Fotos: troca só as que não são nossas
      // (essas são os links do Google que já expiraram).
      const upd = {};
      for (const k of ['whatsapp', 'instagram', 'facebook', 'direccion', 'googleMaps', 'formaPago', 'catalogo', 'observaciones']) {
        if (!atual[k] && it.dados[k]) upd[k] = it.dados[k];
      }
      const fotosAtuais = Array.isArray(atual.fotos) ? atual.fotos : [];
      if (it.dados.fotos.length && !fotosAtuais.some(nossa)) upd.fotos = it.dados.fotos;
      if (!atual.googleId && it.googleId) upd.googleId = it.googleId;
      if (!atual.placeId && it.placeId) upd.placeId = it.placeId;
      if (!Object.keys(upd).length) { intactos++; continue; }
      upd.actualizadoEn = FieldValue.serverTimestamp();
      batch.update(db.collection('proveedores').doc(it.id), upd);
      atualizados++; if (upd.fotos) tocados.push(it.id);
    }
    if (++n >= 400) flush();
  }

  console.log(`\n=== GRAVAR ${APLICAR ? '(APLICANDO)' : '(simulação — nada é gravado)'} ===`);
  console.log(`  novos: ${novos}   completados: ${atualizados}   sem nada a completar: ${intactos}`);
  if (!APLICAR) { console.log('\n  Para gravar de verdade: ... gravar --aplicar\n'); return; }

  if (n) flush();
  await Promise.all(commits);
  console.log('  gravado no Firestore.');

  await atualizarStats(db);

  const arqIds = path.join(DADOS, 'ultimos-gravados.json');
  gravarJSON(arqIds, tocados);
  console.log(`\n  Re-hospedando as fotos de ${tocados.length} fornecedores (os links do Google expiram)…\n`);
  require('child_process').execFileSync(process.execPath,
    [path.join(RAIZ, 'scripts', 'rehospedar-fotos.js'), '--aplicar', `--ids=${arqIds}`, '--max-fotos=6'],
    { stdio: 'inherit' });
}

// Mesmos números que o admin publica ao abrir /admin/proveedores (config/stats),
// para a landing mostrar o total novo sem esperar alguém abrir o admin.
async function atualizarStats(db) {
  const [snap, cfg] = await Promise.all([db.collection('proveedores').get(), db.doc('config/categorias').get()]);
  const lista = (cfg.exists && cfg.data().lista) || [];
  const counts = {};
  snap.docs.forEach(d => { const c = d.data().categoria; counts[c] = (counts[c] || 0) + 1; });
  const ordem = [], porGrupo = {};
  for (const c of lista) {
    const g = c.grupo || 'Otros';
    if (!(g in porGrupo)) { porGrupo[g] = 0; ordem.push(g); }
    porGrupo[g] += counts[c.id] || 0;
  }
  const grupos = ordem.map(g => ({ nombre: g, total: porGrupo[g] })).filter(g => g.total > 0);
  await db.doc('config/stats').set({ proveedores: snap.size, categorias: Object.keys(counts).length, grupos, updatedAt: Date.now() });
  console.log(`  config/stats: ${snap.size} fornecedores em ${Object.keys(counts).length} categorias.`);
}

// =====================================================================
const ETAPAS = { plano: etapaPlano, buscar: etapaBuscar, redes: etapaRedes, fotos: etapaFotos, revisar: etapaRevisar, gravar: etapaGravar };
if (!ETAPAS[ETAPA]) {
  console.log('\n  Uso: node scripts/outscraper/outscraper.js <plano|buscar|redes|fotos|revisar|gravar> [opções]');
  console.log('  Detalhes no topo deste arquivo.\n');
  process.exit(1);
}
Promise.resolve(ETAPAS[ETAPA]()).then(() => process.exit(0)).catch(e => { console.error('\nFALHOU:', e.message); process.exit(1); });
