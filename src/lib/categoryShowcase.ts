import {
  filtrarProductosPorCategoria,
  getCategoriaById,
  type CategoriaConId,
} from '@/lib/catalogCategorias'
import { productoUsaStockPorTalla, tallasValidas } from '@/lib/productoTallas'
import type { McCategoryShowcase, McProducto, McTenant } from '@/types/mc'

export const CATEGORY_SHOWCASE_LIMITS = {
  title: 48,
  maxProducts: 24,
  maxSizeLabels: 8,
} as const

export type CategoryShowcaseCardModel = {
  product: McProducto & { id: string }
  primaryImage?: string
  secondaryImage?: string
  sizeLabels: string[]
}

function trimTitle(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, CATEGORY_SHOWCASE_LIMITS.title)
}

export function sanitizeCategoryShowcase(raw: {
  enabled: boolean
  categoriaId?: string
  title?: string
}): McCategoryShowcase | null {
  const categoriaId = (raw.categoriaId ?? '').trim()
  if (!raw.enabled) return null
  if (!categoriaId) return null
  const title = trimTitle(raw.title)
  return {
    enabled: true,
    categoriaId,
    ...(title ? { title } : {}),
    updatedAt: Date.now(),
  }
}

export function buildCategoryShowcaseForSave(
  enabled: boolean,
  fields: { categoriaId?: string; title?: string },
): McCategoryShowcase | null {
  return sanitizeCategoryShowcase({ enabled, ...fields })
}

export function isCategoryShowcaseActive(
  tenant: McTenant | null | undefined,
  categorias: CategoriaConId[],
): boolean {
  const raw = tenant?.categoryShowcase
  if (!raw?.enabled || !raw.categoriaId) return false
  return getCategoriaById(raw.categoriaId, categorias) != null
}

export function resolveCategoryShowcaseTitle(
  config: Pick<McCategoryShowcase, 'categoriaId' | 'title'>,
  categorias: CategoriaConId[],
): string {
  const custom = trimTitle(config.title)
  if (custom) return custom
  return getCategoriaById(config.categoriaId, categorias)?.nombre.trim() || 'Colección'
}

export function selectCategoryShowcaseProducts<T extends McProducto & { id: string }>(
  products: T[],
  categoriaId: string,
  categorias: CategoriaConId[],
): T[] {
  return filtrarProductosPorCategoria(products, categoriaId, categorias).slice(
    0,
    CATEGORY_SHOWCASE_LIMITS.maxProducts,
  )
}

function pushUniqueImage(urls: string[], url?: string) {
  const trimmed = url?.trim()
  if (trimmed && !urls.includes(trimmed)) urls.push(trimmed)
}

/** Portada y hover: producto, galería y fotos de variantes (color/tela). */
export function collectProductImageUrls(product: McProducto): string[] {
  const urls: string[] = []
  pushUniqueImage(urls, product.imageUrl)
  for (const url of product.galeriaImagenes ?? []) pushUniqueImage(urls, url)

  const variantes = product.variantes ?? []
  const principal = product.imagenPrincipalColorId
    ? variantes.find((v) => v.id === product.imagenPrincipalColorId)
    : undefined
  if (principal) {
    pushUniqueImage(urls, principal.imageUrl)
    for (const url of principal.galeriaImagenes ?? []) pushUniqueImage(urls, url)
  }
  for (const variante of variantes) {
    pushUniqueImage(urls, variante.imageUrl)
    for (const url of variante.galeriaImagenes ?? []) pushUniqueImage(urls, url)
  }
  return urls
}

export function resolveProductHoverImages(product: McProducto): {
  primaryImage?: string
  secondaryImage?: string
} {
  const urls = collectProductImageUrls(product)
  if (urls.length === 0) return {}
  if (urls.length === 1) return { primaryImage: urls[0] }
  return { primaryImage: urls[0], secondaryImage: urls[1] }
}

export function resolveShowcaseSizeLabels(product: McProducto): string[] {
  const tallas = tallasValidas(product)
  if (tallas.length === 0) return []
  const withStock = productoUsaStockPorTalla(product)
    ? tallas.filter((t) => Math.floor(t.stock ?? 0) > 0)
    : tallas
  const source = withStock.length > 0 ? withStock : tallas
  return source
    .map((t) => t.nombre.trim())
    .filter(Boolean)
    .slice(0, CATEGORY_SHOWCASE_LIMITS.maxSizeLabels)
}

export function toCategoryShowcaseCardModel(
  product: McProducto & { id: string },
): CategoryShowcaseCardModel {
  const images = resolveProductHoverImages(product)
  return {
    product,
    ...images,
    sizeLabels: resolveShowcaseSizeLabels(product),
  }
}
