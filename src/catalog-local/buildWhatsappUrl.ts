import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'

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

export function buildPedidoWhatsappTextSimple(lines: LineaCarritoSimple[], intro?: string): string {
  const head = intro?.trim() || 'Hola 👋 Quiero pedir desde el catálogo:'
  const body = lines
    .map((l) => {
      const price =
        l.precioUnitarioCop != null && l.precioUnitarioCop > 0 ? ` · ${formatCopPlain(l.precioUnitarioCop)} c/u` : ''
      const sub = l.subtitulo ? ` (${l.subtitulo})` : ''
      return `• ${l.titulo}${sub} — ${l.cantidad} u${price}`
    })
    .join('\n')
  const total = lines.reduce((s, l) => s + l.cantidad, 0)
  return `${head}\n\n${body}\n\nTotal unidades: ${total}\n\n¿Me confirman disponibilidad?`
}

export function whatsappUrlFromNumber(numeroDigits: string, text: string) {
  const n = numeroDigits.replace(/\D/g, '')
  if (!n) return null
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}
