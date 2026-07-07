import {
  buildCatalogToPosMap,
  comboStockDisponiblePos,
  esProductoCombo,
  type CatalogToPosMap,
  type ProductoLookup,
} from '@/lib/comboProducto'
import { buildMcPosStockMap } from '@/lib/mcPosStockMapKey'
import { posStockTotalProducto } from '@/pos/lib/posProductoSkus'
import { catalogProductLookup } from '@/pos/lib/posComboStock'
import type { McPosProducto, McPosStock, McProducto } from '@/types/mc'

export type PosVentasCatalogContext = {
  stockMap: Map<string, number>
  catalogLookup: ProductoLookup
  catalogToPos: CatalogToPosMap
  posProductsInSede: (McPosProducto & { id: string })[]
}

export function buildPosVentasCatalogContext(
  productos: (McPosProducto & { id: string })[],
  catalogProductos: (McProducto & { id: string })[],
  stock: McPosStock[],
  sedeId: string | null | undefined,
): PosVentasCatalogContext {
  const posProductsInSede = sedeId ? productos.filter((p) => p.sedeId === sedeId) : productos
  const stockRows = sedeId ? stock.filter((s) => s.sedeId === sedeId) : stock
  return {
    stockMap: buildMcPosStockMap(stockRows),
    catalogLookup: catalogProductLookup(catalogProductos),
    catalogToPos: sedeId ? buildCatalogToPosMap(productos, sedeId, catalogProductos) : new Map(),
    posProductsInSede,
  }
}

/** Stock vendible de un artículo POS en la sede actual (incluye combos virtuales). */
export function posProductoStockDisponible(
  producto: McPosProducto & { id: string },
  ctx: PosVentasCatalogContext,
): number {
  if (producto.activo === false) return 0
  if (esProductoCombo(producto)) {
    return comboStockDisponiblePos(
      producto,
      ctx.catalogLookup,
      ctx.stockMap,
      ctx.catalogToPos,
      ctx.posProductsInSede,
    )
  }
  if (producto.variantes?.length || producto.posColores?.length) {
    const catalog = producto.catalogProductoId
      ? ctx.catalogLookup.get(producto.catalogProductoId)
      : undefined
    return posStockTotalProducto(producto, ctx.stockMap, catalog)
  }
  return posStockTotalProducto(producto, ctx.stockMap)
}

export function posProductosVendibles(
  productos: (McPosProducto & { id: string })[],
  ctx: PosVentasCatalogContext,
): (McPosProducto & { id: string })[] {
  return productos.filter((p) => posProductoStockDisponible(p, ctx) > 0)
}

/** Productos activos visibles en el catálogo de ventas (incluye combos sin stock). */
export function posProductosEnCatalogoVentas(
  productos: (McPosProducto & { id: string })[],
): (McPosProducto & { id: string })[] {
  return productos.filter((p) => p.activo !== false)
}

/** Máximo de combos armables según stock POS (mejor sede con componentes disponibles). */
export function comboStockDisponiblePosMaxSedes(
  combo: Pick<McPosProducto, 'tipoProducto' | 'comboComponentes'>,
  posProducts: (McPosProducto & { id: string })[],
  catalogProducts: (McProducto & { id: string })[],
  stockGlobal: McPosStock[],
): number {
  const sedeIds = [
    ...new Set(posProducts.map((p) => p.sedeId).filter((id): id is string => Boolean(id?.trim()))),
  ]
  if (sedeIds.length === 0) return 0

  let max = 0
  for (const sedeId of sedeIds) {
    const ctx = buildPosVentasCatalogContext(posProducts, catalogProducts, stockGlobal, sedeId)
    max = Math.max(
      max,
      comboStockDisponiblePos(
        combo,
        ctx.catalogLookup,
        ctx.stockMap,
        ctx.catalogToPos,
        ctx.posProductsInSede,
      ),
    )
  }
  return max
}
