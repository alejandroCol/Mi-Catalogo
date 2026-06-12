import { formatCop } from '@/lib/formatCop'
import { ONEPAY_MERCHANT_TX_RATE } from '@/lib/pasarelaFees'

export const MC_MONTHLY_PRICE_COP = 29_900
export const MC_ANNUAL_PRICE_COP = 299_900

const TX_PCT_LABEL = (ONEPAY_MERCHANT_TX_RATE * 100).toFixed(2).replace('.', ',')

/** Comisión por transacción de la pasarela OnePay (no de Mi Catálogo). */
export const pitchPasarelaTxCommissionLabel = `${TX_PCT_LABEL}% + $ 800 + IVA (IVA solo sobre la comisión)`

/** Costo de dispersión sin cuenta comercio OnePay propia. */
export const pitchPasarelaDispersionSinCuentaLabel = '0,1% + $800 COP'

export const pitchHero = {
  eyebrow: 'Ventas online sin fricción',
  headline: 'Tu tienda vende',
  headlineAccent: '24 horas al día.',
  subheadline:
    'Mi Catálogo convierte tu catálogo en una tienda virtual profesional que cobra, envía y atiende — sin contratar vendedores, sin pagar dominio y sin sorpresas en la factura.',
  priceLabel: `${formatCop(MC_MONTHLY_PRICE_COP)} / mes`,
  priceNote: 'Todo incluido · Sin costos ocultos',
  annualPriceLabel: `${formatCop(MC_ANNUAL_PRICE_COP)} / año`,
  annualPriceHighlight: 'Ahorrás 2 meses de membresía',
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
    id: 'fast-start',
    title: 'Arrancás hoy, no la próxima semana',
    description:
      'En la misma visita dejás la tienda lista: subís productos, compartís el link y empezás a cobrar. Sin agencia, sin programador ni semanas armando algo a medida.',
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

export type PitchPasarelaMode = {
  id: 'sin-cuenta' | 'con-cuenta'
  badge: string
  title: string
  subtitle: string
  highlights: string[]
  dispersionLabel: string
  dispersionDetail: string
  timingLabel: string
  timingDetail: string
  recommended?: boolean
}

export const pitchPasarelaOnePay = {
  eyebrow: 'Pasarela de pagos',
  title: 'Cobra en línea con',
  titleAccent: ' OnePay',
  lead:
    'La misma pasarela que usan empresas de servicios públicos y telecomunicaciones en Colombia. Mi Catálogo la integra para que tu tienda cobre sin fricción.',
  commissionNote:
    'Esta comisión la cobra OnePay (la pasarela de pagos), no Mi Catálogo. Nosotros no cobramos comisión por venta: solo tu plan mensual.',
  trustTitle: 'Confían en OnePay',
  trustClients: ['Movistar', 'Promigas', 'EPM Gas', 'Efigas'] as const,
  trustFootnote: '+200 empresas activas en Colombia · PCI-DSS Level 1',
  methodsTitle: 'Métodos de pago que acepta',
  paymentMethods: ['Nequi', 'Bre-B', 'PSE', 'Tarjeta de crédito'] as const,
  modesTitle: 'Dos formas de usar la pasarela',
  modes: [
    {
      id: 'sin-cuenta',
      badge: 'Rápido',
      title: 'Sin cuenta OnePay',
      subtitle: 'Pasarela Mi Catálogo: cobrá en línea sin crear tu comercio en OnePay.',
      highlights: [
        'Activación guiada por el equipo de Mi Catálogo.',
        'El cliente paga en el checkout de tu tienda.',
        'Retirás fondos cuando quieras desde Ventas.',
      ],
      dispersionLabel: pitchPasarelaDispersionSinCuentaLabel,
      dispersionDetail: 'por cada dispersión a tu cuenta bancaria',
      timingLabel: '1 día hábil',
      timingDetail: 'tiempo de procesamiento del retiro',
    },
    {
      id: 'con-cuenta',
      badge: 'Escalable',
      title: 'Con cuenta OnePay',
      subtitle: 'Tu comercio OnePay propio: pagos directo a tu cuenta de pasarela.',
      highlights: [
        'Registrás tu empresa en OnePay (KYB).',
        'Conciliación y balance en tu panel OnePay.',
        'Ideal si ya facturás en volumen o querés escalar.',
      ],
      dispersionLabel: 'Gratis',
      dispersionDetail: 'sin costo adicional por dispersión',
      timingLabel: 'Diario',
      timingDetail: 'frecuencia de abono a tu cuenta',
      recommended: true,
    },
  ] satisfies PitchPasarelaMode[],
}
