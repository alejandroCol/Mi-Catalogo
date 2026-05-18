import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'

/** Clave estable para fusionar líneas del carrito (producto + variante opcional). */
export function cartLineKey(line: Pick<LineaCarritoSimple, 'productId' | 'varianteId'>): string {
  return `${line.productId}::__v_${line.varianteId ?? ''}`
}
