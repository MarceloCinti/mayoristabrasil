export type Categoria = { id: string; label: string; grupo?: string };

// Orden de los grupos (secciones) tal como se muestran en el menú.
export const GRUPOS: string[] = [
  'Moda',
  'Cosméticos y Belleza',
  'Casa',
  'Construcción',
  'Automotor',
  'Agro',
  'Bebés',
  'Papelería',
  'Embalajes',
  'Informática',
  'Electrónicos',
  'Seguridad',
  'Gastronomía',
  'Salud',
  'Muebles',
  'Industria',
  'Energía',
  'Deportes',
  'Fiestas',
];

// Lista por defecto (semilla) AGRUPADA. La lista real es editable desde el admin
// y se guarda en Firestore (config/categorias). Esta se usa como semilla inicial,
// como fallback y como base de la migración a formato agrupado.
// OJO: las categorías que YA tienen proveedores conservan su id y su etiqueta
// original (en español); las nuevas usan la nomenclatura en portugués.
export const CATEGORIAS_DEFAULT: Categoria[] = [
  // ===== MODA =====
  { id: 'femenino', label: 'Femenino', grupo: 'Moda' },
  { id: 'masculino', label: 'Masculino', grupo: 'Moda' },
  { id: 'infantil', label: 'Infantil', grupo: 'Moda' },
  { id: 'moda-bebe', label: 'Moda bebé', grupo: 'Moda' },
  { id: 'fitness', label: 'Moda Fitness', grupo: 'Moda' },
  { id: 'moda-praia', label: 'Moda playa', grupo: 'Moda' },
  { id: 'ropa-intima', label: 'Ropa Íntima', grupo: 'Moda' },
  { id: 'plus-size', label: 'Plus Size', grupo: 'Moda' },
  { id: 'evangelica', label: 'Moda Evangélica', grupo: 'Moda' },
  { id: 'streetwear', label: 'Streetwear', grupo: 'Moda' },
  { id: 'jeans', label: 'Jeans', grupo: 'Moda' },
  { id: 'tenis', label: 'Tenis / Calzado', grupo: 'Moda' },
  { id: 'bolsas', label: 'Bolsas', grupo: 'Moda' },
  { id: 'mochilas', label: 'Mochilas', grupo: 'Moda' },
  { id: 'gorras', label: 'Gorras', grupo: 'Moda' },
  { id: 'lentes', label: 'Lentes / Gafas', grupo: 'Moda' },
  { id: 'bijuterias', label: 'Bijutería', grupo: 'Moda' },
  { id: 'joias', label: 'Joyas', grupo: 'Moda' },
  { id: 'semijoias', label: 'Semijoyas', grupo: 'Moda' },
  { id: 'relojes', label: 'Relojes', grupo: 'Moda' },
  { id: 'carteras-femeninas', label: 'Carteras Femeninas', grupo: 'Moda' },
  { id: 'atacado-premium', label: 'Mayorista Premium', grupo: 'Moda' },
  { id: 'moda-barata', label: 'Moda Barata', grupo: 'Moda' },
  { id: 'textil', label: 'Textil / Avíos', grupo: 'Moda' },

  // ===== COSMÉTICOS E BELEZA =====
  { id: 'cosmeticos', label: 'Cosméticos', grupo: 'Cosméticos y Belleza' },
  { id: 'maquiagem', label: 'Maquillaje', grupo: 'Cosméticos y Belleza' },
  { id: 'perfumes', label: 'Perfumes', grupo: 'Cosméticos y Belleza' },
  { id: 'cabelo', label: 'Productos para cabello', grupo: 'Cosméticos y Belleza' },
  { id: 'barbear', label: 'Productos de afeitado', grupo: 'Cosméticos y Belleza' },
  { id: 'esmaltes', label: 'Esmaltes', grupo: 'Cosméticos y Belleza' },
  { id: 'equip-salao', label: 'Equipos para salón', grupo: 'Cosméticos y Belleza' },
  { id: 'moveis-salao', label: 'Muebles para salón', grupo: 'Cosméticos y Belleza' },

  // ===== CASA =====
  { id: 'utilidades-domesticas', label: 'Utilidades domésticas', grupo: 'Casa' },
  { id: 'cozinha', label: 'Cocina', grupo: 'Casa' },
  { id: 'organizacao', label: 'Organización', grupo: 'Casa' },
  { id: 'casa-decoracao', label: 'Decoración', grupo: 'Casa' },
  { id: 'enxoval', label: 'Ajuar', grupo: 'Casa' },
  { id: 'cama', label: 'Cama', grupo: 'Casa' },
  { id: 'mesa', label: 'Mesa', grupo: 'Casa' },
  { id: 'banho', label: 'Baño', grupo: 'Casa' },
  { id: 'cortinas', label: 'Cortinas', grupo: 'Casa' },
  { id: 'tapetes', label: 'Alfombras', grupo: 'Casa' },
  { id: 'iluminacao', label: 'Iluminación', grupo: 'Casa' },
  { id: 'jardinagem', label: 'Jardinería', grupo: 'Casa' },

  // ===== CONSTRUÇÃO =====
  { id: 'ferramentas', label: 'Herramientas', grupo: 'Construcción' },
  { id: 'ferramentas-eletricas', label: 'Herramientas eléctricas', grupo: 'Construcción' },
  { id: 'materiais-eletricos', label: 'Materiales eléctricos', grupo: 'Construcción' },
  { id: 'materiais-hidraulicos', label: 'Materiales hidráulicos', grupo: 'Construcción' },
  { id: 'ferragens', label: 'Ferretería', grupo: 'Construcción' },
  { id: 'parafusos', label: 'Tornillos', grupo: 'Construcción' },
  { id: 'tintas', label: 'Pinturas', grupo: 'Construcción' },
  { id: 'pisos', label: 'Pisos', grupo: 'Construcción' },
  { id: 'ceramicas', label: 'Cerámicas', grupo: 'Construcción' },
  { id: 'aluminio', label: 'Aluminio', grupo: 'Construcción' },
  { id: 'vidros', label: 'Vidrios', grupo: 'Construcción' },
  { id: 'soldagem', label: 'Soldadura', grupo: 'Construcción' },

  // ===== AUTOMOTIVO =====
  { id: 'pecas-carros', label: 'Repuestos para autos', grupo: 'Automotor' },
  { id: 'pecas-caminhoes', label: 'Repuestos para camiones', grupo: 'Automotor' },
  { id: 'pecas-motos', label: 'Repuestos para motos', grupo: 'Automotor' },
  { id: 'suspensao', label: 'Suspensión', grupo: 'Automotor' },
  { id: 'freios', label: 'Frenos', grupo: 'Automotor' },
  { id: 'motor', label: 'Motor', grupo: 'Automotor' },
  { id: 'embreagem', label: 'Embrague', grupo: 'Automotor' },
  { id: 'lanternas', label: 'Luces traseras', grupo: 'Automotor' },
  { id: 'farois', label: 'Faros', grupo: 'Automotor' },
  { id: 'pneus', label: 'Neumáticos', grupo: 'Automotor' },
  { id: 'rodas', label: 'Llantas', grupo: 'Automotor' },
  { id: 'auto-baterias', label: 'Baterías', grupo: 'Automotor' },
  { id: 'lubrificantes', label: 'Lubricantes', grupo: 'Automotor' },
  { id: 'acessorios-automotivos', label: 'Accesorios automotores', grupo: 'Automotor' },
  { id: 'som-automotivo', label: 'Sonido para autos', grupo: 'Automotor' },

  // ===== AGRO =====
  { id: 'ferramentas-agricolas', label: 'Herramientas agrícolas', grupo: 'Agro' },
  { id: 'irrigacao', label: 'Riego', grupo: 'Agro' },
  { id: 'agro-bombas', label: 'Bombas', grupo: 'Agro' },
  { id: 'pulverizadores', label: 'Pulverizadores', grupo: 'Agro' },
  { id: 'equipamentos-rurais', label: 'Equipos rurales', grupo: 'Agro' },
  { id: 'cercas-eletricas', label: 'Cercas eléctricas', grupo: 'Agro' },
  { id: 'sementes', label: 'Semillas', grupo: 'Agro' },
  { id: 'fertilizantes', label: 'Fertilizantes', grupo: 'Agro' },
  { id: 'pet-shop', label: 'Pet Shop', grupo: 'Agro' },
  { id: 'racoes', label: 'Alimento para mascotas', grupo: 'Agro' },
  { id: 'pet-brinquedos', label: 'Juguetes para mascotas', grupo: 'Agro' },
  { id: 'pet-acessorios', label: 'Accesorios para mascotas', grupo: 'Agro' },
  { id: 'pet-medicamentos', label: 'Medicamentos', grupo: 'Agro' },
  { id: 'pet-higiene', label: 'Higiene', grupo: 'Agro' },

  // ===== BEBÊS =====
  { id: 'carrinhos', label: 'Cochecitos', grupo: 'Bebés' },
  { id: 'bercos', label: 'Cunas', grupo: 'Bebés' },
  { id: 'bebes-brinquedos', label: 'Juguetes', grupo: 'Bebés' },
  { id: 'mamadeiras', label: 'Mamaderas', grupo: 'Bebés' },
  { id: 'bebes-roupas', label: 'Ropa de bebé', grupo: 'Bebés' },
  { id: 'bebes-acessorios', label: 'Accesorios de bebé', grupo: 'Bebés' },

  // ===== PAPELARIA =====
  { id: 'material-escolar', label: 'Material escolar', grupo: 'Papelería' },
  { id: 'papelaria-escritorio', label: 'Oficina', grupo: 'Papelería' },
  { id: 'impressao', label: 'Impresión', grupo: 'Papelería' },

  // ===== EMBALAGENS =====
  { id: 'embalagens', label: 'Embalajes', grupo: 'Embalajes' },
  { id: 'sacolas', label: 'Bolsas de compra', grupo: 'Embalajes' },
  { id: 'caixas', label: 'Cajas', grupo: 'Embalajes' },
  { id: 'etiquetas', label: 'Etiquetas', grupo: 'Embalajes' },
  { id: 'adesivos', label: 'Adhesivos', grupo: 'Embalajes' },
  { id: 'fitas', label: 'Cintas', grupo: 'Embalajes' },
  { id: 'embalagens-delivery', label: 'Embalajes para delivery', grupo: 'Embalajes' },

  // ===== INFORMÁTICA =====
  { id: 'computadores', label: 'Computadoras', grupo: 'Informática' },
  { id: 'notebooks', label: 'Notebooks', grupo: 'Informática' },
  { id: 'monitores', label: 'Monitores', grupo: 'Informática' },
  { id: 'impressoras', label: 'Impresoras', grupo: 'Informática' },
  { id: 'componentes', label: 'Componentes', grupo: 'Informática' },
  { id: 'redes', label: 'Redes', grupo: 'Informática' },
  { id: 'cabos', label: 'Cables', grupo: 'Informática' },

  // ===== ELETRÔNICOS =====
  { id: 'celulares', label: 'Celulares', grupo: 'Electrónicos' },
  { id: 'capas', label: 'Fundas', grupo: 'Electrónicos' },
  { id: 'peliculas', label: 'Protectores de pantalla', grupo: 'Electrónicos' },
  { id: 'carregadores', label: 'Cargadores', grupo: 'Electrónicos' },
  { id: 'fones', label: 'Auriculares', grupo: 'Electrónicos' },
  { id: 'smartwatch', label: 'Smartwatch', grupo: 'Electrónicos' },
  { id: 'caixas-som', label: 'Parlantes', grupo: 'Electrónicos' },
  { id: 'cameras', label: 'Cámaras', grupo: 'Electrónicos' },

  // ===== SEGURANÇA =====
  { id: 'cftv', label: 'CFTV', grupo: 'Seguridad' },
  { id: 'alarmes', label: 'Alarmas', grupo: 'Seguridad' },
  { id: 'controle-acesso', label: 'Control de acceso', grupo: 'Seguridad' },
  { id: 'fechaduras-eletronicas', label: 'Cerraduras electrónicas', grupo: 'Seguridad' },

  // ===== GASTRONOMIA =====
  { id: 'equipamentos-industriais', label: 'Equipos industriales', grupo: 'Gastronomía' },
  { id: 'padaria', label: 'Panadería', grupo: 'Gastronomía' },
  { id: 'confeitaria', label: 'Repostería', grupo: 'Gastronomía' },
  { id: 'acougue', label: 'Carnicería', grupo: 'Gastronomía' },
  { id: 'restaurantes', label: 'Restaurantes', grupo: 'Gastronomía' },

  // ===== SAÚDE =====
  { id: 'produtos-hospitalares', label: 'Productos hospitalarios', grupo: 'Salud' },
  { id: 'ortopedia', label: 'Ortopedia', grupo: 'Salud' },
  { id: 'fisioterapia', label: 'Fisioterapia', grupo: 'Salud' },
  { id: 'equipamentos-medicos', label: 'Equipos médicos', grupo: 'Salud' },

  // ===== MÓVEIS =====
  { id: 'moveis-residenciais', label: 'Residenciales', grupo: 'Muebles' },
  { id: 'moveis-comerciais', label: 'Comerciales', grupo: 'Muebles' },
  { id: 'moveis-escritorio', label: 'Oficina', grupo: 'Muebles' },
  { id: 'moveis-planejados', label: 'A medida', grupo: 'Muebles' },

  // ===== INDÚSTRIA =====
  { id: 'maquinas', label: 'Máquinas', grupo: 'Industria' },
  { id: 'motores', label: 'Motores', grupo: 'Industria' },
  { id: 'compressores', label: 'Compresores', grupo: 'Industria' },
  { id: 'industria-bombas', label: 'Bombas industriales', grupo: 'Industria' },

  // ===== ENERGIA =====
  { id: 'energia-solar', label: 'Energía solar', grupo: 'Energía' },
  { id: 'inversores', label: 'Inversores', grupo: 'Energía' },
  { id: 'energia-baterias', label: 'Baterías', grupo: 'Energía' },
  { id: 'paineis-solares', label: 'Paneles solares', grupo: 'Energía' },

  // ===== ESPORTES =====
  { id: 'academia', label: 'Gimnasio', grupo: 'Deportes' },
  { id: 'bicicletas', label: 'Bicicletas', grupo: 'Deportes' },
  { id: 'pesca', label: 'Pesca', grupo: 'Deportes' },
  { id: 'camping', label: 'Camping', grupo: 'Deportes' },

  // ===== FESTAS =====
  { id: 'festas-decoracao', label: 'Decoración', grupo: 'Fiestas' },
  { id: 'natal', label: 'Navidad', grupo: 'Fiestas' },
  { id: 'halloween', label: 'Halloween', grupo: 'Fiestas' },
  { id: 'casamentos', label: 'Casamientos', grupo: 'Fiestas' },
  { id: 'baloes', label: 'Globos', grupo: 'Fiestas' },
  { id: 'lembrancas', label: 'Recuerdos', grupo: 'Fiestas' },
];

// Alias retrocompatible: componentes que solo necesitan un fallback siguen
// importando CATEGORIAS. La lista viva se lee con useCategorias().
export const CATEGORIAS = CATEGORIAS_DEFAULT;

export type CategoriaId = string;

// Genera un id estable a partir de una etiqueta (para categorías nuevas).
export const slugify = (s: string): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

// Agrupa una lista de categorías por grupo, respetando el orden de GRUPOS.
// Los grupos no listados en GRUPOS (ej: "Otros") se agregan al final.
export function agrupar(cats: Categoria[]): { grupo: string; items: Categoria[] }[] {
  const byGroup = new Map<string, Categoria[]>();
  for (const c of cats) {
    const g = c.grupo || 'Otros';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(c);
  }
  const orden = [...GRUPOS];
  for (const g of byGroup.keys()) if (!orden.includes(g)) orden.push(g);
  return orden.filter(g => byGroup.has(g)).map(g => ({ grupo: g, items: byGroup.get(g)! }));
}

export const CSV_HEADERS = [
  'nombre',
  'categoria',
  'whatsapp',
  'instagram',
  'facebook',
  'direccion',
  'googleMaps',
  'rangoPrecio',
  'pedidoMinimo',
  'cantidadMinima',
  'enviaParaguay',
  'formaPago',
  'catalogo',
  'esSecreto',
  'esTendencia',
  'observaciones',
  'fotos',
  'video',
];
