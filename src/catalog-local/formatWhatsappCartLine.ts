import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'

export function formatCopPlain(n: number): string {
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

function parseTituloPartes(titulo: string): { nombre: string; variantes: string[] } {
  const partes = titulo
    .split(' · ')
    .map((p) => p.trim())
    .filter(Boolean)
  if (partes.length <= 1) return { nombre: titulo.trim(), variantes: [] }
  return { nombre: partes[0]!, variantes: partes.slice(1) }
}

function subtituloEsPrecioUnitario(subtitulo: string | undefined, precio: number | undefined): boolean {
  if (!subtitulo?.trim() || precio == null || precio <= 0) return false
  const subDigits = subtitulo.replace(/\D/g, '')
  const priceDigits = String(Math.round(precio))
  if (subDigits === priceDigits) return true
  return subtitulo.trim() === formatCopPlain(precio)
}

function detalleComboColorSeleccion(l: LineaCarritoSimple): string | null {
  if (!l.comboColorSeleccion?.length) return null
  const picks = l.comboColorSeleccion
    .map((s) => {
      const partes: string[] = []
      if (s.varianteNombre?.trim()) partes.push(s.varianteNombre.trim())
      if (s.tallaNombre?.trim()) partes.push(s.tallaNombre.trim())
      return partes.join(' · ')
    })
    .filter(Boolean)
  return picks.length ? picks.join(' · ') : null
}

/** Color, talla u opciones de combo — excluye subtítulos que duplican el precio. */
export function detalleVariantesLineaWhatsapp(l: LineaCarritoSimple): string | null {
  const comboDetalle = detalleComboColorSeleccion(l)
  if (comboDetalle) return comboDetalle

  if (l.subtitulo?.trim() && !subtituloEsPrecioUnitario(l.subtitulo, l.precioUnitarioCop)) {
    return l.subtitulo.trim()
  }

  const { variantes } = parseTituloPartes(l.titulo)
  return variantes.length ? variantes.join(' · ') : null
}

export function formatLineaCarritoWhatsapp(l: LineaCarritoSimple): string {
  const { nombre } = parseTituloPartes(l.titulo)
  const ref = l.referencia?.trim()
  const detalle = detalleVariantesLineaWhatsapp(l)
  const qty = `${l.cantidad} u`
  const precio =
    l.precioUnitarioCop != null && l.precioUnitarioCop > 0
      ? `${formatCopPlain(l.precioUnitarioCop)} c/u`
      : null

  // La referencia (nombre + número) identifica la prenda en el pedido WhatsApp.
  const lineas = [`• ${ref || nombre}`]
  if (detalle) lineas.push(`  ${detalle}`)
  const cola = [qty, precio].filter(Boolean).join(' · ')
  if (cola) lineas.push(`  ${cola}`)
  return lineas.join('\n')
}

export function formatLineasCarritoWhatsapp(lines: LineaCarritoSimple[]): string {
  return lines.map(formatLineaCarritoWhatsapp).join('\n')
}
