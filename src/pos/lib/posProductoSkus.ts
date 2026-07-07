import { productoUsaMatrizSku } from '@/lib/productoSkus'
import { mcPosStockMapKey, posStockCantidadProducto } from '@/lib/mcPosStockMapKey'
import {
  buildPosVariantesFromDrafts,
  inferPosStockModo,
  posVarianteFromCatalog,
  type PosStockModo,
} from '@/pos/lib/posProductoVariantes'
import {
  buildRopaStockPayload,
  ensureSkuDraftMatrix,
  type SkuDraft,
} from '@/lib/productoSkus'
import { buildTallasFromDrafts, type TallaDraft } from '@/lib/productoTallas'
import {
  buildVarianteFromDraft,
  type VarianteDraftConArchivo,
} from '@/lib/productoVariantes'
import type { McPosProducto, McPosStock, McPosVariante, McProducto, McProductoVariante } from '@/types/mc'

export type PosProductoSkuView = {
  usaMatriz: boolean
  colores: McPosVariante[]
  tallas: McPosVariante[]
}

export function posUsaMatrizSku(
  producto: Pick<McPosProducto, 'posStockModo' | 'posColores'>,
): boolean {
  return producto.posStockModo === 'skus' && (producto.posColores?.length ?? 0) > 0
}

export function resolvePosProductoSkuView(
  producto: McPosProducto,
  catalog?: McProducto | null,
): PosProductoSkuView {
  if (posUsaMatrizSku(producto)) {
    return {
      usaMatriz: true,
      colores: producto.posColores ?? [],
      tallas: producto.variantes ?? [],
    }
  }
  if (catalog && productoUsaMatrizSku(catalog)) {
    return {
      usaMatriz: true,
      colores: (catalog.variantes ?? []).map(posVarianteFromCatalog),
      tallas: (catalog.tallas ?? []).map((t) => ({ id: t.id, nombre: t.nombre })),
    }
  }
  return { usaMatriz: false, colores: [], tallas: [] }
}

export function posStockDisponibleSku(
  productoId: string,
  colorId: string,
  tallaId: string,
  stockMap: Map<string, number>,
): number {
  return Math.max(0, stockMap.get(mcPosStockMapKey(productoId, colorId, tallaId)) ?? 0)
}

export function posStockTotalProducto(
  producto: McPosProducto & { id: string },
  stockMap: Map<string, number>,
  catalog?: McProducto | null,
): number {
  const view = resolvePosProductoSkuView(producto, catalog)
  if (view.usaMatriz) {
    let sum = 0
    for (const c of view.colores) {
      for (const t of view.tallas) {
        sum += posStockDisponibleSku(producto.id, c.id, t.id, stockMap)
      }
    }
    return sum
  }
  return posStockCantidadProducto(producto.id, stockMap, producto)
}

export function skusDraftFromPosStock(
  producto: McPosProducto,
  stockSede: McPosStock[],
): SkuDraft[] {
  if (!posUsaMatrizSku(producto)) return []
  const colores = producto.posColores ?? []
  const tallas = producto.variantes ?? []
  const drafts: SkuDraft[] = []
  for (const c of colores) {
    for (const t of tallas) {
      const row = stockSede.find((s) => s.varianteId === c.id && s.tallaId === t.id)
      drafts.push({
        id: crypto.randomUUID(),
        varianteId: c.id,
        tallaId: t.id,
        stock: String(Math.max(0, row?.cantidad ?? 0)),
      })
    }
  }
  return drafts
}

export function coloresDraftFromPosProducto(producto: McPosProducto): VarianteDraftConArchivo[] {
  return (producto.posColores ?? []).map((v) => ({
    id: v.id,
    nombre: v.nombre,
    tipo: v.tipo?.trim() || 'Color',
    hex: v.hex?.trim() || '#525252',
    mostrarColor: Boolean(v.hex?.trim()),
    stock: '',
    precio: v.precioCop != null && v.precioCop > 0 ? String(v.precioCop) : '',
    file: null,
  }))
}

export type PosRopaStockBuildInput = {
  tallas: TallaDraft[]
  colores: VarianteDraftConArchivo[]
  skuMatrix: SkuDraft[]
}

export type PosRopaStockBuildResult = {
  posStockModo: Extract<PosStockModo, 'tallas' | 'skus'>
  posColores?: McPosVariante[]
  tallasPos: McPosVariante[]
  skuDrafts: SkuDraft[]
  stockRows: { varianteId?: string; tallaId?: string; cantidad: number }[]
  stockTotal: number
  catalogPayload?: ReturnType<typeof buildRopaStockPayload> & { variantes: McProductoVariante[] }
}

export function buildPosRopaStockFromDrafts(input: PosRopaStockBuildInput): PosRopaStockBuildResult {
  const builtTallas = buildTallasFromDrafts(input.tallas)
  const colorRows = input.colores.filter((v) => v.nombre.trim())
  const builtColores = buildPosVariantesFromDrafts(colorRows)
  const tallasPos = builtTallas.map((t) => ({ id: t.id, nombre: t.nombre }))

  if (builtColores.length === 0) {
    const stockRows = builtTallas
      .filter((t) => t.stock > 0)
      .map((t) => ({ varianteId: t.id, cantidad: t.stock }))
    return {
      posStockModo: 'tallas',
      tallasPos,
      skuDrafts: [],
      stockRows,
      stockTotal: stockRows.reduce((s, r) => s + r.cantidad, 0),
    }
  }

  const builtVarCatalog = colorRows
    .map((v) => buildVarianteFromDraft(v))
    .filter((v): v is McProductoVariante => v != null)
    .map((item) => {
      delete item.stock
      return item
    })

  const skuDrafts = ensureSkuDraftMatrix(builtVarCatalog, builtTallas, input.skuMatrix)
  const catalogPayload = buildRopaStockPayload({
    tallas: builtTallas.map((t) => ({ ...t, stock: 0 })),
    variantes: builtVarCatalog,
    skuDrafts,
  })

  const stockRows = skuDrafts
    .map((d) => ({
      varianteId: d.varianteId,
      tallaId: d.tallaId,
      cantidad: Number(d.stock.replace(/\D/g, '')) || 0,
    }))
    .filter((r) => r.cantidad > 0)

  return {
    posStockModo: 'skus',
    posColores: builtColores,
    tallasPos,
    skuDrafts,
    stockRows,
    stockTotal: catalogPayload.stockFinal,
    catalogPayload: { ...catalogPayload, variantes: builtVarCatalog },
  }
}

export type { SkuDraft }
export { ensureSkuDraftMatrix }

export function ropaPosUsaMatrizEnForm(coloresConNombre: number): boolean {
  return coloresConNombre > 0
}

export function validatePosRopaStock(build: PosRopaStockBuildResult): string | null {
  if (build.posStockModo === 'skus' && build.stockTotal <= 0) {
    return 'Indicá stock en al menos una combinación color × talla.'
  }
  if (build.posStockModo === 'tallas' && build.stockTotal <= 0) {
    return 'Indicá stock en al menos una talla.'
  }
  return null
}

export type PosInventarioBreakdownListItem = {
  label: string
  hex?: string
  cantidad: number
}

export type PosInventarioBreakdown =
  | {
      type: 'matrix'
      colores: McPosVariante[]
      tallas: McPosVariante[]
      qty: (colorId: string, tallaId: string) => number
    }
  | {
      type: 'list'
      heading: string
      items: PosInventarioBreakdownListItem[]
    }

export function buildPosInventarioBreakdown(
  producto: McPosProducto & { id: string },
  stockMap: Map<string, number>,
  catalog?: McProducto | null,
): PosInventarioBreakdown | null {
  const modo = inferPosStockModo(producto)
  if (modo === 'skus') {
    const view = resolvePosProductoSkuView(producto, catalog)
    if (!view.usaMatriz || view.colores.length === 0 || view.tallas.length === 0) return null
    return {
      type: 'matrix',
      colores: view.colores,
      tallas: view.tallas,
      qty: (colorId, tallaId) => posStockDisponibleSku(producto.id, colorId, tallaId, stockMap),
    }
  }
  if (modo === 'tallas' && producto.variantes?.length) {
    return {
      type: 'list',
      heading: 'Stock por talla',
      items: producto.variantes.map((t) => ({
        label: t.nombre,
        cantidad: Math.max(0, stockMap.get(mcPosStockMapKey(producto.id, t.id)) ?? 0),
      })),
    }
  }
  if (modo === 'variantes' && producto.variantes?.length) {
    return {
      type: 'list',
      heading: 'Stock por variante',
      items: producto.variantes.map((v) => ({
        label: v.nombre,
        hex: v.hex,
        cantidad: Math.max(0, stockMap.get(mcPosStockMapKey(producto.id, v.id)) ?? 0),
      })),
    }
  }
  return null
}

export function posInventarioUsaStockSimple(producto: McPosProducto): boolean {
  return inferPosStockModo(producto) === 'simple'
}
