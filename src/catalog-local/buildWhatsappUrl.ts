import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { formatCopPlain, formatLineasCarritoWhatsapp } from '@/catalog-local/formatWhatsappCartLine'

export function buildPedidoWhatsappTextSimple(lines: LineaCarritoSimple[], intro?: string): string {
  const head = intro?.trim() || 'Hola 👋 Quiero pedir desde el catálogo:'
  const body = formatLineasCarritoWhatsapp(lines)
  const total = lines.reduce((s, l) => s + l.cantidad, 0)
  return `${head}\n\n${body}\n\nTotal unidades: ${total}\n\n¿Me confirman disponibilidad?`
}

export type CheckoutWhatsappContext = {
  nombre: string
  telefono: string
  email?: string
  clienteTipoDocumento: string
  clienteDocumentoNumero: string
  envioDepartamento: string
  envioCiudad: string
  envioDireccion: string
  envioReferencia?: string
  nota?: string
  subtotalCop: number
  envioCop: number
  descuentoCop: number
  totalCop: number
  envioLabel: string
  cuponCodigo?: string
}

export function buildCheckoutWhatsappText(
  lines: LineaCarritoSimple[],
  intro: string | undefined,
  ctx: CheckoutWhatsappContext,
): string {
  const head = intro?.trim() || 'Hola 👋 Quiero hacer este pedido:'
  const body = formatLineasCarritoWhatsapp(lines)
  const partes: string[] = [
    head,
    '',
    body,
    '',
    `Subtotal: ${formatCopPlain(ctx.subtotalCop)}`,
  ]
  if (ctx.descuentoCop > 0) {
    partes.push(
      `Descuento${ctx.cuponCodigo ? ` (${ctx.cuponCodigo})` : ''}: −${formatCopPlain(ctx.descuentoCop)}`,
    )
  }
  if (ctx.envioCop > 0) {
    partes.push(`${ctx.envioLabel}: ${formatCopPlain(ctx.envioCop)}`)
  } else if (ctx.subtotalCop > 0) {
    partes.push(`${ctx.envioLabel}: gratis`)
  }
  partes.push(`Total: ${formatCopPlain(ctx.totalCop)}`, '', 'Mis datos:', `Nombre: ${ctx.nombre}`)
  if (ctx.email?.trim()) partes.push(`Correo: ${ctx.email.trim()}`)
  partes.push(
    `Teléfono: ${ctx.telefono}`,
    `Documento: ${ctx.clienteTipoDocumento} ${ctx.clienteDocumentoNumero}`,
    '',
    'Envío:',
    `${ctx.envioDepartamento} · ${ctx.envioCiudad}`,
    ctx.envioDireccion,
  )
  if (ctx.envioReferencia?.trim()) {
    partes.push(`Referencia de entrega: ${ctx.envioReferencia.trim()}`)
  }
  if (ctx.nota?.trim()) partes.push('', `Nota: ${ctx.nota.trim()}`)
  partes.push('', '¿Me confirman disponibilidad y forma de pago?')
  return partes.join('\n')
}

export function whatsappUrlFromNumber(numeroDigits: string, text: string) {
  const n = numeroDigits.replace(/\D/g, '')
  if (!n) return null
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}
