import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import type { McProducto, McProductoTalla } from '@/types/mc'
import { parseStockInput } from '@/lib/productoVariantes'
import { productoUsaMatrizSku, stockDisponibleRopa } from '@/lib/productoSkus'

/** Curva estándar mostrada al crear ropa. */
export const CURVA_TALLAS_DEFAULT = ['XS', 'S', 'M', 'L', 'XL', 'Única'] as const

/** Curva estándar para calzado (tallas numéricas). */
export const CURVA_TALLAS_ZAPATOS = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] as const

export type TallaModo = 'simple' | 'ropa' | 'zapatos'

export const TALLA_UNICA_NOMBRE = 'Talla única'

/** Tipos de variante permitidos cuando el producto es ropa. */
export const VARIANTE_TIPOS_ROPA = ['Color', 'Tela'] as const

export type TallaDraft = {
  id: string
  nombre: string
  stock: string
}

export function createTallaDraft(nombre: string, stock = ''): TallaDraft {
  return { id: crypto.randomUUID(), nombre, stock }
}

export function createCurvaTallasDraft(): TallaDraft[] {
  return CURVA_TALLAS_DEFAULT.map((nombre) => createTallaDraft(nombre))
}

export function createCurvaZapatosDraft(): TallaDraft[] {
  return CURVA_TALLAS_ZAPATOS.map((nombre) => createTallaDraft(nombre))
}

export function createTallaUnicaDraft(stock = ''): TallaDraft[] {
  return [createTallaDraft(TALLA_UNICA_NOMBRE, stock)]
}

export function tallasDraftFromProducto(product: McProducto): TallaDraft[] {
  return (product.tallas ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    stock: String(Math.max(0, Math.floor(t.stock ?? 0))),
  }))
}

export function buildTallasFromDrafts(drafts: TallaDraft[]): McProductoTalla[] {
  return drafts.map((d) => ({
    id: d.id,
    nombre: d.nombre.trim(),
    stock: parseStockInput(d.stock),
  }))
}

export function sumarStockTallas(tallas: McProductoTalla[]): number {
  return tallas.reduce((s, t) => s + Math.max(0, Math.floor(t.stock ?? 0)), 0)
}

export function productoUsaStockPorTalla(prod: McProducto): boolean {
  return !!prod.esRopa && (prod.tallas?.length ?? 0) > 0
}

export function tallasValidas(prod: McProducto): McProductoTalla[] {
  return (prod.tallas ?? []).filter((t) => t.nombre?.trim())
}

export function tallaEnCarrito(
  lines: LineaCarritoSimple[],
  productId: string,
  tallaId: string,
): number {
  let n = 0
  for (const l of lines) {
    if (l.productId === productId && l.tallaId === tallaId) n += l.cantidad
  }
  return n
}

export function stockDisponibleTalla(
  _prod: McProducto,
  talla: McProductoTalla,
  cantidadEnCarritoTalla: number,
): number {
  return Math.max(0, Math.floor(talla.stock ?? 0) - cantidadEnCarritoTalla)
}

export function stockTallaUi(
  prod: McProducto,
  talla: McProductoTalla,
  lines: LineaCarritoSimple[],
  varianteId?: string,
): number {
  if (productoUsaMatrizSku(prod)) {
    return stockDisponibleRopa(prod, { varianteId, tallaId: talla.id }, lines)
  }
  const enCart = tallaEnCarrito(lines, prod.id, talla.id)
  return stockDisponibleTalla(prod, talla, enCart)
}

export function productoStockDesdeTallas(prod: McProducto): number {
  if (!prod.esRopa) return 0
  return sumarStockTallas(tallasValidas(prod))
}
