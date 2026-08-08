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
import { resolveImagenesFromDrafts } from '@/lib/productoImagenes'
import {
  buildZapatosStockPayload,
  coloresZapatosTienenStock,
  colorZapatoToVariante,
  productImageFromZapatosVariantes,
  resolveImagenPrincipalColorId,
  sumarStockColoresZapatos,
} from '@/lib/productoZapatos'
import type { McProducto, McProductoTallaModo, McProductoVariante } from '@/types/mc'
import type { ProductoFormTipo } from '@/components/producto/ProductoEsRopaStep'

export type QuickAddFormSnapshot = {
  tipoProducto?: ProductoFormTipo
  /** @deprecated Usar tipoProducto; se mantiene por compatibilidad con borradores. */
  esRopa: boolean
  tallaModo?: McProductoTallaModo
  nombre: string
  descripcion: string
  precio: string
  precioCosto: string
  stock: string
  tallas: TallaDraft[]
  marcarNovedad: boolean
  mostrarDescargaImagen: boolean
  mostrarBotonDocena: boolean
  mostrarStockCatalogo: boolean
  descuento: ProductoDescuentoDraft
  variantes: VarianteDraftConArchivo[]
  skuMatrix: SkuDraft[]
  coloresZapatos: import('@/lib/productoZapatos').ColorZapatoDraft[]
  imagenPrincipalColorId?: string | null
  categoriaIds: string[]
}

function formEsConTallas(form: QuickAddFormSnapshot): boolean {
  if (form.tipoProducto === 'ropa' || form.tipoProducto === 'zapatos') return true
  return form.esRopa
}

function formEsZapatos(form: QuickAddFormSnapshot): boolean {
  return form.tipoProducto === 'zapatos' || form.tallaModo === 'zapatos'
}

function formTallaModo(form: QuickAddFormSnapshot): McProductoTallaModo {
  if (form.tallaModo === 'zapatos' || form.tipoProducto === 'zapatos') return 'zapatos'
  return 'ropa'
}

function buildVariantesForSave(
  rows: VarianteDraftConArchivo[],
  esConTallas: boolean,
): McProductoVariante[] {
  const built: McProductoVariante[] = []
  for (const v of rows) {
    const item = buildVarianteFromDraft(v)
    if (!item) continue
    if (esConTallas) delete item.stock
    built.push(item)
  }
  return built
}

function resolveStockPayload(form: QuickAddFormSnapshot): {
  builtVar: McProductoVariante[]
  stockPayload: ReturnType<typeof buildRopaStockPayload> | null
} {
  if (formEsZapatos(form)) {
    const coloresConNombre = form.coloresZapatos.filter((c) => c.nombre.trim())
    const builtVar = coloresConNombre
      .map((c) => {
        const imgs = c.imagenes.length > 0 ? resolveImagenesFromDrafts(c.imagenes, c.coverId) : {}
        return colorZapatoToVariante(c, imgs)
      })
      .filter((v): v is McProductoVariante => v != null)
    const stockPayload =
      coloresConNombre.length > 0 ? buildZapatosStockPayload(coloresConNombre) : null
    return { builtVar, stockPayload }
  }

  const varianteRows = form.variantes.filter((v) => v.nombre.trim())
  const builtTallas = formEsConTallas(form) ? buildTallasFromDrafts(form.tallas) : []
  const builtVar = buildVariantesForSave(varianteRows, formEsConTallas(form))
  const stockPayload = formEsConTallas(form)
    ? buildRopaStockPayload({
        tallas: builtTallas,
        variantes: builtVar,
        skuDrafts: form.skuMatrix,
      })
    : null
  return { builtVar, stockPayload }
}

/** True si el formulario tiene datos que vale la pena persistir como borrador. */
export function quickAddFormHasDraftContent(form: QuickAddFormSnapshot): boolean {
  if (form.nombre.trim()) return true
  if (form.descripcion.trim()) return true
  if (form.precio.replace(/\D/g, '')) return true
  if (form.stock.replace(/\D/g, '')) return true
  if (form.categoriaIds.length > 0) return true
  if (form.variantes.length > 0) return true
  if (form.coloresZapatos.length > 0) return true
  if (
    form.marcarNovedad ||
    form.mostrarDescargaImagen ||
    form.mostrarBotonDocena ||
    form.mostrarStockCatalogo
  )
    return true
  if (form.descuento.activo) return true
  if (formEsZapatos(form) && sumarStockColoresZapatos(form.coloresZapatos) > 0) return true
  if (formEsConTallas(form) && !formEsZapatos(form) && form.tallas.some((t) => Number(t.stock.replace(/\D/g, '')) > 0))
    return true
  if (formEsConTallas(form) && !formEsZapatos(form) && sumarStockSkuDrafts(form.skuMatrix) > 0) return true
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
  const esConTallas = formEsConTallas(form)
  const tallaModo = formTallaModo(form)
  const { builtVar, stockPayload } = resolveStockPayload(form)

  let stockFinal = Number.isFinite(stockNum) ? stockNum : 0
  if (stockPayload) {
    stockFinal = stockPayload.stockFinal
  } else if (builtVar.length > 0 && variantesConStockDefinido(builtVar)) {
    stockFinal = sumarStockVariantes(builtVar)
  } else if (formEsZapatos(form) && coloresZapatosTienenStock(form.coloresZapatos)) {
    stockFinal = sumarStockColoresZapatos(form.coloresZapatos)
  }

  const descParsed =
    Number.isFinite(precioNum) && precioNum > 0
      ? parseProductoDescuentoDraft(form.descuento, precioNum)
      : ({ ok: true, fields: { descuentoActivo: false } } as const)

  const now = Date.now()
  const esZapatos = formEsZapatos(form)
  const principalColorId = esZapatos
    ? resolveImagenPrincipalColorId(form.coloresZapatos, form.imagenPrincipalColorId ?? null)
    : null
  const prodImg = esZapatos ? productImageFromZapatosVariantes(builtVar, principalColorId) : {}

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
    ...(prodImg.imageUrl ? { imageUrl: prodImg.imageUrl } : {}),
    ...(esConTallas && stockPayload
      ? {
          esRopa: true,
          tallaModo,
          tallas: stockPayload.tallas,
          ...(stockPayload.skus?.length ? { skus: stockPayload.skus } : {}),
          ...(principalColorId ? { imagenPrincipalColorId: principalColorId } : {}),
        }
      : {}),
    ...(form.marcarNovedad ? { marcarNovedad: true } : {}),
    ...(form.mostrarDescargaImagen ? { mostrarDescargaImagen: true } : {}),
    ...(form.mostrarBotonDocena ? { mostrarBotonDocena: true } : {}),
    ...(form.mostrarStockCatalogo ? { mostrarStockCatalogo: true } : {}),
    ...(descParsed.ok ? descParsed.fields : { descuentoActivo: false }),
    ...(builtVar.length > 0 ? { variantes: builtVar } : {}),
    ...(form.categoriaIds.length > 0 ? { categoriaIds: form.categoriaIds } : {}),
  }
}

export function isProductoBorrador(prod: McProducto): boolean {
  return prod.esBorrador === true
}
