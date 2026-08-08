import type { McComboColorSeleccion } from '@/types/mc'

/** Carrito simple: un producto = una línea (Mi Catálogo). */
export type LineaCarritoSimple = {
  productId: string
  /** Id de `McProductoVariante`; ausente = producto sin variante. */
  varianteId?: string
  /** Id de `McProductoTalla`; ausente = producto sin talla. */
  tallaId?: string
  titulo: string
  /** Referencia del producto (nombre + número), para pedidos WhatsApp. */
  referencia?: string
  subtitulo?: string
  precioUnitarioCop?: number
  /** Snapshot de imagen al agregar (thumb del carrito). */
  imageUrl?: string
  cantidad: number
  esCombo?: boolean
  comboColorSeleccion?: McComboColorSeleccion[]
}
