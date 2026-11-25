/*
 * OUTSCRAPER → MAYORISTA BRASIL
 * =============================
 *
 * Busca fornecedores no Google Maps pela API do Outscraper, completa as redes
 * sociais lendo o site de cada um, escolhe os melhores (prioridade para quem
 * tem foto, Instagram, Facebook e WhatsApp) e grava direto no Firestore.
 *
 * Etapas — rode nesta ordem. Só "buscar", "refrescar" e "fotos" gastam
 * créditos, e nunca mais que --usd nem mais que o SALDO da conta (a conta
 * aceita passar do saldo e cobra no cartão depois; o script não deixa).
 *
 *   plano      [filtro]               Quantas buscas e quanto custariam. Não chama a API.
 *   buscar     [filtro] --usd=5       Busca no Google Maps. Busca já feita nunca é paga de novo.
 *   recuperar  [filtro]               GRÁTIS. Se "buscar" caiu no meio, salva o que já foi pago
 *                                     (lê os pedidos antigos no Outscraper). Mesmas opções de volume.
 *   refrescar  [filtro] --usd=3.5 [--max=N]  Fornecedores QUE JÁ ESTÃO na base: consulta cada um pelo
 *                                     id do Google (1 registro cada) para trazer foto nova e
 *                                     dados atuais. Serve para consertar as fotos expiradas.
 *   redes      [filtro]               GRÁTIS. Abre o site de cada um e pega Instagram,
 *                                     Facebook e WhatsApp.
 *   fotos      [filtro] --usd=2 [--por-lugar=4]   Fotos extras dos escolhidos (opcional).
 *   galeria    [filtro] --usd=55 [--por-lugar=10] [--max=N] --aplicar
 *                                     Fotos do Google para TODOS os fornecedores da base, não só
 *                                     os novos. Baixa e hospeda no nosso Storage na hora e troca
 *                                     as fotos do fornecedor. Quem já tem galeria é pulado.
 *   revisar    [filtro]               Escolhe, pontua e cruza com a base. Relatório e
 *                                     planilha em dados/revisao.tsv. Não grava nada.
 *   gravar     [filtro] [--aplicar]   Grava (sem --aplicar é simulação), atualiza os números
 *                                     da landing e re-hospeda as fotos no nosso Storage na hora
 *                                     — os links de foto do Google expiram em poucos dias.
 *
 *   node scripts/outscraper/outscraper.js <etapa> [opções]
 *
 * Filtro:  --cat=jeans,tenis  |  --grupo=Moda  |  --vazias (só categorias sem nenhum
 *          fornecedor; vale para plano e buscar)
 * Volume:  --por-busca=40            empresas por busca (padrão 40)
 *          --por-categoria=20        OU: total por categoria, dividido entre as buscas dela
 *          --max-termos=2 --max-polos=1   modo econômico: só os primeiros termos/polos
 *                                     do plano (os melhores — a lista está em ordem)
 *
 * Precisa de OUTSCRAPER_API_KEY no .env.local e de scripts/serviceAccount.json.
 * Tudo que vem da API fica em scripts/outscraper/dados/ (fora do git).
 */

const fs = require('fs');
const path = require('path');
const { PLANO, POLOS_ATACADO, POLOS_INDUSTRIAIS, buscasDe } = require('./plano');
const { CATEGORIAS_LISTA } = require('./categorias-lista');

// ===== Opções =====
const [, , ETAPA, ...ARGS] = process.argv;
const opt = (nome, padrao) => {
  const a = ARGS.find(x => x.startsWith(`--${nome}=`));
  return a ? a.slice(nome.length + 3) : padrao;
};
const flag = (nome) => ARGS.includes(`--${nome}`);

const POR_BUSCA = Number(opt('por-busca', 40));
const POR_CATEGORIA = Number(opt('por-categoria', 0));
const MAX_TERMOS = Number(opt('max-termos', Infinity));
const MAX_POLOS = Number(opt('max-polos', Infinity));
const USD = Number(opt('usd', 0));
const APLICAR = flag('aplicar');

const RAIZ = path.join(__dirname, '..', '..');
const DADOS = path.join(__dirname, 'dados');
const DIR_BUSCAS = path.join(DADOS, 'buscas');
const DIR_BASE = path.join(DADOS, 'base');
const DIR_FOTOS = path.join(DADOS, 'fotos');
const ARQ_REDES = path.join(DADOS, 'redes.json');
const ARQ_GASTO = path.join(DADOS, 'gasto.json');
const ARQ_SELECAO = path.join(DADOS, 'selecionados.json');
for (const d of [DADOS, DIR_BUSCAS, DIR_BASE, DIR_FOTOS]) fs.mkdirSync(d, { recursive: true });

// Preços públicos do Outscraper (outscraper.com/pricing, nov/2026), em US$ por registro.
// Os 500 grátis do mês não entram na conta: se houver, sobra saldo.
const PRECO = { empresa: 3 / 1000, foto: 2 / 1000 };

const API = 'https://api.app.outscraper.com';

// ===== Utilidades =====
const lerJSON = (arq, padrao) => { try { return JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { return padrao; } };
const gravarJSON = (arq, obj) => fs.writeFileSync(arq, JSON.stringify(obj, null, 1));
const sem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const slug = (s) => sem(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const usd = (n) => 'US$ ' + n.toFixed(2);

function lerEnv() {
  const env = {};
  try {
    for (const linha of fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sem .env.local */ }
  return env;
}

function chaveApi() {
  const k = process.env.OUTSCRAPER_API_KEY || lerEnv().OUTSCRAPER_API_KEY;
  if (!k) {
    console.error('\n  Falta OUTSCRAPER_API_KEY no .env.local');
    console.error('  app.outscraper.cloud → API & Integrações → Chave de API. Cole assim no .env.local:');
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
  return lista.filter(c => PLANO[c.id]);
}

// Para decidir o que COMPRAR (plano/buscar): --vazias tira as que já têm fornecedor
async function categoriasParaComprar() {
  const lista = categoriasFiltradas();
  if (!flag('vazias')) return lista;
  const snap = await firestore().collection('proveedores').select('categoria').get();
  const com = new Set(snap.docs.map(d => d.get('categoria')));
  return lista.filter(c => !com.has(c.id));
}

// Buscas de uma categoria, já com o limite de empresas de cada uma
function buscasDaCat(id) {
  const bs = buscasDe(id, { maxTermos: MAX_TERMOS, maxPolos: MAX_POLOS });
  const limite = POR_CATEGORIA ? Math.max(5, Math.ceil(POR_CATEGORIA / bs.length)) : POR_BUSCA;
  return bs.map(b => ({ ...b, limite }));
}

const arqBusca = (b) => path.join(DIR_BUSCAS, `${b.cat}--${slug(b.query)}--${b.limite}.json`);
// Busca já feita com este limite ou com um limite maior serve
function buscaEmCache(b) {
  const prefixo = `${b.cat}--${slug(b.query)}--`;
  return fs.readdirSync(DIR_BUSCAS).some(f => f.startsWith(prefixo) && Number(f.slice(prefixo.length).replace('.json', '')) >= b.limite);
}

function registrarGasto(tipo, qtd, custo) {
  const g = lerJSON(ARQ_GASTO, { usd: 0, historico: [] });
  g.usd = (g.usd || 0) + custo;
  g[tipo] = (g[tipo] || 0) + qtd;
  g.historico.push({ tipo, qtd, usd: +custo.toFixed(4), em: new Date().toISOString() });
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
    await esperar(5000);
  }
}

const saldo = async (chave) => Number((await chamar('/profile/balance', {}, chave)).balance);

// Separa a resposta por busca. Sem dropDuplicates a API devolve uma lista por
// busca; com ele, uma lista única onde cada lugar diz de qual busca veio.
function agruparPorBusca(dados, lote) {
  if (dados.every(x => Array.isArray(x))) return lote.map((b, j) => (dados[j] || []).filter(Boolean));
  const m = new Map(lote.map(b => [sem(b.query), []]));
  let orfaos = 0;
  for (const l of dados.flat()) {
    if (!l) continue;
    const lista = m.get(sem(l.query));
    if (lista) lista.push(l); else orfaos++;
  }
  if (orfaos) console.warn(`  aviso: ${orfaos} lugares sem busca correspondente`);
  return lote.map(b => m.get(sem(b.query)));
}

// Para antes de passar do --usd ou do saldo da conta. O saldo do Outscraper
// atualiza com atraso de vários minutos, então vale o MAIOR entre a queda do
// saldo e a nossa própria conta (que ignora os 500 grátis — erra para menos).
async function cabe(chave, saldoInicial, teto, gastoRodada, proximo) {
  const s = await saldo(chave);
  const usado = Math.max(gastoRodada, saldoInicial - s);
  return usado + proximo <= teto && saldoInicial - usado - proximo > 0.02;
}

// Teto de gasto desta rodada: o menor entre --usd e o saldo da conta
async function tetoUsd(chave) {
  if (!USD) { console.error('\n  Diga quanto pode gastar nesta rodada: --usd=5\n'); process.exit(1); }
  const s = await saldo(chave);
  const teto = Math.min(USD, s - 0.02);
  console.log(`  saldo da conta ${usd(s)} · teto desta rodada ${usd(Math.max(0, teto))}`);
  if (teto <= 0) { console.log('\n  Sem saldo. Nada feito.\n'); process.exit(0); }
  return { teto, saldoInicial: s };
}

// =====================================================================
// PLANO
// =====================================================================
async function etapaPlano() {
  const cats = await categoriasParaComprar();
  let total = 0, pend = 0, maxEmpresas = 0;
  const porGrupo = {};
  for (const c of cats) {
    const bs = buscasDaCat(c.id);
    const p = bs.filter(b => !buscaEmCache(b));
    total += bs.length; pend += p.length;
    maxEmpresas += p.reduce((s, b) => s + b.limite, 0);
    const g = porGrupo[c.grupo] = porGrupo[c.grupo] || { cats: 0, buscas: 0, emp: 0 };
    g.cats++; g.buscas += p.length; g.emp += p.reduce((s, b) => s + b.limite, 0);
  }
  console.log('\n=== PLANO ===\n');
  for (const [g, v] of Object.entries(porGrupo)) {
    console.log(`  ${g.padEnd(22)} ${String(v.cats).padStart(3)} categorias  ${String(v.buscas).padStart(4)} buscas  até ${String(v.emp).padStart(5)} empresas`);
  }
  console.log(`\n  categorias: ${cats.length}   buscas: ${total} (${pend} ainda não feitas)`);
  console.log(`  no máximo ${maxEmpresas.toLocaleString('pt-BR')} empresas → até ${usd(maxEmpresas * PRECO.empresa)}\n`);
}

// =====================================================================
// BUSCAR
// =====================================================================
async function etapaBuscar() {
  const chave = chaveApi();
  const pend = (await categoriasParaComprar()).flatMap(c => buscasDaCat(c.id)).filter(b => !buscaEmCache(b));
  console.log(`\n=== BUSCAR === ${pend.length} buscas pendentes`);
  const { teto, saldoInicial } = await tetoUsd(chave);

  // O limite de empresas vale para o pedido inteiro, então cada lote só junta
  // buscas com o MESMO limite — misturar faria pagar 20 onde bastavam 10.
  const LOTE = 15;
  const lotes = [];
  const porLimite = {};
  pend.forEach(b => (porLimite[b.limite] = porLimite[b.limite] || []).push(b));
  for (const grupo of Object.values(porLimite)) for (let i = 0; i < grupo.length; i += LOTE) lotes.push(grupo.slice(i, i + LOTE));

  let gasto = 0, recebidas = 0, feitas = 0;
  for (const lote of lotes) {
    const limite = lote[0].limite;
    // Pior caso: todas as buscas do lote devolvem o limite cheio
    const pior = lote.length * limite * PRECO.empresa;
    if (!(await cabe(chave, saldoInicial, teto, gasto, pior))) { console.log(`\n  Parei no teto (${usd(teto)}). Faltam ${pend.length - feitas} buscas.`); break; }
    const env = await chamar('/maps/search-v3', {
      query: lote.map(b => b.query),
      organizationsPerQueryLimit: limite,
      language: 'pt', region: 'BR', dropDuplicates: 'true', async: 'true',
    }, chave);
    const dados = await aguardar(env.id, chave);
    let n = 0;
    agruparPorBusca(dados, lote).forEach((lugares, j) => {
      n += lugares.length;
      gravarJSON(arqBusca(lote[j]), { ...lote[j], em: new Date().toISOString(), pedido: env.id, lugares });
    });
    feitas += lote.length;
    gasto += n * PRECO.empresa; recebidas += n;
    registrarGasto('empresas', n, n * PRECO.empresa);
    console.log(`  ${String(feitas).padStart(4)}/${pend.length}  +${n} empresas  (${usd(gasto)})  ${lote[0].cat}…`);
  }
  console.log(`\n  Recebidas nesta rodada: ${recebidas} empresas ≈ ${usd(gasto)}. Saldo agora: ${usd(await saldo(chave))}\n`);
}

// =====================================================================
// RECUPERAR: resultados já pagos que não chegaram a ser salvos (o script caiu
// no meio, por exemplo). Ler pedidos antigos no Outscraper não é cobrado.
// Use as mesmas opções de volume da rodada de "buscar".
// =====================================================================
async function etapaRecuperar() {
  const chave = chaveApi();
  const porQuery = new Map(categoriasFiltradas().flatMap(c => buscasDaCat(c.id)).map(b => [sem(b.query), b]));
  const lista = await chamar('/requests', { type: 'finished' }, chave);
  let salvas = 0;
  for (const p of lista.items || []) {
    const r = await chamar(`/requests/${p.id}`, {}, chave);
    const grupos = new Map();
    for (const l of (r.data || []).flat().filter(Boolean)) {
      const b = porQuery.get(sem(l.query));
      if (b) (grupos.get(b) || grupos.set(b, []).get(b)).push(l);
    }
    for (const [b, lugares] of grupos) {
      if (lerJSON(arqBusca(b), { lugares: [] }).lugares.length) continue;
      gravarJSON(arqBusca(b), { ...b, em: new Date().toISOString(), pedido: p.id, lugares });
      salvas++;
    }
  }
  console.log(`\n=== RECUPERAR === ${lista.items?.length || 0} pedidos lidos · ${salvas} buscas recuperadas\n`);
}

// =====================================================================
// REFRESCAR: fornecedores que já estão na base, consultados um a um
// =====================================================================
const googleIdDoLink = (u) => (String(u || '').match(/(0x[0-9a-f]+:0x[0-9a-f]+)/i) || [])[1] || '';
const nossa = (u) => String(u).includes('firebasestorage.googleapis.com');

async function etapaRefrescar() {
  const chave = chaveApi();
  const ids = new Set(categoriasFiltradas().map(c => c.id));
  const snap = await firestore().collection('proveedores').get();
  // Só quem não tem nenhuma foto nossa (as do Google expiram) e ainda não foi consultado
  const alvo = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => ids.has(p.categoria) && !(p.fotos || []).some(nossa))
    .map(p => ({ id: p.id, cat: p.categoria, gid: p.googleId || googleIdDoLink(p.googleMaps) }))
    .filter(p => p.gid && !fs.existsSync(path.join(DIR_BASE, p.id + '.json')))
    .slice(0, Number(opt('max', Infinity)));
  console.log(`\n=== REFRESCAR === ${alvo.length} fornecedores da base para consultar`);
  const { teto, saldoInicial } = await tetoUsd(chave);

  const LOTE = 50;
  let gasto = 0, achados = 0;
  for (let i = 0; i < alvo.length; i += LOTE) {
    const lote = alvo.slice(i, i + LOTE);
    if (!(await cabe(chave, saldoInicial, teto, gasto, lote.length * PRECO.empresa))) { console.log(`\n  Parei no teto (${usd(teto)}). Faltam ${alvo.length - i}.`); break; }
    const env = await chamar('/maps/search-v3', {
      query: lote.map(p => p.gid), organizationsPerQueryLimit: 1, language: 'pt', region: 'BR', async: 'true',
    }, chave);
    const dados = await aguardar(env.id, chave);
    let n = 0;
    lote.forEach((p, j) => {
      const res = (Array.isArray(dados[j]) ? dados[j] : [dados[j]]).filter(Boolean);
      n += res.length;
      // Confere que voltou o MESMO lugar
      const lugar = res.find(l => l.google_id === p.gid) || null;
      if (lugar) achados++;
      gravarJSON(path.join(DIR_BASE, p.id + '.json'), { docId: p.id, cat: p.cat, gid: p.gid, lugar, em: new Date().toISOString() });
    });
    gasto += n * PRECO.empresa;
    registrarGasto('refrescar', n, n * PRECO.empresa);
    console.log(`  ${String(i + lote.length).padStart(4)}/${alvo.length}  achados ${achados}  (${usd(gasto)})`);
  }
  console.log(`\n  Achados: ${achados}. Saldo agora: ${usd(await saldo(chave))}\n`);
}

// =====================================================================
// LEITURA DOS RESULTADOS + FILTRO DE FORNECEDOR
// =====================================================================
const RE_FORNECEDOR = /atacad|distribui|fabric|industri|confec|importad|fornecedor|representac|faccao|malharia|tecelagem|wholesale|manufactur|supplier/;
const RE_FABRICA = /fabrica|fabricante|industri|confeccao|faccao|malharia|tecelagem|manufactur/;
// Tipos do Google que nunca são fornecedor (serviço ou varejo de bairro)
const RE_NAO_FORNECEDOR = /^(restaurante|lanchonete|igreja|escola|banco|hospital|hotel|pousada|academia de|farmacia|supermercado|posto de|bar$|padaria$|clinica|salao de beleza|barbearia$|oficina|estacionamento|assistencia tecnica|servico de (reparo|conserto|troca)|reparo|conserto|troca de oleo|auto ?center|borracharia|lava.?jato)/;

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
  // 1) Os que já estão na base (refrescar): entram sem filtro, para atualizar
  for (const f of fs.readdirSync(DIR_BASE)) {
    const b = lerJSON(path.join(DIR_BASE, f), null);
    if (!b || !b.lugar || !ids.has(b.cat)) continue;
    porLugar.set(b.lugar.google_id || 'base:' + b.docId,
      { lugar: b.lugar, cat: b.cat, relev: 0, polo: '', fabrica: RE_FABRICA.test(textoDo(b.lugar)), idBase: b.docId });
  }
  // 2) Resultados das buscas
  const reserva = new Map();
  for (const f of fs.readdirSync(DIR_BUSCAS)) {
    const b = lerJSON(path.join(DIR_BUSCAS, f), null);
    if (!b || !ids.has(b.cat)) continue;
    const polo = POLOS_ATACADO.includes(b.polo) || POLOS_INDUSTRIAIS.includes(b.polo);
    for (const l of b.lugares || []) {
      if (!l.name) continue;
      if (l.business_status && l.business_status !== 'OPERATIONAL') continue;
      const chave = l.google_id || l.place_id || sem(l.name) + '|' + (l.phone || '');
      const atual = porLugar.get(chave);
      if (atual && atual.idBase) continue;
      const txt = textoDo(l);
      const fornecedor = RE_FORNECEDOR.test(txt);
      if (!fornecedor && RE_NAO_FORNECEDOR.test(sem(l.type || l.category || ''))) continue;
      const relev = palavrasCat[b.cat].filter(w => txt.includes(w)).length;
      const cand = { lugar: l, cat: b.cat, relev, polo: b.polo, fabrica: RE_FABRICA.test(txt) };
      // Fora dos polos, quem não se declara fornecedor fica na reserva
      if (!fornecedor && !polo) {
        if (relev > 0 && (!reserva.has(chave) || relev > reserva.get(chave).relev)) reserva.set(chave, cand);
        continue;
      }
      // O mesmo lugar aparece em várias categorias: fica onde combina mais
      if (!atual || relev > atual.relev) porLugar.set(chave, cand);
    }
  }
  // 3) Nenhuma categoria fica quase vazia: completa até MIN_POR_CAT com os
  //    melhores da reserva (vendem o produto, só não dizem "atacado")
  const conta = {};
  for (const c of porLugar.values()) conta[c.cat] = (conta[c.cat] || 0) + 1;
  const ordem = [...reserva.entries()].filter(([k]) => !porLugar.has(k))
    .sort((a, b) => b[1].relev - a[1].relev || Number(b[1].lugar.reviews || 0) - Number(a[1].lugar.reviews || 0));
  for (const [k, c] of ordem) {
    if ((conta[c.cat] || 0) >= MIN_POR_CAT) continue;
    porLugar.set(k, c);
    conta[c.cat] = (conta[c.cat] || 0) + 1;
  }
  return [...porLugar.values()];
}
const MIN_POR_CAT = 8;

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

// Junta o que o próprio Outscraper já trouxe em qualquer campo
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
  let d = String(t || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return '';
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
  if (typeof about === 'string') { try { about = JSON.parse(about); } catch { return ''; } }
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
// FOTOS EXTRAS (opcional, pago)
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
  const chave = chaveApi();
  const POR_LUGAR = Number(opt('por-lugar', 4));
  const sel = lerJSON(ARQ_SELECAO, null);
  if (!sel) { console.error('\n  Rode "revisar" antes: as fotos extras são só para os escolhidos.\n'); process.exit(1); }
  const ids = new Set(categoriasFiltradas().map(c => c.id));
  const alvo = sel.itens
    .filter(i => ids.has(i.dados.categoria) && i.placeId && !fs.existsSync(path.join(DIR_FOTOS, i.placeId + '.json')))
    .sort((a, b) => b.puntaje - a.puntaje);
  console.log(`\n=== FOTOS === ${alvo.length} fornecedores sem fotos extras · ${POR_LUGAR} por fornecedor`);
  const { teto, saldoInicial } = await tetoUsd(chave);
  const LOTE = 20;
  let gasto = 0;
  for (let i = 0; i < alvo.length; i += LOTE) {
    const lote = alvo.slice(i, i + LOTE);
    if (!(await cabe(chave, saldoInicial, teto, gasto, lote.length * POR_LUGAR * PRECO.foto))) { console.log(`\n  Parei no teto (${usd(teto)}). Faltam ${alvo.length - i}.`); break; }
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
    gasto += n * PRECO.foto;
    registrarGasto('fotos', n, n * PRECO.foto);
    console.log(`  ${i + lote.length}/${alvo.length}  +${n} fotos (${usd(gasto)})`);
  }
  console.log('\n  Rode "revisar" de novo para juntar as fotos, depois "gravar".\n');
}

// =====================================================================
// FIRESTORE
// =====================================================================
let _db = null;
function firestore() {
  if (_db) return _db;
  const CHAVE = path.join(RAIZ, 'scripts', 'serviceAccount.json');
  if (!fs.existsSync(CHAVE)) { console.error('\n  Falta scripts/serviceAccount.json (ver rehospedar-fotos.js)\n'); process.exit(1); }
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const app = getApps()[0] || initializeApp({ credential: cert(require(CHAVE)), storageBucket: BUCKET });
  _db = getFirestore(app);
  _db.settings({ preferRest: true }); // o gRPC trava em algumas redes Windows
  return _db;
}

const BUCKET = 'mayorista-brasil.firebasestorage.app';

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
  // O Google entrega a foto principal em 800x500; o mesmo link serve 1200x900 de graça
  const grande = (u) => String(u).replace(/=w\d+-h\d+-k-no$/, '=w1200-h900-k-no');
  const fotos = [...new Set([l.photo, ...extras].filter(Boolean).map(grande))].slice(0, 6);
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
  console.log(`\n=== REVISAR === ${cands.length} fornecedores únicos nos dados já baixados\n`);
  const db = firestore();
  const base = await indiceDaBase(db);

  const itens = [];
  const vistosTel = new Set();
  for (const c of cands) {
    const it = montar(c, redes);
    if (c.idBase) { itens.push({ ...it, acao: 'atualizar', id: c.idBase }); continue; }
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
  console.log('  categoria                   hoje  +novos  atualiz  com IG  com FB  celular  foto  secretos');
  let tn = 0;
  const vazias = [];
  for (const cat of cats) {
    const its = itens.filter(i => i.dados.categoria === cat.id);
    const nov = its.filter(i => i.acao === 'novo');
    tn += nov.length;
    if ((atual[cat.id] || 0) + nov.length === 0) vazias.push(cat.id);
    if (!its.length) continue;
    const q = (f) => String(its.filter(f).length).padStart(6);
    console.log(`  ${cat.id.padEnd(26)} ${String(atual[cat.id] || 0).padStart(5)} ${String(nov.length).padStart(7)} ${q(i => i.acao === 'atualizar')}   ${q(i => i.dados.instagram)}  ${q(i => i.dados.facebook)}  ${q(i => ehCelular(i.dados.whatsapp))}  ${q(i => i.dados.fotos.length)}  ${q(i => i.secreto)}`);
  }
  const atualiz = itens.filter(i => i.acao === 'atualizar').length;
  console.log(`\n  NOVOS: ${tn}   já existentes que serão atualizados: ${atualiz}`);
  console.log(`  base hoje ${base.docs.size} → depois de gravar ${base.docs.size + tn}`);
  if (vazias.length) console.log(`  Ainda vazias: ${vazias.length} (${vazias.slice(0, 12).join(', ')}${vazias.length > 12 ? '…' : ''})`);

  // Planilha para conferir (abre no Excel / cola no Sheets)
  const H = ['acao', 'puntaje', 'secreto', 'categoria', 'nombre', 'whatsapp', 'instagram', 'facebook', 'catalogo', 'direccion', 'observaciones', 'fotos', 'googleMaps'];
  const linhas = [H.join('\t'), ...itens.map(i => H.map(h => {
    const v = h in i ? i[h] : i.dados[h];
    return String(Array.isArray(v) ? v.length : v ?? '').replace(/[\t\r\n]+/g, ' ');
  }).join('\t'))];
  fs.writeFileSync(path.join(DADOS, 'revisao.tsv'), '﻿' + linhas.join('\n'), 'utf8');
  console.log(`\n  Planilha: ${path.join(DADOS, 'revisao.tsv')}\n`);
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
      novos++; if (it.dados.fotos.length) tocados.push(ref.id);
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
  console.log(`  novos: ${novos}   atualizados: ${atualizados}   sem nada a mudar: ${intactos}   com foto para hospedar: ${tocados.length}`);
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
// GALERIA: várias fotos do Google para CADA fornecedor da base, já
// hospedadas no nosso Storage na mesma hora (os links do Google expiram).
// =====================================================================
const DIR_GALERIA = path.join(DADOS, 'galeria');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36';

// Fotos de um lugar na resposta do /maps/photos-v3, sem repetir, em 1200x900
function galeriaDe(lugar, max) {
  const vistos = new Set(), urls = [];
  for (const f of (lugar && lugar.photos_data) || []) {
    const base = String(f.photo_url || '').replace(/=[^/]*$/, '');
    if (!base.startsWith('https://') || vistos.has(f.photo_id || base)) continue;
    vistos.add(f.photo_id || base);
    urls.push(base + '=w1200-h900-k-no');
    if (urls.length >= max) break;
  }
  if (!urls.length && lugar && lugar.photo) urls.push(String(lugar.photo).replace(/=w\d+-h\d+-k-no$/, '=w1200-h900-k-no'));
  return urls;
}

async function baixarFoto(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const tipo = r.headers.get('content-type') || '';
  if (!tipo.startsWith('image/')) throw new Error('não é imagem');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1024 || buf.length > 8 * 1024 * 1024) throw new Error('tamanho estranho');
  return { buf, tipo };
}

// Baixa, tira as repetidas (mesmo conteúdo) e sobe para proveedores/<id>/g<n>.jpg
async function hospedarGaleria(docId, urls) {
  const crypto = require('crypto');
  const { getStorage } = require('firebase-admin/storage');
  firestore();
  const bucket = getStorage().bucket();
  const baixadas = await Promise.all(urls.map(u => baixarFoto(u).catch(() => null)));
  const hashes = new Set(), finais = [];
  for (const b of baixadas) {
    if (!b) continue;
    const h = crypto.createHash('sha1').update(b.buf).digest('hex');
    if (hashes.has(h)) continue;
    hashes.add(h);
    finais.push(b);
  }
  return Promise.all(finais.map(async ({ buf, tipo }, i) => {
    const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : 'jpg';
    const destino = `proveedores/${docId}/g${i}.${ext}`;
    const token = crypto.randomUUID();
    await bucket.file(destino).save(buf, {
      resumable: false,
      metadata: { contentType: tipo, cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } },
    });
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destino)}?alt=media&token=${token}`;
  }));
}

async function etapaGaleria() {
  const chave = chaveApi();
  const POR_LUGAR = Number(opt('por-lugar', 10));
  fs.mkdirSync(DIR_GALERIA, { recursive: true });
  const ids = new Set(categoriasFiltradas().map(c => c.id));
  const db = firestore();
  const snap = await db.collection('proveedores').get();
  const todos = snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }))
    .filter(p => ids.has(p.categoria) && p.placeId && !p.galeriaEm);
  // Primeiro quem está sem foto nossa (quebrada ou nenhuma)
  todos.sort((a, b) => Number((a.fotos || []).some(nossa)) - Number((b.fotos || []).some(nossa)));
  const alvo = todos.slice(0, Number(opt('max', Infinity)));

  // Só troca as fotos quando alguma nova deu certo; senão mantém as atuais
  let hospedados = 0, semNovas = 0, totalFotos = 0;
  async function aplicar(p, urls) {
    if (!APLICAR) { semNovas += urls.length ? 0 : 1; return; }
    const novas = urls.length ? await hospedarGaleria(p.id, urls) : [];
    const upd = { galeriaEm: Date.now() };
    if (novas.length) { upd.fotos = novas; hospedados++; totalFotos += novas.length; } else semNovas++;
    await p.ref.update(upd);
  }

  // 1) Grátis: galerias já pagas que ficaram sem gravar (o script caiu no meio)
  const doCache = alvo.filter(p => fs.existsSync(path.join(DIR_GALERIA, p.id + '.json')));
  const novos = alvo.filter(p => !doCache.includes(p));
  console.log(`\n=== GALERIA === ${alvo.length} fornecedores · ${POR_LUGAR} fotos cada · ${doCache.length} já pagos no cache`);
  console.log(`  custo máximo: ${usd(novos.length * POR_LUGAR * PRECO.foto)}`);
  if (!APLICAR) { console.log('  SIMULAÇÃO: nada foi buscado nem gravado. Use --aplicar.\n'); return; }
  for (const p of doCache) await aplicar(p, lerJSON(path.join(DIR_GALERIA, p.id + '.json'), { urls: [] }).urls);

  // 2) Pago
  if (!novos.length) { console.log('\n  Nada a buscar.\n'); return; }
  const { teto, saldoInicial } = await tetoUsd(chave);
  const LOTE = 20;
  let gasto = 0;
  for (let i = 0; i < novos.length; i += LOTE) {
    const lote = novos.slice(i, i + LOTE);
    if (!(await cabe(chave, saldoInicial, teto, gasto, lote.length * POR_LUGAR * PRECO.foto))) { console.log(`\n  Parei no teto (${usd(teto)}). Faltam ${novos.length - i}.`); break; }
    const env = await chamar('/maps/photos-v3', {
      query: lote.map(p => p.placeId), photosLimit: POR_LUGAR, limit: 1, tag: 'all', language: 'pt', region: 'BR', async: 'true',
    }, chave);
    const dados = (await aguardar(env.id, chave)).flat().filter(Boolean);
    const porPlace = new Map(dados.map(l => [l.place_id, l]));
    let n = 0;
    for (const p of lote) {
      const urls = galeriaDe(porPlace.get(p.placeId), POR_LUGAR);
      n += urls.length;
      gravarJSON(path.join(DIR_GALERIA, p.id + '.json'), { placeId: p.placeId, urls, em: new Date().toISOString() });
    }
    gasto += n * PRECO.foto;
    registrarGasto('fotos', n, n * PRECO.foto);
    await Promise.all(lote.map(p => aplicar(p, lerJSON(path.join(DIR_GALERIA, p.id + '.json'), { urls: [] }).urls)));
    console.log(`  ${String(i + lote.length).padStart(4)}/${novos.length}  +${n} fotos  (${usd(gasto)})  com galeria nova ${hospedados}`);
  }
  console.log(`\n  Com galeria nova: ${hospedados} (${totalFotos} fotos) · sem foto nova: ${semNovas}. Saldo: ${usd(await saldo(chave))}\n`);
}

// =====================================================================
const ETAPAS = { plano: etapaPlano, buscar: etapaBuscar, recuperar: etapaRecuperar, refrescar: etapaRefrescar, redes: etapaRedes, fotos: etapaFotos, galeria: etapaGaleria, revisar: etapaRevisar, gravar: etapaGravar };
if (!ETAPAS[ETAPA]) {
  console.log('\n  Uso: node scripts/outscraper/outscraper.js <plano|buscar|recuperar|refrescar|redes|fotos|galeria|revisar|gravar> [opções]');
  console.log('  Detalhes no topo deste arquivo.\n');
  process.exit(1);
}
Promise.resolve(ETAPAS[ETAPA]()).then(() => process.exit(0)).catch(e => { console.error('\nFALHOU:', e.message); process.exit(1); });
