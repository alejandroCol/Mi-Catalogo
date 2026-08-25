import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import type { McProducto, McWishlistItem } from '@/types/mc'
import { productoPrecioVenta } from '@/lib/productoDescuento'
import { wishlistItemPendingQty } from '@/lib/wishlist/wishlistNormalize'

/** Convierte líneas del carrito en ítems de lista de regalos. */
export function cartLinesToWishlistItems(lines: LineaCarritoSimple[]): McWishlistItem[] {
  return lines.map((l) => ({
    productId: l.productId,
    titulo: l.titulo,
    cantidadDeseada: Math.max(1, Math.floor(l.cantidad) || 1),
    ...(l.varianteId ? { varianteId: l.varianteId } : {}),
    ...(l.tallaId ? { tallaId: l.tallaId } : {}),
    ...(l.referencia?.trim() ? { referencia: l.referencia.trim() } : {}),
    ...(l.subtitulo ? { subtitulo: l.subtitulo } : {}),
    ...(l.imageUrl ? { imageUrl: l.imageUrl } : {}),
    ...(l.precioUnitarioCop != null && l.precioUnitarioCop > 0
      ? { precioUnitarioCop: Math.round(l.precioUnitarioCop) }
      : {}),
  }))
}

/** Favoritos → ítems de lista (sin variante). */
export function productsToWishlistItems(products: McProducto[]): McWishlistItem[] {
  return products.map((p) => {
    const img = p.imageUrl || p.galeriaImagenes?.[0]
    const precio = productoPrecioVenta(p)
    return {
      productId: p.id,
      titulo: p.nombre,
      cantidadDeseada: 1,
      ...(p.referencia?.trim() ? { referencia: p.referencia.trim() } : {}),
      ...(img ? { imageUrl: img } : {}),
      ...(precio > 0 ? { precioUnitarioCop: precio } : {}),
    }
  })
}

/** True si el amigo debe elegir variante/talla/combo en la ficha. */
export function productoRequiereOpcionCompra(p: McProducto): boolean {
  if (p.tipoProducto === 'combo') return true
  if ((p.variantes?.length ?? 0) > 0) return true
  if ((p.tallas?.length ?? 0) > 0) return true
  return false
}

export function wishlistItemToCartLine(
  item: McWishlistItem,
  product?: McProducto | null,
): LineaCarritoSimple | null {
  const pending = wishlistItemPendingQty(item)
  if (pending <= 0) return null
  if (product && productoRequiereOpcionCompra(product) && !item.varianteId && !item.tallaId) {
    return null
  }
  const precio =
    item.precioUnitarioCop != null && item.precioUnitarioCop > 0
      ? item.precioUnitarioCop
      : product
        ? productoPrecioVenta(product)
        : undefined
  const imageUrl = item.imageUrl || product?.imageUrl || product?.galeriaImagenes?.[0]
  return {
    productId: item.productId,
    titulo: item.titulo || product?.nombre || 'Producto',
    cantidad: pending,
    ...(item.varianteId ? { varianteId: item.varianteId } : {}),
    ...(item.tallaId ? { tallaId: item.tallaId } : {}),
    ...(item.referencia?.trim()
      ? { referencia: item.referencia.trim() }
      : product?.referencia?.trim()
        ? { referencia: product.referencia.trim() }
        : {}),
    ...(item.subtitulo ? { subtitulo: item.subtitulo } : {}),
    ...(precio != null && precio > 0 ? { precioUnitarioCop: Math.round(precio) } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  }
}

export function wishlistItemsToCartLines(
  items: McWishlistItem[],
  productsById: Map<string, McProducto>,
): { lines: LineaCarritoSimple[]; skippedNeedOptions: McWishlistItem[] } {
  const lines: LineaCarritoSimple[] = []
  const skippedNeedOptions: McWishlistItem[] = []
  for (const item of items) {
    const product = productsById.get(item.productId) ?? null
    if (product && productoRequiereOpcionCompra(product) && !item.varianteId && !item.tallaId) {
      if (wishlistItemPendingQty(item) > 0) skippedNeedOptions.push(item)
      continue
    }
    const line = wishlistItemToCartLine(item, product)
    if (line) lines.push(line)
  }
  return { lines, skippedNeedOptions }
}
