import {
  DEFAULT_PLAN_EXPERT_MAX_PRODUCTOS,
  DEFAULT_PLAN_EXPERT_PRECIO_ANUAL_COP,
  DEFAULT_PLAN_EXPERT_PRECIO_MENSUAL_COP,
} from '@/lib/billingPlans'
import {
  ONEPAY_MERCHANT_TX_FIXED_COP,
  ONEPAY_MERCHANT_TX_RATE,
} from '@/lib/pasarelaFees'

export const LANDING_FAQ_PATH = '/preguntas-frecuentes' as const

export type LandingFaqItem = {
  id: string
  question: string
  answer: string
}

function formatCopPlain(n: number): string {
  return `$${n.toLocaleString('es-CO')}`
}

const expertMensual = formatCopPlain(DEFAULT_PLAN_EXPERT_PRECIO_MENSUAL_COP)
const expertAnual = formatCopPlain(DEFAULT_PLAN_EXPERT_PRECIO_ANUAL_COP)
const maxProductos = DEFAULT_PLAN_EXPERT_MAX_PRODUCTOS.toLocaleString('es-CO')
const comisionPct = (ONEPAY_MERCHANT_TX_RATE * 100).toFixed(2).replace('.', ',')
const comisionPasarela = `${comisionPct}% + ${formatCopPlain(ONEPAY_MERCHANT_TX_FIXED_COP)} + IVA (IVA solo sobre la comisión)`

export const faqPageContent = {
  eyebrow: 'Centro de ayuda',
  title: 'Preguntas',
  titleAccent: 'frecuentes',
  lead:
    'Respuestas claras para que decidas con tranquilidad. Si algo no está acá, escribinos por WhatsApp y te orientamos en minutos.',
  ctaTitle: '¿Todavía tenés dudas?',
  ctaLead: 'Hablemos. Te ayudamos a armar tu tienda y a elegir lo que más te conviene.',
  ctaWhatsApp: 'Escribir por WhatsApp',
  ctaRegister: 'Crear mi tienda',
} as const

/** FAQ público — tono comercial experto, conciso y honesto. */
export const landingFaqItems: LandingFaqItem[] = [
  {
    id: 'planes',
    question: '¿Qué planes manejan y qué incluye cada uno?',
    answer: `Podés registrarte gratis, armar tu tienda y explorar la plataforma sin tarjeta. Para publicar tu catálogo online y vender con tu link, activás el plan Expert: ${expertMensual}/mes o ${expertAnual}/año. Incluye tienda pública, personalización, inventario, pedidos, envíos, cupones y cobro por WhatsApp o con pasarela. Sin costos ocultos de dominio ni hosting aparte.`,
  },
  {
    id: 'productos',
    question: '¿Cuántos productos se pueden publicar en el catálogo?',
    answer: `Con Expert podés cargar hasta ${maxProductos} productos. Cada uno con fotos, precio, stock y variantes. Es más que suficiente para la mayoría de marcas que venden por Instagram o WhatsApp; si crecés mucho, hablamos de ampliar el límite.`,
  },
  {
    id: 'personalizacion',
    question: '¿El catálogo es personalizable?',
    answer:
      'Sí. Elegís el estilo visual de tu tienda, subís tu logo, ajustás tipografías, colores de marca y banners de temporada. La idea es que se vea como tu marca — no como una plantilla genérica — sin necesitar diseñador ni código.',
  },
  {
    id: 'enlace',
    question: '¿Cómo queda el enlace que se comparte con los clientes?',
    answer:
      'Tu tienda queda en un link corto y profesional con tu nombre: tunombre.micatalogo.io. Ese es el que pegás en la bio de Instagram, en historias, en WhatsApp Status o en tu tarjeta. Un solo link, siempre actualizado.',
  },
  {
    id: 'pausa-pago',
    question:
      'Si dejo de pagar un mes y retomo después, ¿se conserva mi información?',
    answer:
      'Sí. Tus productos, diseño, pedidos y configuración se conservan en tu cuenta. Si pausás el plan, la tienda puede dejar de estar pública hasta que reactives Expert; al retomar, no tenés que cargar todo de cero. Hay un período de gracia corto si un cobro falla, para que no pierdas ventas de un día para otro.',
  },
  {
    id: 'pasarela',
    question: '¿Puedo integrar la pasarela que ya uso, o debo usar la de ustedes? ¿Qué comisión tiene?',
    answer: `Hoy el cobro en línea va con OnePay, la pasarela que integramos (Nequi, Bre-B, PSE y tarjeta). No conectamos pasarelas externas arbitrarias. La comisión por transacción la cobra OnePay (${comisionPasarela}); Mi Catálogo no cobra porcentaje por venta — solo el plan mensual o anual. También podés empezar coordinando pedidos por WhatsApp y activar la pasarela cuando quieras.`,
  },
  {
    id: 'redes',
    question: '¿La plataforma permite integrar WhatsApp, Instagram y Facebook?',
    answer:
      'WhatsApp está al centro: tus clientes pueden pedirte o pagarte y el pedido te llega ordenado. Instagram y Facebook los vinculás como redes de tu marca (ideal para el pie de la tienda y para mandar tráfico desde la bio). En la práctica, Mi Catálogo es el destino profesional de tus redes: un link que vende, no un PDF o un chat eterno.',
  },
  {
    id: 'inventario',
    question: '¿Puedo manejar inventario y organizar productos por categorías?',
    answer:
      'Sí. Cargás stock, precios y variantes, y organizás el catálogo por categorías o secciones para que se navegue fácil. Un catálogo ordenado reduce preguntas repetidas y aumenta la conversión: el cliente encuentra rápido lo que busca.',
  },
  {
    id: 'permanencia',
    question: '¿Hay tiempo mínimo de permanencia o puedo cancelar cuando quiera?',
    answer:
      'No hay permanencia mínima. Podés cancelar el débito automático cuando quieras; seguís con acceso hasta el final del período ya pagado. Sin letras chicas ni multas por salir.',
  },
  {
    id: 'tiempo-setup',
    question: '¿Cuánto tarda poner la tienda a vender?',
    answer:
      'Muchas marcas publican el mismo día: registro, logo, unos productos con foto buena y el link listo para la bio. Lo que más importa no es la tecnología — es subir productos claros con precio. Nosotros te acompañamos si te trabás en el camino.',
  },
  {
    id: 'pagos-cliente',
    question: '¿Con qué puede pagar mi cliente?',
    answer:
      'Con pasarela: Nequi, Bre-B, PSE y tarjeta de crédito, directo en el checkout. Si preferís el modelo clásico, coordinás el pago por WhatsApp (transferencia, contraentrega, etc.) y igual tenés el pedido organizado en tu panel.',
  },
]
