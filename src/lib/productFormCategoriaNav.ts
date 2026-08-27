import type { ProductoDescuentoDraft } from '@/components/producto/ProductoDescuentoEditor'
import type { ProductoFormTipo } from '@/components/producto/ProductoEsRopaStep'
import { reviveImagenDraftPreviews, type ProductoImagenDraft } from '@/lib/productoImagenes'
import type { TallaDraft } from '@/lib/productoTallas'
import type { VarianteDraftConArchivo } from '@/lib/productoVariantes'
import type { ColorZapatoDraft } from '@/lib/productoZapatos'
import type { McProductoTallaModo } from '@/types/mc'

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
  mostrarStockCatalogo?: boolean
  descuento: ProductoDescuentoDraft
  variantes: Omit<VarianteDraftConArchivo, 'file'>[]
  skuMatrix?: import('@/lib/productoSkus').SkuDraft[]
  coloresZapatos?: import('@/lib/productoZapatos').ColorZapatoDraft[]
  imagenPrincipalColorId?: string | null
  categoriaIds: string[]
  /** URLs ya subidas (sessionStorage no puede guardar File). */
  imagenes?: { id: string; url: string }[]
  coverId?: string | null
  /** ID del producto borrador en Firestore, si ya se creó. */
  draftProductId?: string
  /** Referencia ya asignada (nombre + número) para preservarla al reabrir el borrador. */
  referencia?: string
}

/** Archivos locales del formulario: sobreviven la navegación SPA, no un reload. */
export type QuickAddMediaCache = {
  imagenes: ProductoImagenDraft[]
  coverId: string | null
  variantes: VarianteDraftConArchivo[]
  coloresZapatos: ColorZapatoDraft[]
}

let quickAddMediaCache: QuickAddMediaCache | null = null

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

export function saveQuickAddMediaCache(cache: QuickAddMediaCache): void {
  quickAddMediaCache = cache
}

export function loadQuickAddMediaCache(): QuickAddMediaCache | null {
  return quickAddMediaCache
}

export function reviveQuickAddMediaCache(cache: QuickAddMediaCache): QuickAddMediaCache {
  return {
    imagenes: reviveImagenDraftPreviews(cache.imagenes),
    coverId: cache.coverId,
    variantes: cache.variantes,
    coloresZapatos: cache.coloresZapatos.map((c) => ({
      ...c,
      imagenes: reviveImagenDraftPreviews(c.imagenes),
    })),
  }
}

export function clearQuickAddMediaCache(): void {
  quickAddMediaCache = null
}

export function serializeImagenesForDraft(
  items: ProductoImagenDraft[],
  coverId: string | null,
): { imagenes: { id: string; url: string }[]; coverId: string | null } {
  const imagenes = items
    .filter((i): i is Extract<ProductoImagenDraft, { kind: 'existing' }> => i.kind === 'existing')
    .map(({ id, url }) => ({ id, url }))
  const cover =
    coverId && imagenes.some((i) => i.id === coverId) ? coverId : (imagenes[0]?.id ?? null)
  return { imagenes, coverId: cover }
}

export function imagenesFromSerializedDraft(
  draft: Pick<QuickAddProductDraft, 'imagenes' | 'coverId'> | null | undefined,
): { items: ProductoImagenDraft[]; coverId: string | null } {
  const items: ProductoImagenDraft[] = (draft?.imagenes ?? []).map((i) => ({
    id: i.id,
    kind: 'existing',
    url: i.url,
  }))
  const coverId =
    draft?.coverId && items.some((i) => i.id === draft.coverId)
      ? draft.coverId
      : (items[0]?.id ?? null)
  return { items, coverId }
}

export function mergeCategoriaId(ids: string[], newId: string): string[] {
  if (ids.includes(newId)) return ids
  return [...ids, newId]
}
