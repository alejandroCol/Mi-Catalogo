import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'

/** Clave estable para fusionar líneas del carrito (producto + variante + talla opcionales). */
export function cartLineKey(line: Pick<LineaCarritoSimple, 'productId' | 'varianteId' | 'tallaId'>): string {
  return `${line.productId}::__v_${line.varianteId ?? ''}::__t_${line.tallaId ?? ''}`
}
