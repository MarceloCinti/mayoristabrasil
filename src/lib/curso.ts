/**
 * Bono 3 — mini curso "Academia Mayorista: de cero a su primera venta".
 *
 * La ESTRUCTURA (módulos, clases y el material escrito de cada clase) vive acá.
 * Los VIDEOS se suben desde el admin (/admin/curso) al Storage del proyecto,
 * carpeta `curso/` (cerrada: sin link público). En Firestore `contenido/curso`
 * → { videos: { [claseId]: ruta en Storage } }. El alumno recibe un link
 * firmado de 2 h por /api/curso-video, y lo ve en el reproductor propio
 * (components/CursoVideo.tsx: sin barra para arrastrar, sólo ±10 s).
 * (contenido/ ya lo leen pagos, admins y quien está en prueba; escribe sólo admin.
 *  No hizo falta tocar las reglas.)
 *
 * El progreso de cada alumno se guarda en su propio documento:
 * `usuarios/{uid}.cursoProgreso[claseId] = { t, d, ok }`
 *   t = segundo donde quedó el video · d = duración · ok = clase completada.
 * La regla de `usuarios` deja al dueño escribir campos no sensibles.
 *
 * Los IDs de clase NO se deben cambiar: el progreso y los videos dependen de ellos.
 */

export type Clase = {
  id: string;
  titulo: string;
  /** Duración estimada en minutos (se muestra hasta que el video real informe la suya). */
  min: number;
  /** Texto de la clase (párrafos). */
  texto: string[];
  /** Puntos clave. */
  claves: string[];
  /** Tarea práctica. */
  tarea?: string;
  /** Atajo a una pantalla de la plataforma. */
  enlace?: { href: string; label: string };
};

export type Modulo = { id: string; numero: number; titulo: string; descripcion: string; clases: Clase[] };

export const CURSO_NOMBRE = 'Academia Mayorista';
export const CURSO_SUBTITULO = 'De cero a su primera venta';

export const MODULOS: Modulo[] = [
  {
    id: 'm1', numero: 1, titulo: 'Bienvenida: domine la plataforma',
    descripcion: 'Conozca cada herramienta de Mayorista Brasil y encuentre proveedores en minutos.',
    clases: [
      {
        id: 'm1c1', titulo: 'Bienvenido: lo que va a lograr con este curso', min: 4,
        texto: [
          'Este curso lo lleva de la mano desde el día en que activó su acceso hasta el día en que vende su primer producto traído de Brasil. No necesita experiencia previa ni mucho dinero.',
          'Vamos a recorrer siete etapas: conocer la plataforma, elegir qué vender, contactar y negociar con el proveedor, pagar y traer la mercadería, prepararla para vender, vender (Marketplace, Instagram, WhatsApp, en casa) y finalmente crecer con la recompra.',
          'Cada clase tiene un video corto, un resumen escrito y una tarea práctica. Su avance se guarda solo: puede dejar un video por la mitad y retomarlo después exactamente donde quedó.',
        ],
        claves: ['7 módulos, clases cortas', 'El avance se guarda automáticamente', 'Cada clase termina con una tarea práctica'],
        tarea: 'Anote en un papel su meta: qué quiere vender y cuánto quiere ganar por mes. Vamos a volver a esta meta al final del curso.',
      },
      {
        id: 'm1c2', titulo: 'Recorrido por el panel de Mayorista Brasil', min: 6,
        texto: [
          'En el menú de la izquierda (o arriba, en el celular) tiene todo: Proveedores, Proveedores Secretos, Favoritos, Cambio R$/Gs, Datos para importar, Tendencias, Lista de Estafas y Bonos.',
          '«Proveedores» es la base completa de mayoristas brasileños. «Secretos» son fábricas poco conocidas, con menos competencia y mejores precios. «Favoritos» guarda los que le interesan para no perderlos.',
          '«Cambio R$/Gs» le permite pagar en reales a un proveedor aunque usted no tenga cuenta en Brasil. «Datos para importar» y «Lista de Estafas» lo protegen antes de cerrar cualquier compra.',
        ],
        claves: ['Proveedores = base completa', 'Secretos = fábricas con menos competencia', 'Favoritos = su lista corta', 'Cambio = pagar en reales sin cuenta en Brasil'],
        tarea: 'Entre a cada sección del menú una vez para ubicarse.',
        enlace: { href: '/dashboard', label: 'Ir al panel' },
      },
      {
        id: 'm1c3', titulo: 'Cómo buscar y filtrar proveedores', min: 6,
        texto: [
          'En «Proveedores» puede filtrar por grupo (Moda, Casa, Electrónicos…) y por categoría (por ejemplo: Jeans, Tenis / Calzado, Bijutería). También puede escribir en el buscador el producto o la ciudad.',
          'Empiece filtrando por la categoría que le interesa y abra varias fichas. No se quede con el primero: compare tres o cuatro proveedores del mismo rubro.',
          'Cuando un proveedor le guste, márquelo con el corazón. Así arma su lista corta en «Favoritos».',
        ],
        claves: ['Filtre por grupo y categoría', 'Compare al menos 3 proveedores', 'Guarde con el botón del corazón'],
        tarea: 'Guarde 5 proveedores de su rubro en Favoritos.',
        enlace: { href: '/dashboard/proveedores', label: 'Abrir Proveedores' },
      },
      {
        id: 'm1c4', titulo: 'Cómo leer la ficha de un proveedor', min: 5,
        texto: [
          'Cada ficha muestra fotos del local, ciudad, categorías, reseñas de otros revendedores y los botones de contacto: WhatsApp, Instagram, sitio web o «Llamar» cuando el número es fijo.',
          'Mire las reseñas: le dicen si el proveedor responde rápido, si envía a Paraguay y si la calidad es buena. Después de comprar, deje usted también su reseña: ayuda a toda la comunidad.',
          'Si el proveedor tiene Instagram, revíselo: cantidad de publicaciones, fecha de la última, comentarios de clientes. Un perfil activo es buena señal.',
        ],
        claves: ['Reseñas = experiencia real de otros', 'Instagram activo = buena señal', 'Botón WhatsApp abre la conversación directo'],
        tarea: 'Abra la ficha de sus 5 favoritos y anote cuáles tienen WhatsApp e Instagram.',
        enlace: { href: '/dashboard/favoritos', label: 'Ver mis favoritos' },
      },
    ],
  },
  {
    id: 'm2', numero: 2, titulo: 'Elija qué vender (y cuánto invertir)',
    descripcion: 'Escoja un producto con salida en su zona y calcule su ganancia antes de gastar un guaraní.',
    clases: [
      {
        id: 'm2c1', titulo: 'Cómo elegir su nicho con poco dinero', min: 7,
        texto: [
          'Con poco capital conviene un producto barato, liviano, que no pase de moda rápido y que la gente compre seguido: ropa femenina, bijutería, accesorios para celular, cosméticos, artículos de cocina, ropa infantil.',
          'Evite al principio productos caros, frágiles o que necesiten permisos especiales (medicamentos, semillas, equipos médicos, electrónicos de marca).',
          'La mejor pista: ¿qué compra la gente que usted conoce? Si tiene amigas que compran ropa por Instagram, ahí hay un mercado que usted ya entiende.',
        ],
        claves: ['Barato + liviano + compra frecuente', 'Evite permisos especiales al empezar', 'Venda a un público que ya conoce'],
        tarea: 'Escriba 3 productos candidatos y para quién los vendería.',
      },
      {
        id: 'm2c2', titulo: 'Investigue qué se vende en su ciudad', min: 6,
        texto: [
          'Abra Facebook Marketplace y busque su producto en su ciudad: vea cuántos lo venden, a qué precio y cuáles publicaciones tienen más interacción.',
          'Mire también la sección «Tendencias» de la plataforma: muestra lo que está en alza en Brasil y suele llegar a Paraguay semanas después.',
          'Si nadie vende su producto, puede ser una oportunidad… o una señal de que no hay demanda. Si muchos lo venden, hay demanda, pero tendrá que diferenciarse en precio, variedad o atención.',
        ],
        claves: ['Marketplace muestra precios reales de su zona', 'Tendencias anticipa lo que viene', 'Mucha competencia = hay demanda'],
        tarea: 'Anote 5 precios de venta de su producto en Marketplace.',
        enlace: { href: '/dashboard/tendencias', label: 'Ver Tendencias' },
      },
      {
        id: 'm2c3', titulo: 'Calcule su precio de venta y su ganancia', min: 8,
        texto: [
          'Fórmula del costo real por unidad: precio en reales × cotización del día + parte del flete + parte del despachante/importación + bolsita o etiqueta. Ese es su costo puesto en casa.',
          'Ejemplo: una blusa a R$ 25 con el real a [cotización del día] Gs. Sume el flete y los gastos de importación divididos entre todas las piezas del pedido. Con ese costo final, en ropa y bijutería se suele vender entre 2 y 3 veces el costo; en electrónicos el margen es menor.',
          'Compare su precio con los 5 precios que anotó en Marketplace. Si queda muy por encima, cambie de producto o de proveedor antes de comprar.',
        ],
        claves: ['Costo real = producto + flete + importación + empaque', 'Ropa/bijutería: 2× a 3× el costo', 'Compare con el precio del mercado'],
        tarea: 'Calcule el costo real y el precio de venta de uno de sus productos candidatos.',
        enlace: { href: '/cambio', label: 'Consultar Cambio R$/Gs' },
      },
      {
        id: 'm2c4', titulo: 'Su primer pedido con menos de Gs. 1.000.000', min: 7,
        texto: [
          'Para el primer pedido, el objetivo no es ganar mucho: es aprender el proceso completo y probar si el producto se vende. Por eso conviene empezar chico.',
          'Busque proveedores que permitan mezclar modelos para llegar al pedido mínimo. Elija pocos modelos, en los talles o colores que más se venden, en lugar de un poco de todo.',
          'Reserve una parte del dinero para el flete y la importación: no gaste todo en mercadería. Cuando venda, reinvierta la ganancia en el segundo pedido.',
        ],
        claves: ['Primer pedido = aprender y probar', 'Pocos modelos, los más vendidos', 'Reserve dinero para flete e importación'],
        tarea: 'Arme su presupuesto: cuánto en mercadería, cuánto en flete/importación y cuánto de reserva.',
      },
    ],
  },
  {
    id: 'm3', numero: 3, titulo: 'Contacte y negocie como profesional',
    descripcion: 'Escriba al proveedor en portugués, evite estafas y consiga mejor precio.',
    clases: [
      {
        id: 'm3c1', titulo: 'El primer mensaje al proveedor', min: 5,
        texto: [
          'No necesita hablar portugués: use el Diccionario del Negociador (Bono 2). Busque en español lo que quiere decir, copie el mensaje en portugués y péguelo en WhatsApp o Instagram.',
          'En el primer mensaje diga quién es, de dónde escribe y que compra al por mayor para revender. Pida el catálogo con precios de mayorista y el pedido mínimo.',
          'Escriba a varios proveedores el mismo día. Así compara respuestas, precios y atención.',
        ],
        claves: ['Use el Diccionario del Negociador', 'Preséntese como revendedor', 'Escriba a varios a la vez'],
        tarea: 'Envíe el mensaje de presentación a 3 proveedores de sus favoritos.',
        enlace: { href: '/dashboard/mensajes', label: 'Abrir el Diccionario del Negociador' },
      },
      {
        id: 'm3c2', titulo: 'Cómo no caer en estafas', min: 7,
        texto: [
          'Antes de pagar, pida el CNPJ (el «RUC» de Brasil) y verifique que la empresa existe y está activa. Desconfíe de empresas abiertas hace pocos meses con precios muy por debajo del resto.',
          'Pida un video del producto real, si es posible con su nombre escrito en un papel. Compruebe que la cuenta donde va a pagar esté a nombre de la empresa.',
          'En la primera compra proponga pagar 50% al cerrar y 50% con el comprobante de despacho. Revise siempre la «Lista de Estafas» de la plataforma.',
        ],
        claves: ['Verifique el CNPJ', 'Video real del producto', 'Cuenta a nombre de la empresa', 'Primera compra: 50% / 50%'],
        tarea: 'Pida el CNPJ a los proveedores que le respondieron y revise la Lista de Estafas.',
        enlace: { href: '/dashboard/estafas', label: 'Ver Lista de Estafas' },
      },
      {
        id: 'm3c3', titulo: 'Negociar precio y pedido mínimo', min: 7,
        texto: [
          'Las palancas que más funcionan en Brasil: pagar «à vista» (al contado), aumentar la cantidad, cerrar hoy y prometer recompra. Ofrezca un número concreto, unos 10–15% debajo del precio pasado.',
          'Si no bajan el precio, pida otra cosa: flete gratis hasta la transportadora, regalos, muestras o mezclar modelos para llegar al mínimo.',
          'Siempre pida el presupuesto final por escrito («orçamento») antes de pagar.',
        ],
        claves: ['Al contado + cantidad + cerrar hoy', 'Si no hay descuento, pida flete o regalos', 'Todo por escrito'],
        tarea: 'Negocie con al menos un proveedor usando los mensajes de la sección «Negociar el precio».',
        enlace: { href: '/dashboard/mensajes', label: 'Mensajes para negociar' },
      },
    ],
  },
  {
    id: 'm4', numero: 4, titulo: 'Pague y traiga la mercadería',
    descripcion: 'Del pago en reales hasta que la caja llega a su casa.',
    clases: [
      {
        id: 'm4c1', titulo: 'Cómo pagar en reales desde Paraguay', min: 6,
        texto: [
          'Los proveedores brasileños cobran por Pix (transferencia instantánea), transferencia bancaria, tarjeta o boleto. Si usted no tiene cuenta en Brasil, use el servicio «Cambio R$/Gs» de la plataforma: usted paga en guaraníes y el pago llega en reales.',
          'Con tarjeta de crédito paraguaya, algunos proveedores aceptan cobro por link; consulte el recargo de su banco por compra en el exterior.',
          'Guarde siempre el comprobante y envíeselo al proveedor pidiendo confirmación.',
        ],
        claves: ['Pix = lo más usado en Brasil', 'Sin cuenta en Brasil: Cambio R$/Gs', 'Guarde y envíe el comprobante'],
        tarea: 'Haga una simulación en Cambio R$/Gs con el monto de su primer pedido.',
        enlace: { href: '/cambio', label: 'Ir a Cambio R$/Gs' },
      },
      {
        id: 'm4c2', titulo: 'El envío: transportadora, frontera y Correios', min: 8,
        texto: [
          'Lo más común es que el proveedor despache por transportadora hasta una ciudad de frontera: Foz do Iguaçu (frente a Ciudad del Este), Ponta Porã (frente a Pedro Juan Caballero) o Guaíra (frente a Salto del Guairá).',
          'Pregunte si el flete es CIF (lo paga el proveedor) o FOB (lo paga usted), el plazo y pida siempre el código de seguimiento. Para paquetes chicos existe Correios, más lento pero simple.',
          'Pida el peso y las medidas de las cajas: con eso cotiza el flete y el despachante.',
        ],
        claves: ['Frontera: Foz, Ponta Porã, Guaíra', 'CIF = paga el proveedor / FOB = paga usted', 'Pida siempre el código de seguimiento'],
        tarea: 'Pregunte a su proveedor cómo y hasta dónde envía, y cuánto sale el flete.',
        enlace: { href: '/dashboard/importar', label: 'Ver Datos para importar' },
      },
      {
        id: 'm4c3', titulo: 'Importación en regla con despachante', min: 7,
        texto: [
          'Para que su negocio crezca sin sustos, traiga la mercadería en regla. Un despachante de aduana se encarga de los papeles y le dice cuánto paga de impuestos según el tipo de producto.',
          'Pida al proveedor la nota fiscal (factura) y pásela a su despachante. Consulte con el despachante ANTES de comprar productos que pueden necesitar permisos: cosméticos, alimentos, productos médicos, semillas o veterinarios.',
          'En «Datos para importar» encontrará información útil para este paso.',
        ],
        claves: ['Despachante = papeles e impuestos', 'Nota fiscal del proveedor', 'Consulte permisos antes de comprar'],
        tarea: 'Consiga el contacto de un despachante en su zona y pídale una cotización.',
        enlace: { href: '/dashboard/importar', label: 'Datos para importar' },
      },
      {
        id: 'm4c4', titulo: 'Recibir la mercadería sin perder plata', min: 5,
        texto: [
          'Filme la apertura de cada caja, desde que está cerrada. Es la mejor prueba si algo vino roto, faltante o distinto.',
          'Cuente las piezas y compárelas con el presupuesto. Si hay problema, escriba enseguida al proveedor con fotos y video (en el Diccionario hay mensajes listos para reclamar).',
          'Si todo llegó bien, avísele al proveedor y deje su reseña en la plataforma.',
        ],
        claves: ['Filme la apertura', 'Cuente contra el presupuesto', 'Reclame enseguida, con pruebas'],
        tarea: 'Prepare una planilla simple: producto, cantidad pedida, cantidad recibida, defectos.',
      },
    ],
  },
  {
    id: 'm5', numero: 5, titulo: 'Prepare sus productos para vender',
    descripcion: 'Fotos que venden, precio y presentación.',
    clases: [
      {
        id: 'm5c1', titulo: 'Fotos de producto con el celular', min: 7,
        texto: [
          'Use luz natural cerca de una ventana, fondo liso (una sábana blanca o una pared clara) y limpie la cámara del celular. Evite el flash.',
          'Saque varias fotos: el producto entero, detalles (tela, terminación, etiqueta) y, si es ropa, puesta o en maniquí. Un video corto mostrando el producto vende mucho más.',
          'Siempre fotos propias: muestran que usted tiene el producto en la mano y generan confianza.',
        ],
        claves: ['Luz natural, fondo liso, sin flash', 'Entero + detalles + puesto', 'Fotos propias generan confianza'],
        tarea: 'Saque 5 fotos y 1 video de un producto.',
      },
      {
        id: 'm5c2', titulo: 'Precio, presentación y empaque', min: 5,
        texto: [
          'Termine sus precios en números redondos y fáciles (Gs. 89.000 en lugar de 87.350). Ofrezca precio por cantidad: «1 por 89.000 o 2 por 160.000» aumenta la venta promedio.',
          'Un empaque simple con su nombre o logo (bolsita, sticker, tarjetita de agradecimiento) hace que el cliente lo recuerde y vuelva.',
          'Defina desde el principio su política de cambios: cuántos días y en qué condiciones.',
        ],
        claves: ['Precios redondos', 'Promoción por cantidad', 'Empaque con su marca', 'Política de cambios clara'],
        tarea: 'Defina el precio y la promoción por cantidad de sus productos.',
      },
    ],
  },
  {
    id: 'm6', numero: 6, titulo: 'Venda: Marketplace, Instagram, WhatsApp y en casa',
    descripcion: 'Los canales para vender desde el primer día, sin local.',
    clases: [
      {
        id: 'm6c1', titulo: 'Vender en Facebook Marketplace', min: 8,
        texto: [
          'Marketplace es gratis y la gente entra buscando comprar. Publique cada producto por separado, con título claro (qué es + talle/color + ciudad), precio y buenas fotos.',
          'Publique todos los días un poco: las publicaciones nuevas aparecen más. Responda rápido: quien contesta primero, vende.',
          'Ponga en la descripción cómo entrega (delivery, retiro, envío al interior) y las formas de pago.',
        ],
        claves: ['Título claro con ciudad', 'Publique un poco todos los días', 'Responda rápido'],
        tarea: 'Publique sus primeros 5 productos en Marketplace.',
      },
      {
        id: 'm6c2', titulo: 'Vender por Instagram y WhatsApp Business', min: 8,
        texto: [
          'Instale WhatsApp Business (gratis): tiene catálogo de productos, respuestas rápidas y etiquetas para ordenar clientes. Publique sus productos en los estados todos los días.',
          'En Instagram muestre los productos en uso, novedades y comentarios de clientes. Use historias con encuestas («¿cuál prefieren?») para generar conversación.',
          'Arme una lista de difusión con sus clientes y avíseles cuando llegue mercadería nueva.',
        ],
        claves: ['WhatsApp Business + catálogo', 'Estados todos los días', 'Lista de difusión para novedades'],
        tarea: 'Cree su catálogo en WhatsApp Business con sus productos.',
      },
      {
        id: 'm6c3', titulo: 'Vender en casa, por catálogo y con revendedoras', min: 6,
        texto: [
          'Muchas revendedoras empiezan vendiendo a conocidos, en el trabajo o en casa. Organice una «tarde de compras» y muestre los productos en persona.',
          'Puede sumar revendedoras: usted compra al por mayor y les vende con un margen menor para que ellas revendan. Así vende más volumen sin salir de casa.',
          'Ferias, colegios y grupos de la iglesia o del barrio también son buenos canales al principio.',
        ],
        claves: ['Empiece por su círculo', 'Sume revendedoras', 'Ferias y grupos locales'],
        tarea: 'Haga una lista de 20 personas a quienes mostrarles sus productos.',
      },
      {
        id: 'm6c4', titulo: 'Cobrar y entregar', min: 5,
        texto: [
          'Ofrezca varias formas de pago: transferencia, billetera electrónica, QR y efectivo contra entrega. Cuantas más opciones, menos ventas se pierden.',
          'Para delivery puede usar motoqueros de confianza o apps de envío. Al interior, empresas de encomiendas.',
          'Confirme cada venta por escrito (producto, precio, dirección, día de entrega) para evitar malentendidos.',
        ],
        claves: ['Varias formas de pago', 'Delivery confiable', 'Confirme cada venta por escrito'],
        tarea: 'Defina sus formas de pago y de entrega y publíquelas en sus redes.',
      },
    ],
  },
  {
    id: 'm7', numero: 7, titulo: 'Crezca: recompra y clientes fieles',
    descripcion: 'Convierta la primera venta en un negocio que se repite todos los meses.',
    clases: [
      {
        id: 'm7c1', titulo: 'Reinvertir y volver a comprar', min: 6,
        texto: [
          'Separe la ganancia del dinero de la mercadería. Reinvierta el capital y una parte de la ganancia en el próximo pedido, con más cantidad de lo que mejor se vendió.',
          'Como ya es cliente del proveedor, pida mejores condiciones: descuento de cliente fijo, flete gratis o pago a plazo.',
          'Anote qué se vendió rápido y qué no: esa es la información más valiosa de su negocio.',
        ],
        claves: ['Separe ganancia y capital', 'Recompre lo que más se vendió', 'Pida condiciones de cliente fijo'],
        tarea: 'Haga la lista de su segundo pedido según lo que más vendió.',
      },
      {
        id: 'm7c2', titulo: 'Clientes que vuelven', min: 5,
        texto: [
          'Es mucho más barato venderle de nuevo a un cliente que conseguir uno nuevo. Después de cada venta, pregunte si le gustó y pida una foto usando el producto.',
          'Guarde los contactos de sus clientes con una etiqueta de lo que compraron, y avíseles cuando llegue algo que les puede interesar.',
          'Premie a quien recomienda: un descuento o regalito para el cliente que trae a otro.',
        ],
        claves: ['Postventa: pregunte y pida fotos', 'Etiquete a sus clientes', 'Premie las recomendaciones'],
        tarea: 'Escriba a sus primeros clientes preguntando qué les pareció.',
      },
      {
        id: 'm7c3', titulo: 'Su plan de 30 días', min: 4,
        texto: [
          'Semana 1: elegir producto, calcular precios y contactar proveedores. Semana 2: negociar, pagar y despachar. Semana 3: recibir, sacar fotos y publicar. Semana 4: vender, cobrar y planificar la recompra.',
          'Vuelva a la meta que anotó en la primera clase. ¿Está más cerca? Ajuste producto, precio o canal y repita el ciclo.',
          '¡Felicitaciones por terminar la Academia Mayorista! Ahora tiene el método: lo que sigue es repetirlo cada mes.',
        ],
        claves: ['4 semanas = 1 ciclo completo', 'Mida y ajuste', 'Repita el ciclo cada mes'],
        tarea: 'Ponga fechas a cada semana de su plan en el calendario.',
      },
    ],
  },
];

export const TODAS_CLASES: (Clase & { modulo: Modulo })[] = MODULOS.flatMap(mo => mo.clases.map(c => ({ ...c, modulo: mo })));

export type ProgresoClase = { t?: number; d?: number; ok?: boolean };
export type ProgresoCurso = Record<string, ProgresoClase>;

/** Porcentaje visto de una clase (100 si está completada). */
export function pctClase(p?: ProgresoClase) {
  if (!p) return 0;
  if (p.ok) return 100;
  if (p.t && p.d) return Math.min(99, Math.round((p.t / p.d) * 100));
  return 0;
}

/** Al llegar a este porcentaje del video la clase se marca sola como completada. */
export const UMBRAL_COMPLETA = 0.9;
