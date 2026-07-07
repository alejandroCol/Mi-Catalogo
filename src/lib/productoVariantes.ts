import type { McProducto, McProductoVariante } from '@/types/mc'
import { formatIntegerEsCo } from '@/lib/formatCop'
import type { ProductoLookup } from '@/lib/comboProducto'
import { comboStockDisponible } from '@/lib/comboProducto'
import { productoUsaMatrizSku, sumarStockSkus } from '@/lib/productoSkus'

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

/** Valor interno del `<select>` cuando el tipo o color no está en la lista predefinida. */
export const VARIANTE_SELECT_OTRO = 'Otro' as const

/** Colores frecuentes con hex asociado para variantes de tipo Color. */
export const COLORES_VARIANTE_SUGERIDOS = [
  { nombre: 'Negro', hex: '#171717' },
  { nombre: 'Blanco', hex: '#fafafa' },
  { nombre: 'Gris', hex: '#737373' },
  { nombre: 'Rojo', hex: '#dc2626' },
  { nombre: 'Azul', hex: '#2563eb' },
  { nombre: 'Verde', hex: '#16a34a' },
  { nombre: 'Amarillo', hex: '#ca8a04' },
  { nombre: 'Naranja', hex: '#ea580c' },
  { nombre: 'Rosa', hex: '#ec4899' },
  { nombre: 'Morado', hex: '#9333ea' },
  { nombre: 'Beige', hex: '#d4c4a8' },
  { nombre: 'Marrón', hex: '#78350f' },
] as const

export type ColorVarianteSugerido = (typeof COLORES_VARIANTE_SUGERIDOS)[number]

export function esTipoColorVariante(tipo: string): boolean {
  return tipo.trim().toLowerCase() === 'color'
}

export function resolveVarianteTipoSelect(tipo: string): { selectValue: string; customTipo: string } {
  const t = tipo.trim()
  if (!t) return { selectValue: '', customTipo: '' }
  if ((VARIANTE_TIPOS_SUGERIDOS as readonly string[]).includes(t)) {
    return { selectValue: t, customTipo: '' }
  }
  return { selectValue: VARIANTE_SELECT_OTRO, customTipo: t }
}

export function resolveVarianteColorNombreSelect(nombre: string): { selectValue: string; customNombre: string } {
  const n = nombre.trim()
  if (!n) return { selectValue: '', customNombre: '' }
  const found = COLORES_VARIANTE_SUGERIDOS.find((c) => c.nombre.toLowerCase() === n.toLowerCase())
  if (found) return { selectValue: found.nombre, customNombre: '' }
  return { selectValue: VARIANTE_SELECT_OTRO, customNombre: n }
}

export function hexColorVarianteSugerido(nombre: string): string | undefined {
  const found = COLORES_VARIANTE_SUGERIDOS.find((c) => c.nombre.toLowerCase() === nombre.trim().toLowerCase())
  return found?.hex
}

export function variantesValidas(prod: McProducto): McProductoVariante[] {
  return (prod.variantes ?? []).filter((v) => v.nombre?.trim())
}

/** Variante visible en selectores (nombre o muestra de color). */
export function varianteEsSeleccionable(v: McProductoVariante): boolean {
  return Boolean(v.nombre?.trim() || v.hex?.trim())
}

/** Etiqueta legible aunque falte nombre (p. ej. solo hex guardado). */
export function varianteEtiqueta(v: McProductoVariante): string {
  const nombre = v.nombre?.trim()
  if (nombre) return nombre
  const hex = v.hex?.trim()
  if (hex) {
    const byHex = COLORES_VARIANTE_SUGERIDOS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())
    if (byHex) return byHex.nombre
  }
  return v.tipo?.trim() || 'Opción'
}

/** Variantes del catálogo público / live (sin tallas duplicadas en ropa). */
export function variantesPublicas(prod: McProducto): McProductoVariante[] {
  return (prod.variantes ?? []).filter((v) => {
    if (!varianteEsSeleccionable(v)) return false
    if (prod.esRopa && v.tipo?.trim().toLowerCase() === 'talla') return false
    return true
  })
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
export function productoStockEfectivo(
  prod: McProducto,
  productsLookup?: ProductoLookup,
): number {
  if (prod.tipoProducto === 'combo') {
    if (productsLookup) return comboStockDisponible(prod, productsLookup)
    return Math.max(0, Math.floor(prod.stock ?? 0))
  }
  if (prod.esRopa && productoUsaMatrizSku(prod)) {
    return sumarStockSkus(prod.skus ?? [])
  }
  if (prod.esRopa && (prod.tallas?.length ?? 0) > 0) {
    return (prod.tallas ?? []).reduce(
      (s, t) => s + Math.max(0, Math.floor(t.stock ?? 0)),
      0,
    )
  }
  const vs = variantesValidas(prod).filter((v) => !prod.esRopa || v.tipo?.trim().toLowerCase() !== 'talla')
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
    tipo: '',
    hex: '#525252',
    mostrarColor: false,
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
  if (!nombre || nombre === VARIANTE_SELECT_OTRO) return null

  const item: McProductoVariante = { id: draft.id, nombre }
  const tipo = draft.tipo.trim()
  if (tipo && tipo !== 'Opción' && tipo !== VARIANTE_SELECT_OTRO) item.tipo = tipo

  const esColor = esTipoColorVariante(draft.tipo)
  const hexEfectivo =
    draft.hex?.trim() || (esColor ? hexColorVarianteSugerido(nombre) : undefined)

  if ((draft.mostrarColor || esColor) && hexEfectivo) {
    item.hex = hexEfectivo
  }

  const stockRaw = draft.stock.trim()
  if (stockRaw !== '') {
    item.stock = parseStockInput(stockRaw)
  }

  const pc = parsePrecioVarianteOpcional(draft.precio)
  if (pc != null) item.precioCop = pc

  return item
}
