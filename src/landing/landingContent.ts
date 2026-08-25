import type { McCatalogThemePreset } from '@/types/mc'

export const LANDING_REGISTER_PATH = '/registro' as const

export const landingRegisterCta = {
  label: 'Crear mi tienda',
  highlight: 'GRATIS',
} as const

export type LandingNavLink = {
  id: string
  label: string
  href: string
}

export type LandingStoreProduct = {
  name: string
  price: string
  imageUrl: string
  /** Fallback si la imagen no carga */
  hue?: number
}

export type LandingStoreExample = {
  id: string
  preset: McCatalogThemePreset
  storeName: string
  category: string
  tagline: string
  products: LandingStoreProduct[]
}

export type LandingBentoFeature = {
  id: string
  title: string
  description: string
  label: string
  size: 'large' | 'medium' | 'small'
  accent: 'gold' | 'neutral' | 'dark'
}

export type LandingSuccessStory = {
  id: string
  name: string
  role: string
  quote: string
  resultLabel: string
  resultValue: string
}

export type LandingStoreScreenshot = {
  id: string
  storeName: string
  category: string
  imageUrl: string
  imageAlt: string
}

export type LandingStep = {
  id: string
  step: number
  title: string
  description: string
}

export const landingNavLinks: LandingNavLink[] = [
  { id: 'tiendas', label: 'Tiendas', href: '/#tiendas' },
  { id: 'como-funciona', label: 'Cómo funciona', href: '/#como-funciona' },
  { id: 'beneficios', label: 'Beneficios', href: '/#beneficios' },
]

export const heroContent = {
  eyebrow: 'Mi Catálogo',
  headline: 'Tu tienda online,',
  rotatingAccents: ['espectacular.', 'profesional.', 'lista para vender.', 'hermosa.'] as const,
  subheadline:
    'Creá tu catálogo WhatsApp y tienda virtual con diseño editorial. Compartila y empezá a vender hoy — gratis, sin tarjeta ni diseñador.',
  trustLine: 'Más de 500 emprendedores ya venden con Mi Catálogo',
}

export const heroMarqueeStores = [
  'Morning',
  'MYSA HOME',
  'Jass',
  'Luna Boutique',
  'Oro Fino',
  'Denim Co.',
] as const

export const storeScreenshots: LandingStoreScreenshot[] = [
  {
    id: 'morning',
    storeName: 'Morning',
    category: 'Pijamas & loungewear',
    imageUrl: '/landing/stores/morning-showcase.jpg',
    imageAlt: 'Tienda Morning con carrusel de pijamas y hero rosa',
  },
  {
    id: 'mysa',
    storeName: 'MYSA HOME',
    category: 'Hogar & decoración',
    imageUrl: '/landing/stores/mysa-hero.png',
    imageAlt: 'Tienda MYSA HOME con estilo cálido y minimalista',
  },
  {
    id: 'jass',
    storeName: 'Jass',
    category: 'Joyería & accesorios',
    imageUrl: '/landing/stores/jass-product.png',
    imageAlt: 'Página de producto Jass con cadena Happy days',
  },
  {
    id: 'mysa-mobile',
    storeName: 'MYSA HOME',
    category: 'Experiencia mobile',
    imageUrl: '/landing/stores/mysa-mobile.png',
    imageAlt: 'Vista mobile de producto en MYSA HOME',
  },
]

export const successStories: LandingSuccessStory[] = [
  {
    id: 'camila',
    name: 'Camila R.',
    role: 'Morning · Pijamas',
    quote: 'Mis clientas eligen solas en el catálogo y me llega el pedido listo por WhatsApp.',
    resultLabel: 'Primera venta en',
    resultValue: '24 h',
  },
  {
    id: 'andrea',
    name: 'Andrea M.',
    role: 'MYSA HOME · Decoración',
    quote: 'La tienda se ve tan premium que mis clientas confían desde el primer clic.',
    resultLabel: 'Pedidos por semana',
    resultValue: '+40',
  },
  {
    id: 'jass',
    name: 'Jessica L.',
    role: 'Jass · Joyería',
    quote: 'Subí fotos desde el celular y en minutos tenía un catálogo que parece diseñado.',
    resultLabel: 'Conversión',
    resultValue: '+28%',
  },
  {
    id: 'luna',
    name: 'Valentina S.',
    role: 'Luna Boutique · Moda',
    quote: 'Dejé de mandar PDFs. Ahora comparto un link y vendo mucho más ordenado.',
    resultLabel: 'Tiempo ahorrado',
    resultValue: '3 h/día',
  },
  {
    id: 'denim',
    name: 'Mateo G.',
    role: 'Denim Co. · Streetwear',
    quote: 'El checkout integrado me ayudó a cerrar ventas sin ir y venir por chat.',
    resultLabel: 'Ticket promedio',
    resultValue: '+18%',
  },
]

export const storeExamples: LandingStoreExample[] = [
  {
    id: 'morning',
    preset: 'boutique',
    storeName: 'Morning',
    category: 'Pijamas & loungewear',
    tagline: 'Hero editorial con temporada y colecciones que enamoran',
    products: [
      { name: 'Set Kuromi lilac', price: '$189.000', imageUrl: '/landing/stores/morning-hero.png', hue: 290 },
      { name: 'Pijama Marie rosa', price: '$175.000', imageUrl: '/landing/stores/morning-hero.png', hue: 340 },
      { name: 'Camisón premium', price: '$142.000', imageUrl: '/landing/stores/morning-hero.png', hue: 320 },
    ],
  },
  {
    id: 'mysa-home',
    preset: 'morning',
    storeName: 'MYSA HOME',
    category: 'Hogar & decoración',
    tagline: 'Tonos cálidos, tipografía serena y productos que invitan al confort',
    products: [
      { name: 'Manta tejido jacquard', price: '$190.000', imageUrl: '/landing/stores/mysa-mobile.png', hue: 35 },
      { name: 'Cojín lino natural', price: '$89.000', imageUrl: '/landing/stores/mysa-hero.png', hue: 40 },
      { name: 'Throw fringed cream', price: '$124.000', imageUrl: '/landing/stores/mysa-hero.png', hue: 42 },
    ],
  },
  {
    id: 'jass',
    preset: 'minimal',
    storeName: 'Jass',
    category: 'Joyería & accesorios',
    tagline: 'Detalle de producto impecable con variantes y ofertas',
    products: [
      { name: 'Cadena Happy days', price: '$62.400', imageUrl: '/landing/stores/jass-product.png', hue: 330 },
      { name: 'Aretes Mariposa Rosa', price: '$58.000', imageUrl: '/landing/stores/jass-product.png', hue: 350 },
      { name: 'Anillo dorado 18k', price: '$95.000', imageUrl: '/landing/stores/jass-product.png', hue: 38 },
    ],
  },
  {
    id: 'luna-boutique',
    preset: 'ios',
    storeName: 'Luna Boutique',
    category: 'Moda & belleza',
    tagline: 'Cuadrícula limpia para marcas con muchos SKUs',
    products: [
      { name: 'Kit maquillaje VELA', price: '$124.000', imageUrl: '/landing/products/luna-makeup-set.png', hue: 350 },
      { name: 'Audífonos inalámbricos', price: '$289.000', imageUrl: '/landing/products/luna-earbuds.png', hue: 210 },
      { name: 'Pantalón navy', price: '$189.000', imageUrl: '/landing/products/luna-trousers.png', hue: 230 },
    ],
  },
]

export const bentoFeatures: LandingBentoFeature[] = [
  {
    id: 'catalogo',
    label: 'Editorial',
    title: 'Catálogo que impresiona',
    description:
      'Cinco estilos listos para usar. Tu tienda se ve como marca premium desde el primer día.',
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
    id: 'inventario',
    label: 'Simple',
    title: 'Inventario claro',
    description: 'Subí productos desde el celular. Fotos, precios, stock — todo en un panel claro.',
    size: 'small',
    accent: 'neutral',
  },
  {
    id: 'envios',
    label: 'Colombia',
    title: 'Envíos por ciudad',
    description: 'Tarifas con DIVIPOLA. Tus clientes ven el costo antes de pagar.',
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
]

export const howItWorksSteps: LandingStep[] = [
  {
    id: 'registro',
    step: 1,
    title: 'Registrá tu tienda',
    description: 'Nombre, WhatsApp y listo. Tu link queda en mitienda.micatalogo.io en minutos.',
  },
  {
    id: 'productos',
    step: 2,
    title: 'Subí tus productos',
    description: 'Fotos desde el celular, precios en pesos colombianos y elegí el estilo de tu catálogo.',
  },
  {
    id: 'vender',
    step: 3,
    title: 'Compartí y vendé',
    description: 'Mandá el link por WhatsApp, Instagram o donde quieras. Los pedidos te llegan organizados.',
  },
]

export const zeroCostContent = {
  eyebrow: 'Sin barreras',
  headline: 'Empezá a vender sin pagar un solo peso.',
  subheadline:
    'No pedimos tarjeta de crédito. No hay costo de setup. Creá tu tienda, probá la plataforma y empezá a vender desde el día uno.',
  highlights: [
    { label: 'Registro gratuito', detail: 'Creá tu cuenta en menos de 2 minutos' },
    { label: 'Catálogo incluido', detail: 'Tu tienda online con link propio' },
    { label: 'Sin letra chica', detail: 'Transparente desde el primer clic' },
  ],
}

export const finalCtaContent = {
  headline: '¿Listo para tener la tienda que siempre quisiste?',
  subheadline: 'Un catálogo hermoso te espera. Registrate y empezá a vender hoy.',
}

export const footerContent = {
  tagline: 'Catálogos online para emprendedores colombianos.',
  copyright: `© ${new Date().getFullYear()} mi catálogo`,
}
