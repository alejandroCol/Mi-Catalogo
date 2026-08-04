import type { ProductoDescuentoDraft } from '@/components/producto/ProductoDescuentoEditor'
import type { TallaDraft } from '@/lib/productoTallas'
import type { VarianteDraftConArchivo } from '@/lib/productoVariantes'

const QUICK_ADD_DRAFT_KEY = 'mcQuickAddProductDraft'

export const INVENTARIO_PATH = '/app/inventario'
export const CATEGORIAS_PATH = '/app/inventario/categorias'

export type ProductFormContext =
  | { mode: 'add' }
  | { mode: 'edit'; productId: string; categoriaIds: string[] }

export type CategoriasPageNavState = {
  returnTo: string
  returnLabel: string
  productFormContext?: ProductFormContext
}

export type InventarioResumeState = {
  reopenProductForm?: ProductFormContext
  newCategoriaId?: string
}

import type { ProductoFormTipo } from '@/components/producto/ProductoEsRopaStep'
import type { McProductoTallaModo } from '@/types/mc'

export type QuickAddProductDraft = {
  step: 'ropa' | 'form'
  tipoProducto?: ProductoFormTipo
  /** @deprecated Usar tipoProducto */
  esRopa: boolean
  tallaModo?: McProductoTallaModo
  nombre: string
  descripcion: string
  precio: string
  precioCosto?: string
  stock: string
  tallas: TallaDraft[]
  marcarNovedad: boolean
  mostrarDescargaImagen: boolean
  mostrarBotonDocena: boolean
  descuento: ProductoDescuentoDraft
  variantes: Omit<VarianteDraftConArchivo, 'file'>[]
  skuMatrix?: import('@/lib/productoSkus').SkuDraft[]
  coloresZapatos?: import('@/lib/productoZapatos').ColorZapatoDraft[]
  imagenPrincipalColorId?: string | null
  categoriaIds: string[]
  /** ID del producto borrador en Firestore, si ya se creó. */
  draftProductId?: string
}

export function categoriasNavFromProductForm(
  context: ProductFormContext,
  returnLabel: string,
): CategoriasPageNavState {
  return {
    returnTo: INVENTARIO_PATH,
    returnLabel,
    productFormContext: context,
  }
}

export function saveQuickAddDraft(draft: QuickAddProductDraft): void {
  try {
    sessionStorage.setItem(QUICK_ADD_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* quota / private mode */
  }
}

export function loadQuickAddDraft(): QuickAddProductDraft | null {
  try {
    const raw = sessionStorage.getItem(QUICK_ADD_DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QuickAddProductDraft
  } catch {
    return null
  }
}

export function clearQuickAddDraft(): void {
  try {
    sessionStorage.removeItem(QUICK_ADD_DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export function mergeCategoriaId(ids: string[], newId: string): string[] {
  if (ids.includes(newId)) return ids
  return [...ids, newId]
}
