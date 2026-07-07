import type { McPosProducto, McPosStock } from '@/types/mc'

/** Clave del mapa de stock POS (producto + variante/color + talla opcional). */
export function mcPosStockMapKey(
  productoId: string,
  varianteId?: string | null,
  tallaId?: string | null,
): string {
  const v = varianteId?.trim()
  const t = tallaId?.trim()
  if (v && t) return `${productoId}__${v}__${t}`
  if (v) return `${productoId}__${v}__`
  return `${productoId}__`
}

export function buildMcPosStockMap(
  stock: Pick<McPosStock, 'productoId' | 'varianteId' | 'tallaId' | 'cantidad'>[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of stock) {
    const key = mcPosStockMapKey(row.productoId, row.varianteId, row.tallaId)
    map.set(key, (map.get(key) ?? 0) + row.cantidad)
  }
  return map
}

/** Cantidad en stock POS de un artículo (suma variantes si el componente no fija una). */
export function posStockCantidadProducto(
  posProductId: string,
  posStockMap: Map<string, number>,
  posProduct?: Pick<McPosProducto, 'variantes' | 'posStockModo' | 'posColores'>,
  varianteId?: string | null,
  tallaId?: string | null,
): number {
  const v = varianteId?.trim()
  const t = tallaId?.trim()
  if (v && t) return Math.max(0, posStockMap.get(mcPosStockMapKey(posProductId, v, t)) ?? 0)
  if (v) return Math.max(0, posStockMap.get(mcPosStockMapKey(posProductId, v)) ?? 0)
  if (posProduct?.posStockModo === 'skus') {
    const colores = posProduct.posColores ?? []
    const tallas = posProduct.variantes ?? []
    let sum = 0
    for (const c of colores) {
      for (const ta of tallas) {
        sum += posStockMap.get(mcPosStockMapKey(posProductId, c.id, ta.id)) ?? 0
      }
    }
    return Math.max(0, sum)
  }
  if (posProduct?.variantes?.length) {
    return posProduct.variantes.reduce(
      (sum, variant) => sum + (posStockMap.get(mcPosStockMapKey(posProductId, variant.id)) ?? 0),
      0,
    )
  }
  return Math.max(0, posStockMap.get(mcPosStockMapKey(posProductId)) ?? 0)
}
