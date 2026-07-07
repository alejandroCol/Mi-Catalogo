import { formatCop } from '@/lib/formatCop'
import {
  DEFAULT_PLAN_EXPERT_PRECIO_ANUAL_COP,
  DEFAULT_PLAN_EXPERT_PRECIO_MENSUAL_COP,
  DEFAULT_PLAN_EXPERT_MAX_PRODUCTOS,
} from '@/lib/billingPlans'
import {
  pasarelaMicatalogoNetAfterWithdrawalCop,
  pasarelaMicatalogoWithdrawalFeeCop,
  pasarelaTxBaseFeePerPaymentCop,
  pasarelaTxFeePerPaymentCop,
  pasarelaTxIvaOnCommissionCop,
  pasarelaTxNetPerPaymentCop,
  PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP,
} from '@/lib/pasarelaFees'
import { pitchPasarelaOnePay, pitchPasarelaTxCommissionLabel } from '@/vendedor/vendedorPitchContent'

export const TALLER_PITCH_SLIDE_COUNT = 7

export const tallerPitchSlideLabels = [
  'Inicio',
  'Mi Catálogo',
  'Resultados',
  'Manos a la obra',
  'Comisiones',
  'POS',
  'Planes',
] as const

export const tallerPitchFeatures = [
  {
    id: 'catalogo',
    title: 'E-commerce premium',
    description: '5 estilos editoriales listos. Tu marca se ve profesional desde el día uno.',
    accent: 'dark' as const,
  },
  {
    id: 'pos',
    title: 'Punto de venta (POS)',
    description: 'Cobrá en tienda física con caja, tickets e inventario sincronizado con tu ecommerce.',
    accent: 'gold' as const,
  },
  {
    id: 'inventario',
    title: 'Inventario simple',
    description: 'Fotos, precios y stock desde el celular. Todo en un panel claro.',
    accent: 'neutral' as const,
  },
  {
    id: 'checkout',
    title: 'Checkout integrado',
    description: 'Cobrá en línea con OnePay cuando quieras activarlo.',
    accent: 'gold' as const,
  },
  {
    id: 'envios',
    title: 'Envíos Colombia',
    description: 'Tarifas por ciudad. Tus clientes ven el costo antes de pagar.',
    accent: 'neutral' as const,
  },
  {
    id: 'cupones',
    title: 'Cupones y promos',
    description: 'Ofertas, banners de temporada y recuperación de carritos.',
    accent: 'neutral' as const,
  },
]

export const tallerPitchResults = [
  {
    id: 'tienda',
    value: 'Tiempo',
    label: 'Para tener tu tienda online lista',
    detail: 'Registro, productos y link propio en la misma sesión',
  },
  {
    id: 'pedidos',
    value: '24/7',
    label: 'Tu catálogo vende sin descanso',
    detail: 'Pedidos que llegan organizados mientras vos hacés otras cosas',
  },
  {
    id: 'imagen',
    value: 'Profesional',
    label: 'Imagen de marca profesional',
    detail: 'Dejás de parecer un PDF en WhatsApp',
  },
  {
    id: 'control',
    value: 'Una sola aplicación',
    label: 'Todo centralizado',
    detail: 'Inventario, ventas online y POS sincronizados',
  },
]

export const tallerPitchPosFeatures = [
  {
    icon: 'multi-sede' as const,
    title: 'Multi-sede',
    desc: 'Varios puntos de venta con bodega central.',
    tone: 'gold' as const,
  },
  {
    icon: 'caja' as const,
    title: 'Caja del día',
    desc: 'Turnos, arqueo e ingresos/egresos en tiempo real.',
    tone: 'cream' as const,
  },
  {
    icon: 'printer' as const,
    title: 'Tickets térmicos',
    desc: 'Impresión ESC/POS y cajón monedero.',
    tone: 'dark' as const,
  },
  {
    icon: 'sync' as const,
    title: 'Sync con ecommerce',
    desc: 'Un solo inventario: tienda online y tienda física.',
    tone: 'gold' as const,
  },
]

/** Ejemplo de venta de $100.000 COP para la slide de comisiones. */
export const TALLER_PITCH_SALE_EXAMPLE_COP = 100_000

export const tallerPitchCommissionExample = {
  grossCop: TALLER_PITCH_SALE_EXAMPLE_COP,
  baseFeeCop: pasarelaTxBaseFeePerPaymentCop(TALLER_PITCH_SALE_EXAMPLE_COP),
  ivaCop: pasarelaTxIvaOnCommissionCop(TALLER_PITCH_SALE_EXAMPLE_COP),
  totalFeeCop: pasarelaTxFeePerPaymentCop(TALLER_PITCH_SALE_EXAMPLE_COP),
  netCop: pasarelaTxNetPerPaymentCop(TALLER_PITCH_SALE_EXAMPLE_COP),
  rateLabel: pitchPasarelaTxCommissionLabel,
  trustClients: pitchPasarelaOnePay.trustClients,
  commissionNote: pitchPasarelaOnePay.commissionNote,
}

const tallerPitchNetAfterSaleCop = tallerPitchCommissionExample.netCop
const tallerPitchWithdrawalFeeCop = pasarelaMicatalogoWithdrawalFeeCop(tallerPitchNetAfterSaleCop)

export const tallerPitchPasarelaModes = [
  {
    id: 'sin-cuenta' as const,
    badge: 'Rápido',
    title: 'Sin cuenta OnePay',
    subtitle: 'Pasarela Mi Catálogo — cobrás en línea sin crear tu comercio.',
    withdrawalLabel: 'Costo por cada retiro',
    withdrawalRate: `0,02% + ${formatCop(PASARELA_MICATALOGO_WITHDRAWAL_FIXED_COP)}`,
    withdrawalFeeCop: tallerPitchWithdrawalFeeCop,
    netFinalCop: pasarelaMicatalogoNetAfterWithdrawalCop(tallerPitchNetAfterSaleCop),
    timing: '1 día hábil',
    timingDetail: 'Procesás el retiro cuando quieras desde Ventas',
    tone: 'neutral' as const,
  },
  {
    id: 'con-cuenta' as const,
    badge: 'Recomendado',
    title: 'Con cuenta OnePay',
    subtitle: 'Tu comercio OnePay propio — pagos directo a tu pasarela.',
    withdrawalLabel: 'Dispersión a tu banco',
    withdrawalRate: 'Gratis',
    withdrawalFeeCop: 0,
    netFinalCop: tallerPitchNetAfterSaleCop,
    timing: 'Todos los días',
    timingDetail: 'El dinero llega a tu cuenta sin costo extra',
    tone: 'gold' as const,
    recommended: true,
  },
]

export const tallerPitchPlans = {
  expert: {
    name: 'Expert',
    priceMonthly: formatCop(DEFAULT_PLAN_EXPERT_PRECIO_MENSUAL_COP),
    priceAnnual: formatCop(DEFAULT_PLAN_EXPERT_PRECIO_ANUAL_COP),
    priceNote: 'Publicá tu tienda y cobrá en caja',
    highlights: [
      `Hasta ${DEFAULT_PLAN_EXPERT_MAX_PRODUCTOS} productos`,
      'Tienda online publicada con link propio',
      'Estilos premium de catálogo',
      'Ventas en POS y checkout OnePay',
      'Cupones, envíos y promos',
    ],
  },
}

export const tallerPitchBenefits = [
  'Dominio incluido (tu tienda en micatalogo.io)',
  'Sin comisión por venta de Mi Catálogo',
  'Hosting y actualizaciones incluidas',
  'Soporte en español para emprendedores colombianos',
]
