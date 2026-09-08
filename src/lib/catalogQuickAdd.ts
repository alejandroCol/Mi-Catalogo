import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { productoPrecioVenta } from '@/lib/productoDescuento'
import { tallasValidas } from '@/lib/productoTallas'
import { varianteEtiqueta, variantesPublicas } from '@/lib/productoVariantes'
import type { McProducto } from '@/types/mc'

/** Abre sheet si hay tallas (siempre pregunta) o más de una variante. */
export function productNeedsQuickAddOptions(product: McProducto): boolean {
  if (tallasValidas(product).length > 0) return true
  return variantesPublicas(product).length > 1
}

/** Línea de carrito para un producto simple (sin sheet de opciones). */
export function buildSimpleCartLineFromProduct(product: McProducto): LineaCarritoSimple {
  const vars = variantesPublicas(product)
  const tallas = tallasValidas(product)
  const selectedVariant = vars.length === 1 ? vars[0] : undefined
  const selectedTalla = product.esRopa && tallas.length === 1 ? tallas[0] : undefined
  const tituloParts = [product.nombre]
  if (selectedVariant) tituloParts.push(varianteEtiqueta(selectedVariant))
  if (selectedTalla?.nombre) tituloParts.push(selectedTalla.nombre)
  const imageUrl = selectedVariant?.imageUrl || product.imageUrl
  return {
    productId: product.id,
    ...(selectedVariant ? { varianteId: selectedVariant.id } : {}),
    ...(selectedTalla ? { tallaId: selectedTalla.id } : {}),
    titulo: tituloParts.join(' · '),
    ...(product.referencia?.trim() ? { referencia: product.referencia.trim() } : {}),
    precioUnitarioCop: productoPrecioVenta(product, selectedVariant),
    ...(imageUrl ? { imageUrl } : {}),
    cantidad: 1,
  }
}
