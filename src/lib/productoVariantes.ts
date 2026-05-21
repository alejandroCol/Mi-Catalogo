import type { McProducto, McProductoVariante } from '@/types/mc'
import { formatIntegerEsCo } from '@/lib/formatCop'

/** Tipos sugeridos al crear variantes (el vendedor puede escribir otro). */
export const VARIANTE_TIPOS_SUGERIDOS = [
  'Color',
  'Olor',
  'Capacidad',
  'Talla',
  'Material',
  'Modelo',
] as const

export type VarianteTipoSugerido = (typeof VARIANTE_TIPOS_SUGERIDOS)[number]

export function variantesValidas(prod: McProducto): McProductoVariante[] {
  return (prod.variantes ?? []).filter((v) => v.nombre?.trim())
}

/** True si al menos una variante define stock propio (modelo por SKU). */
export function productoUsaStockPorVariante(prod: McProducto): boolean {
  const vs = variantesValidas(prod)
  if (vs.length === 0) return false
  return vs.some((v) => typeof v.stock === 'number')
}

export function varianteStockRaw(v: McProductoVariante): number {
  const n = Math.floor(v.stock ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Stock total del producto para listados y filtros. */
export function productoStockEfectivo(prod: McProducto): number {
  const vs = variantesValidas(prod)
  if (vs.length === 0) return Math.max(0, Math.floor(prod.stock ?? 0))
  if (productoUsaStockPorVariante(prod)) {
    return vs.reduce((s, v) => s + varianteStockRaw(v), 0)
  }
  return Math.max(0, Math.floor(prod.stock ?? 0))
}

export function variantePrecioEfectivo(v: McProductoVariante, prod: McProducto): number {
  return v.precioCop ?? prod.precioCop ?? 0
}

export type VarianteAgrupada = {
  tipo: string
  items: McProductoVariante[]
}

/** Agrupa variantes por `tipo` para selectores en el catálogo público. */
export function agruparVariantesPorTipo(variantes: McProductoVariante[]): VarianteAgrupada[] {
  const map = new Map<string, McProductoVariante[]>()
  for (const v of variantes) {
    const t = v.tipo?.trim() || 'Opción'
    const list = map.get(t)
    if (list) list.push(v)
    else map.set(t, [v])
  }
  return Array.from(map.entries()).map(([tipo, items]) => ({ tipo, items }))
}

export function stockDisponibleVariante(
  prod: McProducto,
  variante: McProductoVariante,
  cantidadEnCarritoVariante: number,
  cantidadEnCarritoProducto: number,
): number {
  if (productoUsaStockPorVariante(prod)) {
    return Math.max(0, varianteStockRaw(variante) - cantidadEnCarritoVariante)
  }
  return Math.max(0, Math.floor(prod.stock ?? 0) - cantidadEnCarritoProducto)
}

export function sumarStockVariantes(rows: McProductoVariante[]): number {
  return rows.reduce((s, v) => s + (typeof v.stock === 'number' ? varianteStockRaw(v) : 0), 0)
}

export function variantesConStockDefinido(rows: McProductoVariante[]): boolean {
  return rows.some((v) => typeof v.stock === 'number')
}

/** Convierte variantes guardadas a drafts del editor, migrando stock legacy si hace falta. */
export function variantesDraftFromProducto(product: McProducto): VarianteDraftConArchivo[] {
  const saved = product.variantes ?? []
  const legacySharedStock = saved.length > 0 && !variantesConStockDefinido(saved)

  return saved.map((v, i) => {
    const base = varianteDraftFromSaved(v)
    let stock = base.stock
    if (legacySharedStock && !stock && (product.stock ?? 0) > 0) {
      stock = i === 0 ? String(Math.max(0, Math.floor(product.stock))) : '0'
    }
    return {
      ...base,
      stock,
      precio: v.precioCop != null && v.precioCop > 0 ? formatIntegerEsCo(v.precioCop) : '',
      file: null,
      imageUrl: v.imageUrl,
    }
  })
}

export type VarianteDraftConArchivo = VarianteDraftBase & {
  file?: File | null
  imageUrl?: string
}

export function parseStockInput(raw: string): number {
  const n = Number(raw.replace(/\D/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function parsePrecioVarianteOpcional(raw: string): number | undefined {
  const d = raw.replace(/\D/g, '')
  if (!d) return undefined
  const n = Number(d)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export type VarianteDraftBase = {
  id: string
  nombre: string
  tipo: string
  hex: string
  mostrarColor: boolean
  stock: string
  precio: string
}

export function createVarianteDraft(partial?: Partial<VarianteDraftBase>): VarianteDraftBase {
  return {
    id: crypto.randomUUID(),
    nombre: '',
    tipo: 'Color',
    hex: '#525252',
    mostrarColor: true,
    stock: '',
    precio: '',
    ...partial,
  }
}

export function varianteDraftFromSaved(v: McProductoVariante): VarianteDraftBase {
  const hasHex = !!v.hex?.trim()
  return {
    id: v.id,
    nombre: v.nombre,
    tipo: v.tipo?.trim() || (hasHex ? 'Color' : 'Opción'),
    hex: v.hex ?? '#525252',
    mostrarColor: hasHex,
    stock: typeof v.stock === 'number' ? String(Math.max(0, Math.floor(v.stock))) : '',
    precio: '',
  }
}

export function buildVarianteFromDraft(draft: VarianteDraftBase): McProductoVariante | null {
  const nombre = draft.nombre.trim()
  if (!nombre) return null

  const item: McProductoVariante = { id: draft.id, nombre }
  const tipo = draft.tipo.trim()
  if (tipo && tipo !== 'Opción') item.tipo = tipo

  if (draft.mostrarColor && draft.hex?.trim()) {
    item.hex = draft.hex.trim()
  }

  const stockRaw = draft.stock.trim()
  if (stockRaw !== '') {
    item.stock = parseStockInput(stockRaw)
  }

  const pc = parsePrecioVarianteOpcional(draft.precio)
  if (pc != null) item.precioCop = pc

  return item
}
