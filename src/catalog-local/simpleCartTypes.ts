/** Carrito simple: un producto = una línea (Mi Catálogo). */
export type LineaCarritoSimple = {
  productId: string
  /** Id de `McProductoVariante`; ausente = producto sin variante. */
  varianteId?: string
  /** Id de `McProductoTalla`; ausente = producto sin talla. */
  tallaId?: string
  titulo: string
  subtitulo?: string
  precioUnitarioCop?: number
  cantidad: number
}
