export const norrisHero = {
  headlinePhrases: [
    'Tu ecommerce, listo en minutos.',
    'Tu link. Tu marca. Tus ventas.',
    'Hazlo tu mismo.',
  ] as const,
  inputPlaceholder: '¿Cómo se llama tu tienda?',
  ctaLabel: 'Crear tienda',
  scrollHint: 'Deslizá para explorar',
} as const

export const norrisStoreSection = {
  kicker: 'Referencias reales',
  title: 'Tiendas reales, en minutos',
} as const

export const norrisPowerFeatures = [
  {
    id: 'catalogo',
    label: 'Editorial',
    title: 'Catálogo que impresiona',
    description:
      'Cinco estilos editoriales listos para usar. Tu tienda se ve como marca premium desde el primer día.',
    size: 'large',
    accent: 'dark',
  },
  {
    id: 'whatsapp',
    label: 'Directo',
    title: 'Venta por WhatsApp',
    description: 'Tus clientes eligen, agregan al carrito y te llega el pedido listo para confirmar.',
    size: 'medium',
    accent: 'gold',
  },
  {
    id: 'checkout',
    label: 'Flexible',
    title: 'Checkout integrado',
    description: 'Pagos en línea con OnePay cuando quieras activarlo. Vos decidís cómo cobrar.',
    size: 'medium',
    accent: 'neutral',
  },
  {
    id: 'pos',
    label: 'Tienda física',
    title: 'POS integrado',
    description:
      'Caja del día, multi-sede, tickets térmicos e inventario sincronizado con tu catálogo online.',
    size: 'medium',
    accent: 'gold',
  },
  {
    id: 'inventario',
    label: 'Simple',
    title: 'Inventario simple',
    description: 'Subí productos desde el celular. Fotos, precios, stock — todo en un panel claro.',
    size: 'small',
    accent: 'neutral',
  },
  {
    id: 'envios',
    label: 'Colombia',
    title: 'Envíos Colombia',
    description: 'Tarifas por ciudad con DIVIPOLA. Tus clientes ven el costo antes de pagar.',
    size: 'small',
    accent: 'neutral',
  },
  {
    id: 'cupones',
    label: 'Growth',
    title: 'Cupones & promos',
    description: 'Lanzá ofertas, banners de temporada y recuperá carritos abandonados.',
    size: 'small',
    accent: 'gold',
  },
] as const

export const norrisSplitSections = [
  {
    id: 'crea',
    lineA: 'CREÁ',
    lineB: 'TU TIENDA',
    body: 'Subí productos, elegí un estilo editorial y compartí tu link en segundos.',
  },
  {
    id: 'vende',
    lineA: 'VENDÉ',
    lineB: 'ONLINE',
    body: 'WhatsApp, checkout integrado y pedidos organizados — todo en un solo lugar.',
  },
  {
    id: 'pos',
    lineA: 'COBRÁ',
    lineB: 'EN CAJA',
    body: 'Mi Catálogo POS: multi-sede, tickets térmicos, cajón monedero e inventario al día con tu tienda online.',
  },
] as const

export const norrisCloseSection = {
  kicker: 'Sin letra chica',
  title: 'Expert cuando crezcas.',
  perks: [
    { label: 'Registro', value: '2 min' },
    { label: 'Tarjeta', value: 'No hace falta' },
    { label: 'Diseñador', value: 'Incluido' },
  ],
} as const

export const norrisPinnedStores = [
  {
    id: 'mysa',
    name: 'MYSA HOME',
    category: 'Hogar & decoración',
    image: '/landing/stores/mysa-hero.png',
    stat: 'Estilo premium',
  },
  {
    id: 'jass',
    name: 'Jass',
    category: 'Joyería',
    image: '/landing/stores/jass-product.png',
    stat: 'Detalle de producto',
  },
  {
    id: 'mysa-mobile',
    name: 'Mobile first',
    category: 'Experiencia móvil',
    image: '/landing/stores/mysa-mobile.png',
    stat: '100% responsive',
  },
  {
    id: 'morning',
    name: 'Morning',
    category: 'Pijamas & loungewear',
    image: '/landing/stores/morning-showcase.jpg',
    stat: 'Carrusel editorial',
  },
] as const

export const norrisFinal = {
  headline: 'Empezá hoy. Sin tarjeta. Sin diseñador.',
  sub: 'Tu tienda te espera en mitienda.micatalogo.io',
} as const
