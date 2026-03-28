/** Carrito simple: un producto = una línea (Mi Catálogo). */
export type LineaCarritoSimple = {
  productId: string
  titulo: string
  subtitulo?: string
  precioUnitarioCop?: number
  cantidad: number
}
