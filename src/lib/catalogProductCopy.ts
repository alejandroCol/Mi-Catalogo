/** Etiqueta de producto en catálogo público (agnóstica de rubro: no asume ropa). */
export function catalogArticuloLabel(count: number): string {
  return count === 1 ? 'artículo' : 'artículos'
}

export function formatCatalogArticulosCount(count: number): string {
  return `${count} ${catalogArticuloLabel(count)}`
}
