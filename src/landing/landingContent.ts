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
  size: 'large' | 'medium' | 'small'
  accent: 'gold' | 'neutral' | 'dark'
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
  headlineAccent: 'espectacular.',
  subheadline:
    'Creá tu catálogo WhatsApp y tienda virtual hermosa. Compartila y empezá a vender hoy — gratis, sin tarjeta ni diseñador.',
  trustLine: 'Más de 500 emprendedores ya venden con Mi Catálogo',
}

export const storeExamples: LandingStoreExample[] = [
  {
    id: 'luna-boutique',
    preset: 'boutique',
    storeName: 'Luna Boutique',
    category: 'Moda, belleza & más',
    tagline: 'Productos que se ven increíbles en tu catálogo',
    products: [
      { name: 'Kit maquillaje VELA', price: '$124.000', imageUrl: '/landing/products/luna-makeup-set.png', hue: 350 },
      { name: 'Audífonos inalámbricos', price: '$289.000', imageUrl: '/landing/products/luna-earbuds.png', hue: 210 },
      { name: 'Pantalón navy', price: '$189.000', imageUrl: '/landing/products/luna-trousers.png', hue: 230 },
      { name: 'Combo PS5 digital', price: '$1.890.000', imageUrl: '/landing/products/luna-gaming.png', hue: 220 },
    ],
  },
  {
    id: 'oro-fino',
    preset: 'minimal',
    storeName: 'Oro Fino',
    category: 'Joyería & lujo',
    tagline: 'Piezas únicas, presentación impecable',
    products: [
      { name: 'Anillo solitario', price: '$890.000', imageUrl: '/landing/products/oro-ring.jpg', hue: 38 },
      { name: 'Collar perla', price: '$420.000', imageUrl: '/landing/products/oro-pearl.jpg', hue: 45 },
      { name: 'Aretes oro 18k', price: '$650.000', imageUrl: '/landing/products/oro-earrings.jpg', hue: 42 },
    ],
  },
  {
    id: 'denim-co',
    preset: 'ios',
    storeName: 'Denim Co.',
    category: 'Moda & streetwear',
    tagline: 'Lookbook limpio, venta directa',
    products: [
      { name: 'Jean wide leg', price: '$189.000', imageUrl: '/landing/products/denim-jeans.jpg', hue: 220 },
      { name: 'Blazer oversize', price: '$195.000', imageUrl: '/landing/products/denim-shirt.jpg', hue: 210 },
      { name: 'Hoodie premium', price: '$145.000', imageUrl: '/landing/products/denim-hoodie.jpg', hue: 225 },
      { name: 'Gorra street', price: '$48.000', imageUrl: '/landing/products/denim-hat.jpg', hue: 215 },
    ],
  },
  {
    id: 'mini-mundo',
    preset: 'bold',
    storeName: 'Mini Mundo',
    category: 'Niños & regalos',
    tagline: 'Color, alegría y claridad',
    products: [
      { name: 'Set didáctico', price: '$67.000', imageUrl: '/landing/products/mini-toys.jpg', hue: 180 },
      { name: 'Peluche gigante', price: '$89.000', imageUrl: '/landing/products/mini-plush.jpg', hue: 160 },
      { name: 'Mochila escolar', price: '$112.000', imageUrl: '/landing/products/mini-backpack.jpg', hue: 190 },
    ],
  },
]

export const bentoFeatures: LandingBentoFeature[] = [
  {
    id: 'catalogo',
    title: 'Catálogo que impresiona',
    description:
      'Cinco estilos editoriales listos para usar. Tu tienda se ve como marca premium desde el primer día.',
    size: 'large',
    accent: 'dark',
  },
  {
    id: 'whatsapp',
    title: 'Venta por WhatsApp',
    description: 'Tus clientes eligen, agregan al carrito y te llega el pedido listo para confirmar.',
    size: 'medium',
    accent: 'gold',
  },
  {
    id: 'checkout',
    title: 'Checkout integrado',
    description: 'Pagos en línea con OnePay cuando quieras activarlo. Vos decidís cómo cobrar.',
    size: 'medium',
    accent: 'neutral',
  },
  {
    id: 'inventario',
    title: 'Inventario simple',
    description: 'Subí productos desde el celular. Fotos, precios, stock — todo en un panel claro.',
    size: 'small',
    accent: 'neutral',
  },
  {
    id: 'envios',
    title: 'Envíos Colombia',
    description: 'Tarifas por ciudad con DIVIPOLA. Tus clientes ven el costo antes de pagar.',
    size: 'small',
    accent: 'neutral',
  },
  {
    id: 'cupones',
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
