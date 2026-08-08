import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { formatCop } from '@/lib/formatCop'

export function canUseWebShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Devuelve false si no hay API, no es compartible o el usuario canceló. */
export async function shareSafe(data: ShareData): Promise<boolean> {
  if (!canUseWebShare()) return false
  try {
    if (navigator.canShare && !navigator.canShare(data)) return false
    await navigator.share(data)
    return true
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'AbortError') return true
    return false
  }
}

export function buildProductShareData(opts: {
  nombreTienda: string
  productName: string
  productUrl: string
  /** URL con OG tags para WhatsApp/IG (preferida al compartir). */
  sharePreviewUrl?: string
  priceLabel?: string
}): ShareData {
  const priceBit = opts.priceLabel ? ` ${opts.priceLabel}` : ''
  return {
    title: `${opts.productName}${priceBit} · ${opts.nombreTienda}`,
    text: `Mirá ${opts.productName}${priceBit} en ${opts.nombreTienda}`,
    url: opts.sharePreviewUrl || opts.productUrl,
  }
}

export function buildWishlistShareData(opts: {
  titulo: string
  destinatarioNombre: string
  wishlistUrl: string
  nombreTienda?: string
}): ShareData {
  const storeBit = opts.nombreTienda ? ` en ${opts.nombreTienda}` : ''
  return {
    title: `${opts.titulo}${storeBit}`,
    text: `Lista de regalos de ${opts.destinatarioNombre}: elegí uno y se lo enviamos a su casa.`,
    url: opts.wishlistUrl,
  }
}

export function buildCartShareData(opts: {
  nombreTienda: string
  catalogUrl: string
  lines: LineaCarritoSimple[]
  totalPiezas: number
}): ShareData {
  const parts = opts.lines.map((l) => {
    const precio =
      l.precioUnitarioCop != null && l.precioUnitarioCop > 0
        ? ` · ${formatCop(l.precioUnitarioCop)} c/u`
        : ''
    return `• ${l.titulo} × ${l.cantidad}${precio}`
  })
  const body = [
    `Pedido (${opts.totalPiezas} piezas) — ${opts.nombreTienda}`,
    '',
    ...parts,
    '',
    `Catálogo: ${opts.catalogUrl}`,
  ].join('\n')
  return {
    title: `Pedido · ${opts.nombreTienda}`,
    text: body,
    url: opts.catalogUrl,
  }
}
