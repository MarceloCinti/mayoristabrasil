/*
 * PLANO DE BUSCAS DO OUTSCRAPER
 * =============================
 *
 * Para cada categoria do site: o que procurar (termos) e onde (polos).
 * Cada termo é combinado com cada polo e vira uma busca no Google Maps:
 *   "fábrica de jeans" × "Toritama, PE"  →  "fábrica de jeans, Toritama, PE"
 *
 * Os termos misturam três tipos de fornecedor, de propósito:
 *   - atacado / distribuidora: quem vende para revendedor;
 *   - fábrica / fabricante / confecção: a "fonte escondida", que não aparece
 *     andando na rua. Essas viram "Secretos" no site (ver outscraper.js).
 *
 * Os polos são as cidades/ruas onde cada segmento realmente se concentra no
 * Brasil (ex.: calçado em Franca e Nova Serrana, bonés em Apucarana). Quando
 * uma categoria não tem polo próprio, usa POLOS_PADRAO: São Paulo e o Paraná
 * perto da fronteira, por onde o revendedor paraguaio passa.
 *
 * Mexer aqui é seguro: o script guarda o resultado de cada busca e nunca paga
 * duas vezes pela mesma. Busca nova = só a parte nova é cobrada.
 */

// Ruas e bairros onde praticamente toda loja vende no atacado. Lá aceitamos
// lojas mesmo sem a palavra "atacado" no cadastro do Google.
const POLOS_ATACADO = [
  'Brás, São Paulo, SP',
  'Bom Retiro, São Paulo, SP',
  'Rua 25 de Março, São Paulo, SP',
  'Rua Santa Ifigênia, São Paulo, SP',
  'Rua Florêncio de Abreu, São Paulo, SP',
  'Rua Paula Souza, São Paulo, SP',
  'Rua São Caetano, São Paulo, SP',
  'Rua General Osório, São Paulo, SP',
  'Região da 44, Goiânia, GO',
  'Moda Center Santa Cruz, Santa Cruz do Capibaribe, PE',
];

// Cidades que SÃO o polo industrial do segmento: lá quase todo cadastro é
// fábrica ou ponta de fábrica, mesmo que no Google apareça como "Moveleiro"
// ou "Loja de cama, mesa e banho". Também são aceitas sem a palavra "atacado".
const POLOS_INDUSTRIAIS = [
  'Toritama, PE', 'Santa Cruz do Capibaribe, PE', 'Caruaru, PE', 'Cianorte, PR', 'Terra Roxa, PR',
  'Franca, SP', 'Birigui, SP', 'Jaú, SP', 'Nova Serrana, MG', 'Novo Hamburgo, RS', 'Apucarana, PR',
  'Limeira, SP', 'Guaporé, RS', 'Juazeiro do Norte, CE', 'Nova Friburgo, RJ', 'Juruaia, MG',
  'Ibitinga, SP', 'Brusque, SC', 'Blumenau, SC', 'Americana, SP', 'Jaraguá do Sul, SC',
  'Santa Gertrudes, SP', 'Criciúma, SC', 'Ubá, MG', 'Bento Gonçalves, RS', 'Arapongas, PR',
  'São Bento do Sul, SC', 'Holambra, SP', 'Cabo Frio, RJ',
];

const POLOS_PADRAO = ['São Paulo, SP', 'Curitiba, PR', 'Cascavel, PR', 'Foz do Iguaçu, PR'];
const POLOS_AGRO = ['Cascavel, PR', 'Toledo, PR', 'Maringá, PR', 'Dourados, MS', 'Campo Grande, MS', 'Ribeirão Preto, SP'];
const POLOS_MOVEIS = ['Ubá, MG', 'Bento Gonçalves, RS', 'Arapongas, PR', 'São Bento do Sul, SC', 'São Paulo, SP'];
const POLOS_ELETRONICOS = ['Rua Santa Ifigênia, São Paulo, SP', 'Rua 25 de Março, São Paulo, SP', 'São Paulo, SP', 'Foz do Iguaçu, PR', 'Curitiba, PR'];
const POLOS_FESTAS = ['Rua 25 de Março, São Paulo, SP', 'São Paulo, SP', 'Curitiba, PR', 'Foz do Iguaçu, PR'];
const POLOS_CAMA_MESA_BANHO = ['Ibitinga, SP', 'Brusque, SC', 'Blumenau, SC', 'Brás, São Paulo, SP'];
const POLOS_CERAMICA = ['Santa Gertrudes, SP', 'Criciúma, SC', 'São Paulo, SP', 'Curitiba, PR'];
const POLOS_GASTRONOMIA = ['Rua Paula Souza, São Paulo, SP', 'São Paulo, SP', 'Curitiba, PR', 'Cascavel, PR'];

// id da categoria → { termos, polos }   (polos omitido = POLOS_PADRAO)
const PLANO = {
  // ===== MODA =====
  femenino: { termos: ['atacado moda feminina', 'fábrica de roupas femininas', 'confecção feminina atacado'],
    polos: ['Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP', 'Região da 44, Goiânia, GO', 'Fortaleza, CE', 'Cianorte, PR', 'Maringá, PR'] },
  masculino: { termos: ['atacado moda masculina', 'fábrica de camisetas masculinas', 'confecção masculina atacado'],
    polos: ['Brás, São Paulo, SP', 'Região da 44, Goiânia, GO', 'Cianorte, PR', 'Fortaleza, CE'] },
  infantil: { termos: ['atacado moda infantil', 'fábrica de roupa infantil'],
    polos: ['Brás, São Paulo, SP', 'Cianorte, PR', 'Terra Roxa, PR', 'Região da 44, Goiânia, GO', 'Santa Cruz do Capibaribe, PE'] },
  'moda-bebe': { termos: ['atacado moda bebê', 'fábrica de roupa de bebê', 'enxoval de bebê atacado'],
    polos: ['Terra Roxa, PR', 'Brás, São Paulo, SP', 'Ibitinga, SP'] },
  fitness: { termos: ['atacado moda fitness', 'fábrica de roupa fitness', 'confecção moda fitness'],
    polos: ['Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP', 'Região da 44, Goiânia, GO', 'Fortaleza, CE', 'Cianorte, PR'] },
  'moda-praia': { termos: ['atacado moda praia', 'fábrica de biquíni', 'confecção moda praia'],
    polos: ['Cabo Frio, RJ', 'Rio de Janeiro, RJ', 'Brás, São Paulo, SP', 'Fortaleza, CE'] },
  'ropa-intima': { termos: ['atacado moda íntima', 'fábrica de lingerie', 'confecção de lingerie'],
    polos: ['Nova Friburgo, RJ', 'Juruaia, MG', 'Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP'] },
  'plus-size': { termos: ['atacado moda plus size', 'fábrica moda plus size'],
    polos: ['Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP', 'Região da 44, Goiânia, GO'] },
  evangelica: { termos: ['atacado moda evangélica', 'fábrica moda evangélica'],
    polos: ['Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP', 'Região da 44, Goiânia, GO'] },
  streetwear: { termos: ['atacado streetwear', 'fábrica de camisetas streetwear', 'confecção streetwear'],
    polos: ['Brás, São Paulo, SP', 'São Paulo, SP', 'Rio de Janeiro, RJ'] },
  jeans: { termos: ['atacado jeans', 'fábrica de jeans', 'confecção de jeans'],
    polos: ['Toritama, PE', 'Santa Cruz do Capibaribe, PE', 'Caruaru, PE', 'Brás, São Paulo, SP', 'Cianorte, PR', 'Região da 44, Goiânia, GO'] },
  tenis: { termos: ['atacado calçados', 'fábrica de calçados', 'atacado tênis'],
    polos: ['Franca, SP', 'Birigui, SP', 'Jaú, SP', 'Nova Serrana, MG', 'Novo Hamburgo, RS', 'Brás, São Paulo, SP'] },
  bolsas: { termos: ['atacado bolsas', 'fábrica de bolsas'],
    polos: ['Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP', 'Rua 25 de Março, São Paulo, SP', 'Franca, SP', 'Região da 44, Goiânia, GO'] },
  mochilas: { termos: ['atacado mochilas', 'fábrica de mochilas'],
    polos: ['Rua 25 de Março, São Paulo, SP', 'Brás, São Paulo, SP', 'São Paulo, SP', 'Curitiba, PR'] },
  gorras: { termos: ['atacado bonés', 'fábrica de bonés'],
    polos: ['Apucarana, PR', 'Brás, São Paulo, SP', 'São Paulo, SP'] },
  lentes: { termos: ['atacado óculos', 'distribuidora de óculos', 'atacado óculos de sol'],
    polos: ['Rua 25 de Março, São Paulo, SP', 'Brás, São Paulo, SP', 'São Paulo, SP', 'Curitiba, PR'] },
  bijuterias: { termos: ['atacado bijuterias', 'fábrica de bijuterias'],
    polos: ['Limeira, SP', 'Rua 25 de Março, São Paulo, SP', 'Brás, São Paulo, SP'] },
  joias: { termos: ['fábrica de joias', 'atacado de joias'],
    polos: ['Guaporé, RS', 'Limeira, SP', 'São Paulo, SP'] },
  semijoias: { termos: ['fábrica de semijoias', 'atacado semijoias folheadas'],
    polos: ['Limeira, SP', 'Juazeiro do Norte, CE', 'São Paulo, SP'] },
  relojes: { termos: ['atacado relógios', 'distribuidora de relógios'],
    polos: ['Rua 25 de Março, São Paulo, SP', 'Rua Santa Ifigênia, São Paulo, SP', 'São Paulo, SP'] },
  'carteras-femeninas': { termos: ['atacado carteiras femininas', 'fábrica de carteiras de couro'],
    polos: ['Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP', 'Franca, SP'] },
  'atacado-premium': { termos: ['atacado moda premium', 'showroom atacado moda', 'atacado grife'],
    polos: ['Bom Retiro, São Paulo, SP', 'Brás, São Paulo, SP', 'Região da 44, Goiânia, GO'] },
  'moda-barata': { termos: ['atacado roupas baratas', 'feira da madrugada atacado', 'roupas por peso atacado'],
    polos: ['Brás, São Paulo, SP', 'Região da 44, Goiânia, GO', 'Caruaru, PE', 'Moda Center Santa Cruz, Santa Cruz do Capibaribe, PE', 'Fortaleza, CE'] },
  textil: { termos: ['atacado de tecidos', 'aviamentos atacado', 'malharia atacado'],
    polos: ['Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP', 'Americana, SP', 'Brusque, SC', 'Blumenau, SC', 'Jaraguá do Sul, SC'] },

  // ===== COSMÉTICOS E BELEZA =====
  cosmeticos: { termos: ['distribuidora de cosméticos', 'atacado de cosméticos', 'fábrica de cosméticos'] },
  maquiagem: { termos: ['atacado maquiagem', 'distribuidora de maquiagem'],
    polos: ['Rua 25 de Março, São Paulo, SP', 'Brás, São Paulo, SP', 'São Paulo, SP', 'Curitiba, PR', 'Foz do Iguaçu, PR'] },
  perfumes: { termos: ['atacado perfumes', 'distribuidora de perfumes', 'fábrica de perfumes'] },
  cabelo: { termos: ['distribuidora produtos para cabelo', 'fábrica de cosméticos capilares'] },
  barbear: { termos: ['distribuidora produtos para barbearia', 'atacado produtos de barbear'] },
  esmaltes: { termos: ['atacado esmaltes', 'distribuidora produtos para manicure'] },
  'equip-salao': { termos: ['distribuidora equipamentos para salão de beleza', 'atacado equipamentos de estética'] },
  'moveis-salao': { termos: ['fábrica de móveis para salão de beleza', 'fábrica de cadeiras para barbearia'] },

  // ===== CASA =====
  'utilidades-domesticas': { termos: ['atacado utilidades domésticas', 'distribuidora de utilidades domésticas'],
    polos: ['Rua 25 de Março, São Paulo, SP', 'Brás, São Paulo, SP', 'São Paulo, SP', 'Curitiba, PR', 'Foz do Iguaçu, PR'] },
  cozinha: { termos: ['atacado utensílios de cozinha', 'fábrica de panelas'] },
  organizacao: { termos: ['atacado organizadores', 'fábrica de organizadores plásticos'] },
  'casa-decoracao': { termos: ['atacado decoração', 'distribuidora artigos de decoração'],
    polos: ['Rua 25 de Março, São Paulo, SP', 'São Paulo, SP', 'Curitiba, PR', 'Foz do Iguaçu, PR'] },
  enxoval: { termos: ['atacado cama mesa e banho', 'fábrica de enxoval'], polos: POLOS_CAMA_MESA_BANHO },
  cama: { termos: ['fábrica de roupa de cama', 'atacado jogo de cama'], polos: POLOS_CAMA_MESA_BANHO },
  mesa: { termos: ['fábrica de toalhas de mesa', 'atacado toalhas de mesa'], polos: POLOS_CAMA_MESA_BANHO },
  banho: { termos: ['fábrica de toalhas de banho', 'atacado toalhas de banho'], polos: POLOS_CAMA_MESA_BANHO },
  cortinas: { termos: ['fábrica de cortinas', 'atacado cortinas e persianas'] },
  tapetes: { termos: ['fábrica de tapetes', 'atacado tapetes'] },
  iluminacao: { termos: ['atacado iluminação', 'fábrica de luminárias'],
    polos: ['Rua da Consolação, São Paulo, SP', 'Rua Santa Ifigênia, São Paulo, SP', 'São Paulo, SP', 'Curitiba, PR'] },
  jardinagem: { termos: ['atacado jardinagem', 'atacado vasos e plantas'],
    polos: ['Holambra, SP', 'São Paulo, SP', 'Curitiba, PR'] },

  // ===== CONSTRUÇÃO =====
  ferramentas: { termos: ['atacado ferramentas', 'distribuidora de ferramentas'],
    polos: ['Rua Florêncio de Abreu, São Paulo, SP', ...POLOS_PADRAO] },
  'ferramentas-eletricas': { termos: ['distribuidora ferramentas elétricas'],
    polos: ['Rua Florêncio de Abreu, São Paulo, SP', ...POLOS_PADRAO] },
  'materiais-eletricos': { termos: ['distribuidora de materiais elétricos', 'atacado material elétrico'],
    polos: ['Rua Santa Ifigênia, São Paulo, SP', ...POLOS_PADRAO] },
  'materiais-hidraulicos': { termos: ['distribuidora de materiais hidráulicos'] },
  ferragens: { termos: ['atacado ferragens', 'distribuidora de ferragens'] },
  parafusos: { termos: ['distribuidora de parafusos', 'atacado parafusos e fixadores'] },
  tintas: { termos: ['distribuidora de tintas', 'fábrica de tintas'] },
  pisos: { termos: ['fábrica de pisos', 'distribuidora de pisos e revestimentos'], polos: POLOS_CERAMICA },
  ceramicas: { termos: ['fábrica de revestimento cerâmico', 'atacado porcelanato'], polos: POLOS_CERAMICA },
  aluminio: { termos: ['distribuidora de alumínio', 'fábrica de esquadrias de alumínio'] },
  vidros: { termos: ['distribuidora de vidros', 'fábrica de vidro temperado'] },
  soldagem: { termos: ['distribuidora de soldagem', 'atacado máquinas de solda'] },

  // ===== AUTOMOTIVO =====
  'pecas-carros': { termos: ['distribuidora de autopeças', 'atacado autopeças'] },
  'pecas-caminhoes': { termos: ['distribuidora peças para caminhão', 'atacado peças diesel'] },
  'pecas-motos': { termos: ['distribuidora de peças para motos', 'atacado peças de moto'],
    polos: ['Rua General Osório, São Paulo, SP', ...POLOS_PADRAO] },
  suspensao: { termos: ['distribuidora de amortecedores e suspensão'] },
  freios: { termos: ['distribuidora de peças de freio', 'fábrica de pastilhas de freio'] },
  motor: { termos: ['distribuidora de peças de motor', 'retífica e peças de motor atacado'] },
  embreagem: { termos: ['distribuidora de embreagem', 'atacado kit embreagem'] },
  lanternas: { termos: ['fábrica de lanternas automotivas', 'distribuidora de lanternas automotivas'] },
  farois: { termos: ['distribuidora de faróis automotivos', 'atacado faróis e lâmpadas automotivas'] },
  pneus: { termos: ['distribuidora de pneus', 'atacado pneus'] },
  rodas: { termos: ['distribuidora de rodas de liga leve', 'fábrica de rodas automotivas'] },
  'auto-baterias': { termos: ['distribuidora de baterias automotivas'] },
  lubrificantes: { termos: ['distribuidora de lubrificantes', 'atacado óleo lubrificante'] },
  'acessorios-automotivos': { termos: ['atacado acessórios automotivos', 'distribuidora de acessórios para carros'] },
  'som-automotivo': { termos: ['distribuidora de som automotivo', 'atacado som automotivo'],
    polos: ['Rua Santa Ifigênia, São Paulo, SP', ...POLOS_PADRAO] },

  // ===== AGRO =====
  'ferramentas-agricolas': { termos: ['distribuidora de ferramentas agrícolas', 'atacado agropecuária'], polos: POLOS_AGRO },
  irrigacao: { termos: ['distribuidora de irrigação', 'fábrica de equipamentos de irrigação'], polos: POLOS_AGRO },
  'agro-bombas': { termos: ["distribuidora de bombas d'água", 'atacado bombas submersas'], polos: POLOS_AGRO },
  pulverizadores: { termos: ['fábrica de pulverizadores', 'distribuidora de pulverizadores agrícolas'], polos: POLOS_AGRO },
  'equipamentos-rurais': { termos: ['fábrica de implementos agrícolas', 'distribuidora de equipamentos rurais'], polos: POLOS_AGRO },
  'cercas-eletricas': { termos: ['fábrica de cerca elétrica rural', 'distribuidora de cerca elétrica'], polos: POLOS_AGRO },
  sementes: { termos: ['distribuidora de sementes'], polos: POLOS_AGRO },
  fertilizantes: { termos: ['distribuidora de fertilizantes', 'fábrica de fertilizantes'], polos: POLOS_AGRO },
  'pet-shop': { termos: ['distribuidora pet shop', 'atacado pet shop'] },
  racoes: { termos: ['distribuidora de rações', 'fábrica de ração'] },
  'pet-brinquedos': { termos: ['fábrica de brinquedos para pet', 'atacado brinquedos pet'] },
  'pet-acessorios': { termos: ['atacado acessórios pet', 'fábrica de caminhas para pet'] },
  'pet-medicamentos': { termos: ['distribuidora de medicamentos veterinários'] },
  'pet-higiene': { termos: ['distribuidora de produtos de higiene pet', 'fábrica de tapete higiênico pet'] },

  // ===== BEBÊS =====
  carrinhos: { termos: ['distribuidora de carrinhos de bebê', 'atacado artigos para bebê'] },
  bercos: { termos: ['fábrica de berços', 'fábrica de móveis infantis'], polos: ['Arapongas, PR', 'Ubá, MG', 'São Paulo, SP', 'Curitiba, PR'] },
  'bebes-brinquedos': { termos: ['atacado brinquedos', 'distribuidora de brinquedos', 'fábrica de brinquedos'],
    polos: ['Rua 25 de Março, São Paulo, SP', ...POLOS_PADRAO] },
  mamadeiras: { termos: ['atacado mamadeiras e chupetas', 'distribuidora de produtos para bebê'] },
  'bebes-roupas': { termos: ['atacado roupas de bebê', 'fábrica de roupas de bebê'],
    polos: ['Terra Roxa, PR', 'Brás, São Paulo, SP', 'Cianorte, PR'] },
  'bebes-acessorios': { termos: ['atacado acessórios para bebê', 'fábrica de acessórios para bebê'] },

  // ===== PAPELARIA =====
  'material-escolar': { termos: ['atacado material escolar', 'distribuidora de papelaria'],
    polos: ['Rua 25 de Março, São Paulo, SP', ...POLOS_PADRAO] },
  'papelaria-escritorio': { termos: ['distribuidora de material de escritório', 'atacado papelaria'] },
  impressao: { termos: ['distribuidora de suprimentos de impressão', 'atacado toner e cartuchos'] },

  // ===== EMBALAGENS =====
  embalagens: { termos: ['distribuidora de embalagens', 'fábrica de embalagens'] },
  sacolas: { termos: ['fábrica de sacolas plásticas', 'fábrica de sacolas personalizadas'] },
  caixas: { termos: ['fábrica de caixas de papelão', 'fábrica de caixas personalizadas'] },
  etiquetas: { termos: ['fábrica de etiquetas', 'fábrica de etiquetas para roupas'],
    polos: ['Brás, São Paulo, SP', 'Bom Retiro, São Paulo, SP', ...POLOS_PADRAO] },
  adesivos: { termos: ['fábrica de adesivos', 'gráfica de adesivos atacado'] },
  fitas: { termos: ['distribuidora de fitas adesivas', 'fábrica de fitas de cetim'],
    polos: ['Rua 25 de Março, São Paulo, SP', ...POLOS_PADRAO] },
  'embalagens-delivery': { termos: ['distribuidora de embalagens descartáveis', 'fábrica de embalagens para delivery'] },

  // ===== INFORMÁTICA =====
  computadores: { termos: ['distribuidora de informática', 'atacado de computadores'], polos: POLOS_ELETRONICOS },
  notebooks: { termos: ['distribuidora de notebooks', 'atacado notebooks'], polos: POLOS_ELETRONICOS },
  monitores: { termos: ['distribuidora de monitores'], polos: POLOS_ELETRONICOS },
  impressoras: { termos: ['distribuidora de impressoras'], polos: POLOS_ELETRONICOS },
  componentes: { termos: ['distribuidora de componentes de informática', 'atacado peças de computador'], polos: POLOS_ELETRONICOS },
  redes: { termos: ['distribuidora de equipamentos de rede'], polos: POLOS_ELETRONICOS },
  cabos: { termos: ['atacado cabos e conectores', 'distribuidora de cabos'], polos: POLOS_ELETRONICOS },

  // ===== ELETRÔNICOS =====
  celulares: { termos: ['distribuidora de celulares', 'atacado celulares'], polos: POLOS_ELETRONICOS },
  capas: { termos: ['atacado capinhas de celular', 'fábrica de capinhas de celular'], polos: POLOS_ELETRONICOS },
  peliculas: { termos: ['atacado películas de celular', 'distribuidora de acessórios para celular'], polos: POLOS_ELETRONICOS },
  carregadores: { termos: ['atacado carregadores de celular', 'distribuidora de acessórios eletrônicos'], polos: POLOS_ELETRONICOS },
  fones: { termos: ['atacado fones de ouvido', 'distribuidora de fones de ouvido'], polos: POLOS_ELETRONICOS },
  smartwatch: { termos: ['atacado smartwatch', 'distribuidora de relógios inteligentes'], polos: POLOS_ELETRONICOS },
  'caixas-som': { termos: ['atacado caixas de som', 'fábrica de caixas acústicas'], polos: POLOS_ELETRONICOS },
  cameras: { termos: ['distribuidora de câmeras', 'atacado câmeras fotográficas'], polos: POLOS_ELETRONICOS },

  // ===== SEGURANÇA =====
  cftv: { termos: ['distribuidora de CFTV', 'atacado câmeras de segurança'], polos: POLOS_ELETRONICOS },
  alarmes: { termos: ['distribuidora de alarmes', 'atacado segurança eletrônica'], polos: POLOS_ELETRONICOS },
  'controle-acesso': { termos: ['distribuidora de controle de acesso'], polos: POLOS_ELETRONICOS },
  'fechaduras-eletronicas': { termos: ['distribuidora de fechaduras eletrônicas', 'atacado fechaduras digitais'], polos: POLOS_ELETRONICOS },

  // ===== GASTRONOMIA =====
  'equipamentos-industriais': { termos: ['equipamentos para restaurante atacado', 'fábrica de equipamentos para cozinha industrial'], polos: POLOS_GASTRONOMIA },
  padaria: { termos: ['distribuidora de equipamentos para padaria', 'distribuidora de insumos para padaria'], polos: POLOS_GASTRONOMIA },
  confeitaria: { termos: ['atacado artigos para confeitaria', 'distribuidora de confeitaria'], polos: POLOS_GASTRONOMIA },
  acougue: { termos: ['equipamentos para açougue', 'distribuidora de equipamentos para açougue'], polos: POLOS_GASTRONOMIA },
  restaurantes: { termos: ['distribuidora de utensílios para restaurante', 'distribuidora food service'], polos: POLOS_GASTRONOMIA },

  // ===== SAÚDE =====
  'produtos-hospitalares': { termos: ['distribuidora de produtos hospitalares', 'atacado materiais hospitalares'] },
  ortopedia: { termos: ['distribuidora de produtos ortopédicos', 'fábrica de produtos ortopédicos'] },
  fisioterapia: { termos: ['distribuidora de equipamentos de fisioterapia'] },
  'equipamentos-medicos': { termos: ['distribuidora de equipamentos médicos'] },

  // ===== MÓVEIS =====
  'moveis-residenciais': { termos: ['fábrica de móveis', 'atacado de móveis'], polos: POLOS_MOVEIS },
  'moveis-comerciais': { termos: ['fábrica de móveis comerciais', 'fábrica de expositores para loja'], polos: POLOS_MOVEIS },
  'moveis-escritorio': { termos: ['fábrica de móveis para escritório', 'fábrica de cadeiras de escritório'], polos: POLOS_MOVEIS },
  'moveis-planejados': { termos: ['fábrica de móveis planejados'], polos: POLOS_MOVEIS },

  // ===== INDÚSTRIA =====
  maquinas: { termos: ['distribuidora de máquinas industriais', 'fábrica de máquinas'],
    polos: ['Rua Florêncio de Abreu, São Paulo, SP', ...POLOS_PADRAO] },
  motores: { termos: ['distribuidora de motores elétricos'] },
  compressores: { termos: ['distribuidora de compressores de ar'] },
  'industria-bombas': { termos: ['distribuidora de bombas industriais'] },

  // ===== ENERGIA =====
  'energia-solar': { termos: ['distribuidora de energia solar', 'distribuidor fotovoltaico'] },
  inversores: { termos: ['distribuidora de inversores solares'] },
  'energia-baterias': { termos: ['distribuidora de baterias estacionárias', 'atacado baterias de lítio'] },
  'paineis-solares': { termos: ['distribuidora de painéis solares', 'atacado placas solares'] },

  // ===== ESPORTES =====
  academia: { termos: ['fábrica de equipamentos de academia', 'distribuidora de equipamentos de ginástica'] },
  bicicletas: { termos: ['distribuidora de bicicletas', 'atacado peças de bicicleta'] },
  pesca: { termos: ['distribuidora de artigos de pesca', 'atacado pesca'] },
  camping: { termos: ['distribuidora de artigos de camping', 'atacado camping'] },

  // ===== FESTAS =====
  'festas-decoracao': { termos: ['atacado artigos para festas', 'distribuidora de artigos de festa'], polos: POLOS_FESTAS },
  natal: { termos: ['atacado artigos de natal', 'fábrica de enfeites de natal'], polos: POLOS_FESTAS },
  halloween: { termos: ['atacado fantasias', 'atacado artigos de halloween'], polos: POLOS_FESTAS },
  casamentos: { termos: ['atacado vestidos de noiva', 'fábrica de vestido de noiva', 'atacado lembrancinhas de casamento'],
    polos: ['Rua São Caetano, São Paulo, SP', ...POLOS_FESTAS] },
  baloes: { termos: ['distribuidora de balões', 'fábrica de balões'], polos: POLOS_FESTAS },
  lembrancas: { termos: ['atacado lembrancinhas', 'fábrica de lembrancinhas personalizadas'], polos: POLOS_FESTAS },
};

// Monta a lista de buscas de uma categoria. Termos e polos estão em ordem de
// importância: no modo econômico usa-se só os primeiros de cada lista.
function buscasDe(catId, { maxTermos = Infinity, maxPolos = Infinity } = {}) {
  const p = PLANO[catId];
  if (!p) return [];
  const termos = p.termos.slice(0, maxTermos);
  const polos = (p.polos || POLOS_PADRAO).slice(0, maxPolos);
  const out = [];
  for (const termo of termos) for (const polo of polos) out.push({ cat: catId, termo, polo, query: `${termo}, ${polo}` });
  return out;
}

module.exports = { PLANO, POLOS_PADRAO, POLOS_ATACADO, POLOS_INDUSTRIAIS, buscasDe };
