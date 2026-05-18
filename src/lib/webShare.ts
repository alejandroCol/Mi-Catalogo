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
}): ShareData {
  return {
    title: `${opts.productName} · ${opts.nombreTienda}`,
    text: `Mirá ${opts.productName} en ${opts.nombreTienda}`,
    url: opts.productUrl,
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
