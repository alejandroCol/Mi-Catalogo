import type { McCategoria, McProducto } from '@/types/mc'

export type CategoriaConId = McCategoria & { id: string }
export type CategoriaConConteo = CategoriaConId & { productCount: number }
export type CategoriaTreeNode = CategoriaConId & { children: CategoriaTreeNode[] }

export function esCategoriaRaiz(c: McCategoria): boolean {
  return c.parentId == null || c.parentId === ''
}

export function esSubcategoria(c: McCategoria): boolean {
  return !esCategoriaRaiz(c)
}

export function getCategoriaById(
  id: string,
  categorias: CategoriaConId[],
): CategoriaConId | undefined {
  return categorias.find((c) => c.id === id)
}

export function getSubcategorias(parentId: string, categorias: CategoriaConId[]): CategoriaConId[] {
  return categorias
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.orden - b.orden)
}

export function getCategoriasRaiz(categorias: CategoriaConId[]): CategoriaConId[] {
  return categorias.filter(esCategoriaRaiz).sort((a, b) => a.orden - b.orden)
}

/** Solo activas; subcategorías requieren padre activo. */
export function categoriasPublicasVisibles(categorias: CategoriaConId[]): CategoriaConId[] {
  const byId = new Map(categorias.map((c) => [c.id, c]))
  return categorias.filter((c) => {
    if (!c.activa) return false
    if (esCategoriaRaiz(c)) return true
    const parent = c.parentId ? byId.get(c.parentId) : undefined
    return parent?.activa === true
  })
}

export function buildCategoriaTree(categorias: CategoriaConId[]): CategoriaTreeNode[] {
  const roots = getCategoriasRaiz(categorias)
  return roots.map((root) => ({
    ...root,
    children: getSubcategorias(root.id, categorias).map((sub) => ({ ...sub, children: [] })),
  }))
}

/** IDs de la categoría y todas sus subcategorías (para filtrar/agrupar). */
export function categoriaIdsConDescendientes(
  categoriaId: string,
  categorias: CategoriaConId[],
): string[] {
  const ids = [categoriaId]
  for (const sub of getSubcategorias(categoriaId, categorias)) ids.push(sub.id)
  return ids
}

export function productoEnCategoria(
  product: McProducto,
  categoriaId: string | null,
  categorias: CategoriaConId[] = [],
): boolean {
  if (categoriaId == null) return true
  const productIds = product.categoriaIds ?? []
  if (productIds.length === 0) return false
  const scope = categoriaIdsConDescendientes(categoriaId, categorias)
  return productIds.some((id) => scope.includes(id))
}

export function filtrarProductosPorCategoria<T extends McProducto>(
  products: T[],
  categoriaId: string | null,
  categorias: CategoriaConId[] = [],
): T[] {
  if (categoriaId == null) return products
  return products.filter((p) => productoEnCategoria(p, categoriaId, categorias))
}

export function contarProductosEnCategoria(
  products: McProducto[],
  categoriaId: string,
  categorias: CategoriaConId[],
): number {
  const subs = getSubcategorias(categoriaId, categorias)
  const scope =
    subs.length > 0 ? categoriaIdsConDescendientes(categoriaId, categorias) : [categoriaId]
  return products.filter((p) => (p.categoriaIds ?? []).some((id) => scope.includes(id))).length
}

export function contarProductosPorCategoria(
  products: McProducto[],
  categorias: CategoriaConId[],
): CategoriaConConteo[] {
  return categorias.map((cat) => ({
    ...cat,
    productCount: contarProductosEnCategoria(products, cat.id, categorias),
  }))
}

export function buildCategoryCountMap(
  products: McProducto[],
  categorias: CategoriaConId[],
): { todos: number; byId: Record<string, number> } {
  const byId: Record<string, number> = {}
  for (const cat of categorias) {
    byId[cat.id] = contarProductosEnCategoria(products, cat.id, categorias)
  }
  return { todos: products.length, byId }
}

export function categoriaTituloCatalogo(
  categoriaId: string | null,
  categorias: CategoriaConId[],
): string {
  if (categoriaId == null) return 'Colección completa'
  const cat = getCategoriaById(categoriaId, categorias)
  if (!cat) return 'Categoría'
  if (esSubcategoria(cat) && cat.parentId) {
    const parent = getCategoriaById(cat.parentId, categorias)
    if (parent) return `${parent.nombre} · ${cat.nombre}`
  }
  return cat.nombre
}

export function categoriaSubtituloCatalogo(
  count: number,
  tenantNombre?: string,
  categoriaId?: string | null,
  categorias?: CategoriaConId[],
): string {
  const prendas = count === 1 ? '1 prenda' : `${count} prendas`
  if (categoriaId && categorias) {
    const cat = getCategoriaById(categoriaId, categorias)
    if (cat && esSubcategoria(cat) && cat.parentId) {
      const parent = getCategoriaById(cat.parentId, categorias)
      if (parent) return `${prendas} · ${parent.nombre}`
    }
  }
  const tienda = tenantNombre?.trim()
  return tienda ? `${prendas} · ${tienda}` : prendas
}

export function categoriaEtiquetaProducto(
  categoriaId: string,
  categorias: CategoriaConId[],
): string {
  const cat = getCategoriaById(categoriaId, categorias)
  if (!cat) return categoriaId
  if (esSubcategoria(cat) && cat.parentId) {
    const parent = getCategoriaById(cat.parentId, categorias)
    if (parent) return `${parent.nombre} · ${cat.nombre}`
  }
  return cat.nombre
}

export function hermanosDe(categoriaId: string, categorias: CategoriaConId[]): CategoriaConId[] {
  const cat = getCategoriaById(categoriaId, categorias)
  if (!cat) return []
  if (esCategoriaRaiz(cat)) return getCategoriasRaiz(categorias)
  if (!cat.parentId) return []
  return getSubcategorias(cat.parentId, categorias)
}

export function puedeTenerSubcategorias(c: McCategoria): boolean {
  return esCategoriaRaiz(c)
}

export function puedeSerPadreDeSubcategoria(parent: McCategoria): boolean {
  return esCategoriaRaiz(parent)
}

export function nextOrdenEntreHermanos(
  parentId: string | null | undefined,
  categorias: CategoriaConId[],
): number {
  const siblings = parentId
    ? getSubcategorias(parentId, categorias)
    : getCategoriasRaiz(categorias)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((c) => c.orden)) + 1
}
