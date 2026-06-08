import type { McCategoria, McProducto } from '@/types/mc'

export type CategoriaConConteo = McCategoria & { id: string; productCount: number }

/** Producto pertenece a la categoría (o a «todos» si categoriaId es null). */
export function productoEnCategoria(
  product: McProducto,
  categoriaId: string | null,
): boolean {
  if (categoriaId == null) return true
  return (product.categoriaIds ?? []).includes(categoriaId)
}

export function filtrarProductosPorCategoria<T extends McProducto>(
  products: T[],
  categoriaId: string | null,
): T[] {
  if (categoriaId == null) return products
  return products.filter((p) => productoEnCategoria(p, categoriaId))
}

export function contarProductosPorCategoria(
  products: McProducto[],
  categorias: (McCategoria & { id: string })[],
): CategoriaConConteo[] {
  return categorias.map((cat) => ({
    ...cat,
    productCount: products.filter((p) => productoEnCategoria(p, cat.id)).length,
  }))
}

export function categoriaTituloCatalogo(
  categoriaId: string | null,
  categorias: (McCategoria & { id: string })[],
): string {
  if (categoriaId == null) return 'Colección completa'
  const cat = categorias.find((c) => c.id === categoriaId)
  return cat?.nombre ?? 'Categoría'
}

export function categoriaSubtituloCatalogo(
  count: number,
  tenantNombre?: string,
): string {
  const prendas = count === 1 ? '1 prenda' : `${count} prendas`
  const tienda = tenantNombre?.trim()
  return tienda ? `${prendas} · ${tienda}` : prendas
}
