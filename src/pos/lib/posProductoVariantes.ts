import { formatIntegerEsCo } from '@/lib/formatCop'
import {
  buildVarianteFromDraft,
  type VarianteDraftBase,
  type VarianteDraftConArchivo,
} from '@/lib/productoVariantes'
import type { McPosProducto, McPosStock, McPosVariante, McProductoVariante } from '@/types/mc'

export type PosStockModo = 'simple' | 'tallas' | 'zapatos' | 'variantes' | 'skus'

export function inferPosStockModo(producto: McPosProducto): PosStockModo {
  const vs = producto.variantes ?? []
  if (producto.posStockModo === 'skus') return 'skus'
  if (vs.length === 0) return 'simple'
  if (producto.posStockModo === 'variantes') return 'variantes'
  if (producto.posStockModo === 'tallas') return 'tallas'
  if (vs.some((v) => v.tipo?.trim() || v.hex?.trim())) return 'variantes'
  return 'tallas'
}

export function posVarianteFromCatalog(v: McProductoVariante): McPosVariante {
  return {
    id: v.id,
    nombre: v.nombre,
    ...(v.tipo?.trim() ? { tipo: v.tipo.trim() } : {}),
    ...(v.hex?.trim() ? { hex: v.hex.trim() } : {}),
    ...(v.precioCop != null && v.precioCop > 0 ? { precioCop: v.precioCop } : {}),
  }
}

export function buildPosVariantesFromDrafts(drafts: VarianteDraftBase[]): McPosVariante[] {
  const result: McPosVariante[] = []
  for (const d of drafts) {
    const built = buildVarianteFromDraft(d)
    if (!built) continue
    result.push(posVarianteFromCatalog(built))
  }
  return result
}

export function catalogVariantesFromPosVariantes(
  posVariantes: McPosVariante[],
  stockById: Map<string, number>,
): McProductoVariante[] {
  return posVariantes.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    ...(v.tipo ? { tipo: v.tipo } : {}),
    ...(v.hex ? { hex: v.hex } : {}),
    ...(v.precioCop ? { precioCop: v.precioCop } : {}),
    stock: Math.max(0, stockById.get(v.id) ?? 0),
  }))
}

export function variantesDraftFromPosProducto(
  producto: McPosProducto,
  stockSede: McPosStock[],
): VarianteDraftConArchivo[] {
  return (producto.variantes ?? []).map((v) => {
    const row = stockSede.find((s) => s.varianteId === v.id)
    return {
      id: v.id,
      nombre: v.nombre,
      tipo: v.tipo?.trim() || '',
      hex: v.hex?.trim() || '#525252',
      mostrarColor: Boolean(v.hex?.trim()),
      stock: String(row?.cantidad ?? 0),
      precio: v.precioCop != null && v.precioCop > 0 ? formatIntegerEsCo(v.precioCop) : '',
      file: null,
    }
  })
}

export function sumarStockFromVarianteDrafts(drafts: VarianteDraftConArchivo[]): number {
  return drafts.reduce((s, v) => {
    const n = Number(v.stock.replace(/\D/g, ''))
    return s + (Number.isFinite(n) && n > 0 ? n : 0)
  }, 0)
}
