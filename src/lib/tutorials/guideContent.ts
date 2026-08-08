export type GuideCategoryId =
  | 'inicio'
  | 'configuracion'
  | 'personalizacion'
  | 'inventario'
  | 'preguntas'
  | 'videos'

export type GuideStep = {
  title: string
  body: string
  /** Ruta interna opcional para el CTA del paso */
  ctaTo?: string
  ctaLabel?: string
  tip?: string
}

export type GuideFlow = {
  id: string
  category: Exclude<GuideCategoryId, 'preguntas' | 'videos' | 'inicio'> | 'inicio'
  title: string
  summary: string
  /** Minutos estimados */
  minutes: number
  badge?: string
  featured?: boolean
  steps: GuideStep[]
}

export type GuideFaqItem = {
  id: string
  question: string
  answer: string
}

export const GUIDE_CATEGORIES: {
  id: GuideCategoryId
  label: string
  shortLabel: string
}[] = [
  { id: 'inicio', label: 'Para empezar', shortLabel: 'Inicio' },
  { id: 'configuracion', label: 'Configuración', shortLabel: 'Config' },
  { id: 'personalizacion', label: 'Personalización', shortLabel: 'Diseño' },
  { id: 'inventario', label: 'Inventario y POS', shortLabel: 'Inventario' },
  { id: 'preguntas', label: 'Preguntas frecuentes', shortLabel: 'FAQ' },
  { id: 'videos', label: 'Videos', shortLabel: 'Videos' },
]

export const GUIDE_FLOWS: GuideFlow[] = [
  {
    id: 'publicar-tienda',
    category: 'inicio',
    title: 'Publicar tu tienda online',
    summary: 'Activá Expert, configurá cobro y envío, y publicá tu link para vender.',
    minutes: 8,
    badge: 'Esencial',
    featured: true,
    steps: [
      {
        title: 'Activá el plan Expert',
        body: 'La tienda pública necesita Expert. Desde Inicio o Configuraciones podés ver el plan y activarlo.',
        ctaTo: '/app/plan',
        ctaLabel: 'Ver plan Expert',
      },
      {
        title: 'Elegí cómo cobrás',
        body: 'En Método de pago elegí WhatsApp, pasarela Mi Catálogo o tu pasarela OnePay.',
        ctaTo: '/app/cuenta/checkout-ventas',
        ctaLabel: 'Configurar cobro',
        tip: 'Podés empezar con WhatsApp y pasar a pasarela después.',
      },
      {
        title: 'Configurá envíos',
        body: 'Definí tarifas por ciudad o el modo de envío que uses. Sin envío configurado no podés publicar.',
        ctaTo: '/app/cuenta/envio',
        ctaLabel: 'Configurar envíos',
      },
      {
        title: 'Publicá tu tienda',
        body: 'Cuando todo esté listo, dale a Publicar mi tienda. Tu link quedará activo para compartir en Instagram o WhatsApp.',
        ctaTo: '/app',
        ctaLabel: 'Ir a Inicio',
        tip: 'El enlace queda como tunombre.micatalogo.io.',
      },
    ],
  },
  {
    id: 'inventario-unico-pos',
    category: 'inventario',
    title: 'Un solo inventario: POS + tienda online',
    summary: 'Creá productos en el POS, publicalos en el catálogo y el stock se sincroniza al cobrar.',
    minutes: 6,
    badge: 'Más pedido',
    featured: true,
    steps: [
      {
        title: 'Activá la sede para tienda virtual',
        body: 'Entrá a Mi Catálogo POS → Sedes. Creá o editá tu sede y activá «Mostrar inventario en tienda virtual» (o el check Tienda virtual).',
        ctaTo: '/pos/admin/sedes',
        ctaLabel: 'Ir a Sedes',
        tip: 'Sin este check, al crear el producto no se genera el borrador en el catálogo.',
      },
      {
        title: 'Creá el producto en Inventario POS',
        body: 'En Inventario POS usá + Nuevo producto. Ese producto queda listo para caja y genera un borrador en el catálogo.',
        ctaTo: '/pos/admin/inventario',
        ctaLabel: 'Ir a Inventario POS',
      },
      {
        title: 'Completá y publicá en el catálogo',
        body: 'En la pestaña Productos buscá los que digan «POS · Completar para publicar». Subí foto, descripción y dale Publicar en tienda.',
        ctaTo: '/app/inventario',
        ctaLabel: 'Ir a Inventario',
        tip: 'Los productos que ya tenías solo en el catálogo no se migran solos: conviene cargarlos desde el POS.',
      },
      {
        title: 'Cobrás y el stock se actualiza solo',
        body: 'Cuando vendés en el POS, el stock del catálogo online se sincroniza. Un solo inventario para tienda física y online.',
        ctaTo: '/pos/ventas',
        ctaLabel: 'Ir a Cobrar',
      },
    ],
  },
  {
    id: 'metodo-pago',
    category: 'configuracion',
    title: 'Configurar método de pago',
    summary: 'Elegí si cobrás por WhatsApp, con pasarela Mi Catálogo o con tu OnePay.',
    minutes: 4,
    featured: true,
    steps: [
      {
        title: 'Abrí Método de pago',
        body: 'En Configuraciones → Método de pago vas a ver las opciones disponibles para tu tienda.',
        ctaTo: '/app/cuenta/checkout-ventas',
        ctaLabel: 'Abrir método de pago',
      },
      {
        title: 'Elegí el modo',
        body: 'WhatsApp: el pedido te llega al chat. Pasarela Mi Catálogo u OnePay: el cliente paga en línea.',
        tip: 'Si usás OnePay propia, completá también las credenciales en Pasarela OnePay.',
      },
      {
        title: 'Confirmá y probá un pedido',
        body: 'Guardá el cambio y hacé un pedido de prueba desde tu catálogo para verificar que el flujo cierre bien.',
        ctaTo: '/app/cuenta/tienda',
        ctaLabel: 'Ver tienda y catálogo',
      },
    ],
  },
  {
    id: 'envios',
    category: 'configuracion',
    title: 'Configurar envíos',
    summary: 'Definí tarifas por ciudad o envío manual para poder publicar y cobrar con claridad.',
    minutes: 5,
    steps: [
      {
        title: 'Entrá a Envíos',
        body: 'En Configuraciones → Envíos elegís cómo calculás el costo de entrega.',
        ctaTo: '/app/cuenta/envio',
        ctaLabel: 'Ir a Envíos',
      },
      {
        title: 'Elegí automático o manual',
        body: 'Podés usar tarifas por departamento/ciudad o un flujo manual según cómo operes hoy.',
      },
      {
        title: 'Guardá y revisá en el checkout',
        body: 'El cliente verá el envío al finalizar la compra. Si algo no cuadra, volvé a ajustar la tarifa.',
        tip: 'Sin envío configurado, la publicación de la tienda queda bloqueada.',
      },
    ],
  },
  {
    id: 'whatsapp-pedidos',
    category: 'configuracion',
    title: 'WhatsApp de pedidos',
    summary: 'Dejá listo el número y el mensaje para recibir pedidos ordenados.',
    minutes: 3,
    steps: [
      {
        title: 'Abrí WhatsApp',
        body: 'En Configuraciones → WhatsApp cargá el número con el que atendés pedidos.',
        ctaTo: '/app/cuenta/whatsapp',
        ctaLabel: 'Configurar WhatsApp',
      },
      {
        title: 'Revisá el mensaje',
        body: 'El mensaje de pedido se arma con los datos del carrito. Ajustalo si querés un tono más de tu marca.',
      },
      {
        title: 'Probá desde el catálogo',
        body: 'Agregá un producto al carrito y enviá un pedido de prueba para confirmar que llega bien.',
      },
    ],
  },
  {
    id: 'identidad-dominio',
    category: 'configuracion',
    title: 'Nombre de tienda y enlace',
    summary: 'Definí cómo se llama tu marca y el link que compartís con clientes.',
    minutes: 3,
    steps: [
      {
        title: 'Nombre y dominio',
        body: 'En Nombre y dominio ajustás el nombre visible y el slug de tu link público.',
        ctaTo: '/app/cuenta/identidad-tienda',
        ctaLabel: 'Editar nombre y dominio',
      },
      {
        title: 'Compartí el link',
        body: 'Pegalo en la bio de Instagram, historias y estados de WhatsApp. Un solo enlace, siempre actualizado.',
        tip: 'Formato típico: tunombre.micatalogo.io',
      },
    ],
  },
  {
    id: 'estilo-catalogo',
    category: 'personalizacion',
    title: 'Elegir el estilo del catálogo',
    summary: 'Plantilla, colores y look general para que la tienda se sienta como tu marca.',
    minutes: 5,
    featured: true,
    steps: [
      {
        title: 'Abrí Estilo del catálogo',
        body: 'En Configuraciones → Estilo del catálogo vas a ver las plantillas disponibles.',
        ctaTo: '/app/cuenta/estilo',
        ctaLabel: 'Elegir estilo',
      },
      {
        title: 'Elegí plantilla y colores',
        body: 'Probá el estilo que más se parezca a tu marca. Los cambios se ven en la vista previa.',
      },
      {
        title: 'Revisá en Personalizar',
        body: 'Desde Personalizar mi tienda podés ver el resultado completo y seguir ajustando detalles.',
        ctaTo: '/app/personalizar',
        ctaLabel: 'Personalizar mi tienda',
      },
    ],
  },
  {
    id: 'logo-fuentes',
    category: 'personalizacion',
    title: 'Logo y tipografía',
    summary: 'Subí tu logo y elegí la fuente para que se lea como tu marca.',
    minutes: 4,
    steps: [
      {
        title: 'Subí el logo',
        body: 'En Logo cargá una imagen nítida (PNG o JPG). Evitá capturas borrosas de redes.',
        ctaTo: '/app/cuenta/logo',
        ctaLabel: 'Subir logo',
      },
      {
        title: 'Elegí tipografía',
        body: 'En Tipografía podés definir la fuente de la tienda o del banner.',
        ctaTo: '/app/cuenta/fuentes',
        ctaLabel: 'Elegir fuentes',
      },
      {
        title: 'Revisá el resultado',
        body: 'Abrí tu catálogo o la vista previa y confirmá que logo y texto se vean bien en celular.',
      },
    ],
  },
  {
    id: 'banners',
    category: 'personalizacion',
    title: 'Banner, cabecera y barra de anuncio',
    summary: 'Usá banners de temporada y anuncios para destacar promos sin saturar la tienda.',
    minutes: 4,
    steps: [
      {
        title: 'Banner de temporada',
        body: 'Ideal para campañas, colecciones o fechas especiales.',
        ctaTo: '/app/cuenta/banner-temporada',
        ctaLabel: 'Configurar banner',
      },
      {
        title: 'Cabecera',
        body: 'Ajustá cómo se presenta la parte superior de tu tienda.',
        ctaTo: '/app/cuenta/cabecera',
        ctaLabel: 'Editar cabecera',
      },
      {
        title: 'Barra de anuncio',
        body: 'Un mensaje corto para envíos, descuentos o novedades. Manténelo breve y claro.',
        ctaTo: '/app/cuenta/barra-anuncio',
        ctaLabel: 'Barra de anuncio',
        tip: 'Un solo mensaje fuerte convierte mejor que varios avisos a la vez.',
      },
    ],
  },
  {
    id: 'productos-catalogo',
    category: 'inventario',
    title: 'Crear productos en el catálogo',
    summary: 'Si vendés solo online, cargá productos directo en Inventario del catálogo.',
    minutes: 5,
    steps: [
      {
        title: 'Abrí Inventario',
        body: 'En la pestaña Productos vas a tu inventario del catálogo.',
        ctaTo: '/app/inventario',
        ctaLabel: 'Ir a Inventario',
      },
      {
        title: 'Creá el producto',
        body: 'Completá nombre, precio, stock, fotos y descripción. Si tenés variantes (talla/color), cargalas ahí.',
      },
      {
        title: 'Organizá por categorías',
        body: 'Las categorías ayudan a que el cliente encuentre rápido. Creá las que uses de verdad (no demasiadas).',
        ctaTo: '/app/inventario/categorias',
        ctaLabel: 'Ir a Categorías',
        tip: 'Si también usás POS y querés stock único, creá el producto desde Inventario POS con la sede en tienda virtual.',
      },
    ],
  },
  {
    id: 'sedes-vendedores',
    category: 'inventario',
    title: 'Sedes y vendedores del POS',
    summary: 'Armá tu punto de venta físico: sede, caja y quién cobra.',
    minutes: 7,
    steps: [
      {
        title: 'Creá la sede',
        body: 'En POS → Sedes creá tu local. Si querés inventario online, activá Tienda virtual.',
        ctaTo: '/pos/admin/sedes',
        ctaLabel: 'Ir a Sedes',
      },
      {
        title: 'Cargá inventario',
        body: 'En Inventario POS agregá productos y stock de esa sede.',
        ctaTo: '/pos/admin/inventario',
        ctaLabel: 'Inventario POS',
      },
      {
        title: 'Invitá vendedores',
        body: 'Desde Vendedores del POS podés dar acceso a quien cobra en caja (requiere plan Expert para cobrar).',
        ctaTo: '/pos/admin/vendedores',
        ctaLabel: 'Ir a Vendedores',
        tip: 'Sedes e inventario se pueden armar en Free; cobrar en caja y vendedores necesitan Expert.',
      },
    ],
  },
  {
    id: 'cupones',
    category: 'configuracion',
    title: 'Crear cupones de descuento',
    summary: 'Ofrecé códigos de descuento en el checkout de tu tienda.',
    minutes: 3,
    steps: [
      {
        title: 'Abrí Cupones',
        body: 'En Configuraciones → Cupones creás códigos con porcentaje o valor fijo.',
        ctaTo: '/app/cuenta/cupones',
        ctaLabel: 'Ir a Cupones',
      },
      {
        title: 'Definí reglas',
        body: 'Elegí monto o %, vigencia y si querés límites. Guardá el cupón.',
      },
      {
        title: 'Compartilo',
        body: 'El cliente lo ingresa en el checkout. Ideal para lanzamientos e historias de Instagram.',
      },
    ],
  },
  {
    id: 'proveedores',
    category: 'configuracion',
    title: 'Proveedores: importar y vender sin stock propio',
    summary:
      'Usá el panel Proveedores para importar productos de otras bodegas o publicar los tuyos para reventa.',
    minutes: 6,
    badge: 'Nuevo',
    featured: true,
    steps: [
      {
        title: 'Abrí el panel Proveedores',
        body: 'En Configuraciones → Proveedores ves el catálogo de la red, tus productos importados y la opción de ser proveedor.',
        ctaTo: '/app/proveedores',
        ctaLabel: 'Ir a Proveedores',
      },
      {
        title: 'Importá un producto del catálogo',
        body: 'En Catálogo elegí un producto, definí tu precio de venta (no puede ser menor al costo) y agregalo a tu inventario. Queda listo para vender con tu marca; el proveedor despacha.',
        tip: 'En Mis productos ves lo importado con el nombre del proveedor. Desde ahí podés abrir la bodega de ese proveedor en grilla.',
      },
      {
        title: '(Opcional) Activá contraentrega',
        body: 'Si vendés productos de proveedor, podés activar «Contraentrega en checkout» para que el cliente pague al recibir. Después liquidás con el proveedor cuando el recaudo esté confirmado.',
        ctaTo: '/app/proveedores',
        ctaLabel: 'Configurar contraentrega',
      },
      {
        title: 'Si sos proveedor: publicá para reventa',
        body: 'Tocá «Quiero vender como proveedor», completá tu perfil y en el portal usá tus productos de inventario (con variantes). En cada uno tocá «Habilitar reventa», definí el costo para otras tiendas y el lead time (horas para despachar).',
        ctaTo: '/app/proveedor',
        ctaLabel: 'Abrir portal proveedor',
        tip: 'Lead time = cuántas horas necesitás, desde que llega el pedido, para entregar el paquete a la transportadora.',
      },
      {
        title: 'Pedidos y despacho',
        body: 'Cuando otra tienda vende tu producto, te llega el pedido en el portal. Aceptalo, cargá la guía y marcá despachado. En cobros ves lo pendiente de liquidar.',
        ctaTo: '/app/proveedor',
        ctaLabel: 'Ver pedidos del portal',
      },
    ],
  },
  {
    id: 'primeros-pasos',
    category: 'inicio',
    title: 'Checklist de primeros pasos',
    summary: 'El orden recomendado si acabás de crear tu cuenta.',
    minutes: 12,
    badge: 'Nuevos',
    featured: true,
    steps: [
      {
        title: 'Identidad: nombre, logo y estilo',
        body: 'Definí nombre de tienda, logo y un estilo de catálogo. Eso ya hace que se vea profesional.',
        ctaTo: '/app/cuenta/identidad-tienda',
        ctaLabel: 'Nombre y dominio',
      },
      {
        title: 'Cargá tus primeros productos',
        body: 'Subí fotos claras, precio y stock. Con 5–10 productos buenos ya podés vender.',
        ctaTo: '/app/inventario',
        ctaLabel: 'Cargar productos',
      },
      {
        title: 'Cobro, WhatsApp y envío',
        body: 'Configurá método de pago, WhatsApp y envíos. Son los tres pilares para publicar.',
        ctaTo: '/app/cuenta/checkout-ventas',
        ctaLabel: 'Método de pago',
      },
      {
        title: 'Publicá y compartí el link',
        body: 'Activá Expert si aún no lo tenés, publicá la tienda y pegá el link en tu bio.',
        ctaTo: '/app',
        ctaLabel: 'Ir a Inicio',
      },
      {
        title: '(Opcional) Unificá con el POS',
        body: 'Si también vendés en local, activá Tienda virtual en la sede y creá productos desde Inventario POS.',
        ctaTo: '/pos/admin/sedes',
        ctaLabel: 'Configurar POS',
      },
    ],
  },
]

export const GUIDE_FAQS: GuideFaqItem[] = [
  {
    id: 'inventario-compartido',
    question: '¿Cómo unifico el inventario del POS con la tienda online?',
    answer:
      'Activá «Mostrar inventario en tienda virtual» en la sede, creá el producto en Inventario POS y completalo/publicalo en Productos del catálogo. Al cobrar en el POS, el stock online se actualiza solo. Los productos que ya estaban solo en el catálogo no se migran automáticamente.',
  },
  {
    id: 'por-que-no-publico',
    question: '¿Por qué no me deja publicar la tienda?',
    answer:
      'Normalmente falta una de estas tres cosas: plan Expert activo, método de pago configurado o envíos configurados. Revisá el panel Publicar mi tienda en Inicio: te indica exactamente qué falta.',
  },
  {
    id: 'free-vs-expert',
    question: '¿Qué puedo hacer en Free y qué necesita Expert?',
    answer:
      'En Free podés armar sedes, inventario POS y preparar la tienda. Para publicar el catálogo online, cobrar en caja y usar vendedores POS necesitás Expert.',
  },
  {
    id: 'stock-catalogo-pos',
    question: 'Si cambio el stock solo en el catálogo, ¿se actualiza en el POS?',
    answer:
      'La sincronización principal es POS → catálogo. Si unificaste inventario, conviene ajustar stock desde el POS para que ambos lados queden alineados.',
  },
  {
    id: 'pasarela-comision',
    question: '¿Mi Catálogo cobra comisión por cada venta?',
    answer:
      'No cobramos porcentaje por venta del plan. Si usás pasarela OnePay, la comisión de la transacción la cobra la pasarela. También podés operar pedidos por WhatsApp sin pasarela.',
  },
  {
    id: 'cambiar-estilo',
    question: '¿Puedo cambiar el diseño después de publicar?',
    answer:
      'Sí. Estilo, logo, tipografía, banners y barra de anuncio se pueden cambiar cuando quieras. Los cambios se reflejan en tu link público.',
  },
  {
    id: 'link-bio',
    question: '¿Cuál es el link que debo poner en Instagram?',
    answer:
      'Tu link público (tunombre.micatalogo.io). Está en Nombre y dominio / Tienda y catálogo. Ese es el que va en la bio.',
  },
  {
    id: 'borrar-producto-pos',
    question: 'Si borro un producto en el POS, ¿qué pasa en el catálogo?',
    answer:
      'Si estaba vinculado, el borrador u ocultamiento depende del estado del producto. Antes de borrar, revisá si querés solo ocultarlo de la tienda online.',
  },
  {
    id: 'soporte',
    question: '¿Cómo pido ayuda si me trabo?',
    answer:
      'Escribinos por WhatsApp de soporte desde la app o la web. Contanos en qué paso estás (publicar, POS, pagos, etc.) y te orientamos.',
  },
  {
    id: 'que-es-proveedores',
    question: '¿Para qué sirve el panel Proveedores?',
    answer:
      'Sirve para dos cosas: (1) importar productos de bodegas de la red y venderlos en tu tienda sin tener stock propio; (2) si tenés bodega, publicarlos para que otras tiendas los revendan. Entrá en Configuraciones → Proveedores o en Tutoriales → guía «Proveedores».',
  },
  {
    id: 'lead-time-proveedor',
    question: '¿Qué es el lead time al publicar para reventa?',
    answer:
      'Son las horas que necesitás para despachar desde que llega el pedido (entregar el paquete a la transportadora). Ej.: 24h = mismo día o al día siguiente; 48h = 1–2 días. Las tiendas lo ven al importar tu producto.',
  },
]

export function guidesForCategory(category: GuideCategoryId): GuideFlow[] {
  if (category === 'inicio') {
    return GUIDE_FLOWS.filter((g) => g.featured || g.category === 'inicio')
  }
  if (category === 'preguntas' || category === 'videos') return []
  return GUIDE_FLOWS.filter((g) => g.category === category)
}

export function findGuide(id: string): GuideFlow | undefined {
  return GUIDE_FLOWS.find((g) => g.id === id)
}
