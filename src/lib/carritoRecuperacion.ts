import { buildCarritoRecuperacionCheckoutUrl } from '@/lib/carritoIniciado'
import { whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'
import type { McCarritoIniciado, McCuponTienda, McTenant } from '@/types/mc'

function formatCopPlain(n: number) {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${n}`
  }
}

export function generateRecoveryCouponCode(): string {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase()
  return `RECUP-${suffix}`
}

export function buildRecoveryCoupon(
  carritoId: string,
  descuentoPorcentaje: number,
): McCuponTienda {
  const pct = Math.min(100, Math.max(0, Math.round(descuentoPorcentaje)))
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `recup-${Date.now()}`,
    codigo: generateRecoveryCouponCode(),
    tipo: 'porcentaje',
    valor: pct,
    activo: true,
    esRecuperacion: true,
    carritoIniciadoId: carritoId,
  }
}

export function mergeRecoveryCouponIntoTenant(
  tenant: McTenant,
  cupon: McCuponTienda,
): McCuponTienda[] {
  const prev = tenant.cuponesCatalogo ?? []
  const sinPreviosRecup = prev.filter(
    (c) => !(c.esRecuperacion === true && c.carritoIniciadoId === cupon.carritoIniciadoId),
  )
  return [...sinPreviosRecup, cupon]
}

export function buildRecordatorioWhatsappText(opts: {
  tenant: McTenant
  carrito: McCarritoIniciado
  carritoId: string
  slug: string
  origin: string
  cuponCodigo: string
  descuentoPorcentaje: number
}): string {
  const { tenant, carrito, slug, origin, cuponCodigo, descuentoPorcentaje } = opts
  const tienda = tenant.nombreTienda?.trim() || 'nuestra tienda'
  const link = buildCarritoRecuperacionCheckoutUrl(
    origin,
    slug,
    opts.carritoId,
    descuentoPorcentaje > 0 ? cuponCodigo : undefined,
  )
  const lineas = carrito.lineas
    .map((l) => `• ${l.referencia?.trim() || l.titulo} × ${l.cantidad}`)
    .join('\n')
  const partes = [
    `Hola${carrito.clienteNombre ? ` ${carrito.clienteNombre.split(' ')[0]}` : ''} 👋`,
    '',
    `Dejaste productos en el carrito de *${tienda}*. ¿Querés terminar tu compra?`,
    '',
    lineas || '• Tus productos guardados',
    '',
    `Subtotal: ${formatCopPlain(carrito.subtotalCop)}`,
  ]
  if (descuentoPorcentaje > 0) {
    partes.push(
      '',
      `Te dejamos un *${descuentoPorcentaje}% de descuento* con el código *${cuponCodigo}* (ya aplicado en el link).`,
    )
  } else {
    partes.push('', 'Retomá tu pedido desde este link:')
  }
  partes.push('', link, '', '¡Gracias!')
  return partes.join('\n')
}

export function recordatorioWhatsappUrl(
  clienteTelefono: string,
  text: string,
): string | null {
  const digits = clienteTelefono.replace(/\D/g, '')
  if (digits.length < 10) return null
  return whatsappUrlFromNumber(digits, text)
}
