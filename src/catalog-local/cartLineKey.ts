import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { comboColorSeleccionKey } from '@/lib/comboProducto'

/** Clave estable para fusionar líneas del carrito (producto + variante + talla + colores combo). */
export function cartLineKey(
  line: Pick<LineaCarritoSimple, 'productId' | 'varianteId' | 'tallaId' | 'comboColorSeleccion'>,
): string {
  const colorKey = line.comboColorSeleccion?.length
    ? comboColorSeleccionKey(line.comboColorSeleccion)
    : ''
  return `${line.productId}::__v_${line.varianteId ?? ''}::__t_${line.tallaId ?? ''}::__c_${colorKey}`
}
