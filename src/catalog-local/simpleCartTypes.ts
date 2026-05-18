/** Carrito simple: un producto = una línea (Mi Catálogo). */
export type LineaCarritoSimple = {
  productId: string
  /** Id de `McProductoVariante`; ausente = producto sin variante. */
  varianteId?: string
  titulo: string
  subtitulo?: string
  precioUnitarioCop?: number
  cantidad: number
}
