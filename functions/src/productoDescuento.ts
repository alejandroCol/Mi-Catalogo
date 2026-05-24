export type McDescuentoTipo = 'porcentaje' | 'monto_fijo'

type ProductoDescuentoFields = {
  descuentoActivo?: boolean
  descuentoTipo?: McDescuentoTipo
  descuentoValor?: number
  precioCop?: number
}

function productoDescuentoConfig(
  prod: ProductoDescuentoFields,
): { tipo: McDescuentoTipo; valor: number } | null {
  if (!prod.descuentoActivo || !prod.descuentoTipo || prod.descuentoValor == null) return null
  const valor = Math.round(prod.descuentoValor)
  if (valor <= 0) return null
  if (prod.descuentoTipo === 'porcentaje' && valor > 100) return null
  return { tipo: prod.descuentoTipo, valor }
}

function descuentoMontoDesdePrecio(
  precioListaCop: number,
  tipo: McDescuentoTipo,
  valor: number,
): number {
  const precio = Math.max(0, Math.round(precioListaCop))
  if (precio <= 0) return 0
  if (tipo === 'porcentaje') {
    const p = Math.min(100, Math.max(0, valor))
    return Math.min(precio, Math.round((precio * p) / 100))
  }
  return Math.min(precio, Math.max(0, Math.round(valor)))
}

/** Precio de venta con descuento de producto aplicado sobre `precioCop`. */
export function productoPrecioVentaFromData(prod: ProductoDescuentoFields): number {
  const lista = Math.max(0, Math.round(prod.precioCop ?? 0))
  const cfg = productoDescuentoConfig(prod)
  if (!cfg) return lista
  const desc = descuentoMontoDesdePrecio(lista, cfg.tipo, cfg.valor)
  return Math.max(0, lista - desc)
}
