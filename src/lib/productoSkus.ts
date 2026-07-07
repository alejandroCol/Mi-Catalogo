import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import type { McProducto, McProductoSku, McProductoTalla, McProductoVariante } from '@/types/mc'
import { parseStockInput, variantesPublicas } from '@/lib/productoVariantes'
import { sumarStockTallas } from '@/lib/productoTallas'

export type SkuDraft = {
  id: string
  varianteId: string
  tallaId: string
  stock: string
}

export function skuKey(varianteId: string, tallaId: string): string {
  return `${varianteId}__${tallaId}`
}

/** Producto de ropa con inventario por combinación color × talla. */
export function productoUsaMatrizSku(prod: McProducto): boolean {
  return !!(prod.esRopa && (prod.skus?.length ?? 0) > 0)
}

export function ropaTieneColores(prod: McProducto): boolean {
  return !!(prod.esRopa && variantesPublicas(prod).length > 0)
}

export function ropaUsaMatrizEnForm(esRopa: boolean, variantesConNombre: number): boolean {
  return esRopa && variantesConNombre > 0
}

export function findSku(
  prod: McProducto,
  varianteId?: string,
  tallaId?: string,
): McProductoSku | undefined {
  if (!productoUsaMatrizSku(prod) || !varianteId || !tallaId) return undefined
  return prod.skus!.find((s) => s.varianteId === varianteId && s.tallaId === tallaId)
}

export function sumarStockSkus(skus: McProductoSku[]): number {
  return skus.reduce((s, sku) => s + Math.max(0, Math.floor(sku.stock ?? 0)), 0)
}

/** Suma agregada por talla para listados legacy que leen `tallas[].stock`. */
export function syncTallasStockFromSkus(
  tallas: McProductoTalla[],
  skus: McProductoSku[],
): McProductoTalla[] {
  return tallas.map((t) => ({
    ...t,
    stock: skus
      .filter((s) => s.tallaId === t.id)
      .reduce((sum, s) => sum + Math.max(0, Math.floor(s.stock ?? 0)), 0),
  }))
}

export function buildSkusFromDrafts(
  drafts: SkuDraft[],
  variantes: McProductoVariante[],
  tallas: McProductoTalla[],
): McProductoSku[] {
  const vIds = new Set(variantes.map((v) => v.id))
  const tIds = new Set(tallas.map((t) => t.id))
  return drafts
    .filter((d) => vIds.has(d.varianteId) && tIds.has(d.tallaId))
    .map((d) => ({
      id: d.id,
      varianteId: d.varianteId,
      tallaId: d.tallaId,
      stock: parseStockInput(d.stock),
    }))
}

export function skusDraftFromProducto(product: McProducto): SkuDraft[] {
  return (product.skus ?? []).map((s) => ({
    id: s.id,
    varianteId: s.varianteId,
    tallaId: s.tallaId,
    stock: String(Math.max(0, Math.floor(s.stock ?? 0))),
  }))
}

export function ensureSkuDraftMatrix(
  variantes: Pick<McProductoVariante, 'id'>[],
  tallas: Pick<McProductoTalla, 'id'>[],
  existing: SkuDraft[],
): SkuDraft[] {
  const byKey = new Map(existing.map((d) => [skuKey(d.varianteId, d.tallaId), d]))
  const out: SkuDraft[] = []
  for (const v of variantes) {
    for (const t of tallas) {
      const key = skuKey(v.id, t.id)
      const prev = byKey.get(key)
      out.push(
        prev ?? {
          id: crypto.randomUUID(),
          varianteId: v.id,
          tallaId: t.id,
          stock: '',
        },
      )
    }
  }
  return out
}

export function cantidadEnCarritoRopa(
  lines: LineaCarritoSimple[],
  productId: string,
  opts: { varianteId?: string; tallaId: string; usaMatriz: boolean },
): number {
  let n = 0
  for (const l of lines) {
    if (l.productId !== productId || l.tallaId !== opts.tallaId) continue
    if (opts.usaMatriz) {
      if (l.varianteId !== opts.varianteId) continue
    }
    n += l.cantidad
  }
  return n
}

export function stockDisponibleRopa(
  prod: McProducto,
  opts: { varianteId?: string; tallaId: string },
  lines: LineaCarritoSimple[],
): number {
  const { varianteId, tallaId } = opts
  if (productoUsaMatrizSku(prod)) {
    if (!varianteId) return 0
    const sku = findSku(prod, varianteId, tallaId)
    const raw = Math.max(0, Math.floor(sku?.stock ?? 0))
    const enCart = cantidadEnCarritoRopa(lines, prod.id, { varianteId, tallaId, usaMatriz: true })
    return Math.max(0, raw - enCart)
  }
  const talla = prod.tallas?.find((t) => t.id === tallaId)
  if (!talla) return 0
  const enCart = cantidadEnCarritoRopa(lines, prod.id, { tallaId, usaMatriz: false })
  return Math.max(0, Math.floor(talla.stock ?? 0) - enCart)
}

export function stockSkuRaw(sku: McProductoSku | undefined): number {
  return Math.max(0, Math.floor(sku?.stock ?? 0))
}

export type RopaStockPayload = {
  tallas: McProductoTalla[]
  skus?: McProductoSku[]
  stockFinal: number
  usaMatriz: boolean
}

/** Arma tallas/skus/stock total al guardar ropa con o sin matriz color × talla. */
export function buildRopaStockPayload(opts: {
  tallas: McProductoTalla[]
  variantes: McProductoVariante[]
  skuDrafts: SkuDraft[]
}): RopaStockPayload {
  const usaMatriz = opts.variantes.length > 0
  if (!usaMatriz) {
    return {
      tallas: opts.tallas,
      stockFinal: sumarStockTallas(opts.tallas),
      usaMatriz: false,
    }
  }
  const skus = buildSkusFromDrafts(opts.skuDrafts, opts.variantes, opts.tallas)
  const tallasBase = opts.tallas.map((t) => ({ ...t, stock: 0 }))
  return {
    tallas: syncTallasStockFromSkus(tallasBase, skus),
    skus,
    stockFinal: sumarStockSkus(skus),
    usaMatriz: true,
  }
}

export function sumarStockSkuDrafts(drafts: SkuDraft[]): number {
  return drafts.reduce((s, d) => s + parseStockInput(d.stock), 0)
}
