import { productoTieneDescuento } from '@/lib/productoDescuento'
import type { McProducto } from '@/types/mc'

/** Productos relacionados por categoría compartida; fallback a vecinos del catálogo. */
export function pickRelatedProducts(
  current: McProducto & { id: string },
  catalog: (McProducto & { id: string })[],
  limit = 8,
): (McProducto & { id: string })[] {
  const others = catalog.filter((p) => p.id !== current.id && p.activo !== false && p.enCatalogo !== false)
  if (others.length === 0) return []

  const catIds = new Set(
    (current.categoriaIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0),
  )
  const scored = others.map((p) => {
    let score = 0
    for (const id of p.categoriaIds ?? []) {
      if (catIds.has(id)) score += 3
    }
    if (productoTieneDescuento(p)) score += 0.5
    score += Math.max(0, 1 - (p.orden ?? 0) / 1000)
    return { p, score }
  })
  scored.sort((a, b) => b.score - a.score)
  const withCat = scored.filter((x) => x.score >= 2).map((x) => x.p)
  if (withCat.length >= Math.min(4, limit)) return withCat.slice(0, limit)
  return scored.map((x) => x.p).slice(0, limit)
}
