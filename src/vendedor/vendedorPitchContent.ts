import { formatCop } from '@/lib/formatCop'

export const MC_MONTHLY_PRICE_COP = 29_900

export const pitchHero = {
  eyebrow: 'Ventas online sin fricción',
  headline: 'Tu tienda vende',
  headlineAccent: '24 horas al día.',
  subheadline:
    'Mi Catálogo convierte tu catálogo en una tienda virtual profesional que cobra, envía y atiende — sin contratar vendedores, sin pagar dominio y sin sorpresas en la factura.',
  priceLabel: `${formatCop(MC_MONTHLY_PRICE_COP)} / mes`,
  priceNote: 'Todo incluido · Sin costos ocultos',
}

export type PitchComparisonRow = {
  feature: string
  micatalogo: string
  shopify: string
  highlight?: boolean
}

export const shopifyComparison: PitchComparisonRow[] = [
  {
    feature: 'Costo mensual base',
    micatalogo: formatCop(MC_MONTHLY_PRICE_COP),
    shopify: '~$160.000 COP (Basic ~$39 USD)',
    highlight: true,
  },
  {
    feature: 'Dominio propio',
    micatalogo: 'Incluido (tu tienda en micatalogo.io)',
    shopify: 'Pagar aparte (~$60.000/año)',
    highlight: true,
  },
  {
    feature: 'Hosting / infraestructura',
    micatalogo: 'Incluido',
    shopify: 'Incluido en plan, pero apps y temas extra',
  },
  {
    feature: 'Comisión por venta',
    micatalogo: 'Solo pasarela de pago (como cualquier tienda)',
    shopify: '2% adicional si no usás Shopify Payments',
  },
  {
    feature: 'Apps para checkout Colombia',
    micatalogo: 'Integrado (WhatsApp, envíos, cupones)',
    shopify: 'Apps de pago + envío ($10–30 USD/mes c/u)',
  },
  {
    feature: 'Vendedor humano',
    micatalogo: 'Tu tienda ES el vendedor — siempre activa',
    shopify: 'Necesitás equipo o tiempo propio para cerrar',
    highlight: true,
  },
  {
    feature: 'Tiempo de implementación',
    micatalogo: 'Minutos: subís productos y compartís link',
    shopify: 'Días/semanas: tema, apps, configuración',
  },
  {
    feature: 'Diseño del catálogo',
    micatalogo: 'Plantillas premium listas (como app nativa)',
    shopify: 'Tema premium $100–350 USD (una vez)',
  },
]

export const pitchValueProps = [
  {
    id: 'always-on',
    title: 'Vende mientras dormís',
    description:
      'Tu catálogo no pide vacaciones ni comisiones. Cada visita puede convertirse en pedido con checkout integrado, cupones y seguimiento de envío.',
    icon: 'clock' as const,
  },
  {
    id: 'no-hidden',
    title: 'Un solo precio, todo incluido',
    description:
      'Sin dominio aparte. Sin hosting aparte. Sin pagar desarrollador para que se vea bien. Un plan claro de $29.900 al mes.',
    icon: 'shield' as const,
  },
  {
    id: 'colombia',
    title: 'Hecho para vender en Colombia',
    description:
      'WhatsApp, ciudades DIVIPOLA, transportadoras locales, Nequi/tarjeta vía pasarela. No adaptás una plataforma gringa: ya está pensada para tu mercado.',
    icon: 'map' as const,
  },
  {
    id: 'pro-image',
    title: 'Imagen de marca premium',
    description:
      'Catálogo con fotos grandes, variantes, ofertas y estilos boutique. Tu marca se ve como tienda de autor, no como un PDF en WhatsApp.',
    icon: 'sparkle' as const,
  },
]

export const pitchClosingLines = [
  'La pregunta no es si necesitás vender online.',
  'La pregunta es cuántas ventas perdés cada día sin una tienda que trabaje por vos.',
]
