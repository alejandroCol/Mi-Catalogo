import type { ProductoDescuentoDraft } from '@/components/producto/ProductoDescuentoEditor'
import { parseProductoDescuentoDraft } from '@/components/producto/ProductoDescuentoEditor'
import type { TallaDraft } from '@/lib/productoTallas'
import { buildTallasFromDrafts } from '@/lib/productoTallas'
import {
  buildRopaStockPayload,
  sumarStockSkuDrafts,
  type SkuDraft,
} from '@/lib/productoSkus'
import {
  buildVarianteFromDraft,
  sumarStockVariantes,
  variantesConStockDefinido,
  type VarianteDraftConArchivo,
} from '@/lib/productoVariantes'
import type { McProducto, McProductoVariante } from '@/types/mc'

export type QuickAddFormSnapshot = {
  esRopa: boolean
  nombre: string
  descripcion: string
  precio: string
  precioCosto: string
  stock: string
  tallas: TallaDraft[]
  marcarNovedad: boolean
  mostrarDescargaImagen: boolean
  mostrarBotonDocena: boolean
  descuento: ProductoDescuentoDraft
  variantes: VarianteDraftConArchivo[]
  skuMatrix: SkuDraft[]
  categoriaIds: string[]
}

function buildVariantesForSave(
  rows: VarianteDraftConArchivo[],
  esRopa: boolean,
): McProductoVariante[] {
  const built: McProductoVariante[] = []
  for (const v of rows) {
    const item = buildVarianteFromDraft(v)
    if (!item) continue
    if (esRopa) delete item.stock
    built.push(item)
  }
  return built
}

/** True si el formulario tiene datos que vale la pena persistir como borrador. */
export function quickAddFormHasDraftContent(form: QuickAddFormSnapshot): boolean {
  if (form.nombre.trim()) return true
  if (form.descripcion.trim()) return true
  if (form.precio.replace(/\D/g, '')) return true
  if (form.stock.replace(/\D/g, '')) return true
  if (form.categoriaIds.length > 0) return true
  if (form.variantes.length > 0) return true
  if (form.marcarNovedad || form.mostrarDescargaImagen || form.mostrarBotonDocena) return true
  if (form.descuento.activo) return true
  if (form.esRopa && form.tallas.some((t) => Number(t.stock.replace(/\D/g, '')) > 0)) return true
  if (form.esRopa && sumarStockSkuDrafts(form.skuMatrix) > 0) return true
  return false
}

/** Convierte el estado del formulario a payload de Firestore (validación relajada para borradores). */
export function buildProductoPayloadFromQuickAddForm(
  form: QuickAddFormSnapshot,
  nextOrden: number,
): Omit<McProducto, 'id'> {
  const precioNum = Number(form.precio.replace(/\D/g, ''))
  const precioCostoNum = form.precioCosto.replace(/\D/g, '') ? Number(form.precioCosto.replace(/\D/g, '')) : undefined
  const stockNum = Number(form.stock.replace(/\D/g, ''))
  const varianteRows = form.variantes.filter((v) => v.nombre.trim())
  const builtTallas = form.esRopa ? buildTallasFromDrafts(form.tallas) : []
  const builtVar = buildVariantesForSave(varianteRows, form.esRopa)
  const ropaStock = form.esRopa
    ? buildRopaStockPayload({
        tallas: builtTallas,
        variantes: builtVar,
        skuDrafts: form.skuMatrix,
      })
    : null

  let stockFinal = Number.isFinite(stockNum) ? stockNum : 0
  if (form.esRopa && ropaStock) {
    stockFinal = ropaStock.stockFinal
  } else if (builtVar.length > 0 && variantesConStockDefinido(builtVar)) {
    stockFinal = sumarStockVariantes(builtVar)
  }

  const descParsed =
    Number.isFinite(precioNum) && precioNum > 0
      ? parseProductoDescuentoDraft(form.descuento, precioNum)
      : ({ ok: true, fields: { descuentoActivo: false } } as const)

  const now = Date.now()

  return {
    nombre: form.nombre.trim(),
    ...(form.descripcion.trim() ? { descripcion: form.descripcion.trim() } : {}),
    precioCop: Number.isFinite(precioNum) && precioNum >= 0 ? precioNum : 0,
    ...(precioCostoNum != null && Number.isFinite(precioCostoNum) ? { precioCostoCop: precioCostoNum } : {}),
    stock: stockFinal,
    activo: false,
    enCatalogo: false,
    esBorrador: true,
    orden: nextOrden,
    createdAt: now,
    updatedAt: now,
    ...(form.esRopa && ropaStock
      ? {
          esRopa: true,
          tallas: ropaStock.tallas,
          ...(ropaStock.skus?.length ? { skus: ropaStock.skus } : {}),
        }
      : {}),
    ...(form.marcarNovedad ? { marcarNovedad: true } : {}),
    ...(form.mostrarDescargaImagen ? { mostrarDescargaImagen: true } : {}),
    ...(form.mostrarBotonDocena ? { mostrarBotonDocena: true } : {}),
    ...(descParsed.ok ? descParsed.fields : { descuentoActivo: false }),
    ...(builtVar.length > 0 ? { variantes: builtVar } : {}),
    ...(form.categoriaIds.length > 0 ? { categoriaIds: form.categoriaIds } : {}),
  }
}

export function isProductoBorrador(prod: McProducto): boolean {
  return prod.esBorrador === true
}
