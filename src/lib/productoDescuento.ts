import { variantePrecioEfectivo } from '@/lib/productoVariantes'
import type { McProducto, McProductoVariante, McTenant } from '@/types/mc'

export type McDescuentoTipo = 'porcentaje' | 'monto_fijo'

export function productoDescuentoConfig(
  prod: McProducto,
): { tipo: McDescuentoTipo; valor: number } | null {
  if (!prod.descuentoActivo || !prod.descuentoTipo || prod.descuentoValor == null) return null
  const valor = Math.round(prod.descuentoValor)
  if (valor <= 0) return null
  if (prod.descuentoTipo === 'porcentaje' && valor > 100) return null
  return { tipo: prod.descuentoTipo, valor }
}

export function descuentoMontoDesdePrecio(
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

export function productoPrecioLista(prod: McProducto, variante?: McProductoVariante | null): number {
  if (variante) return variantePrecioEfectivo(variante, prod)
  return Math.max(0, Math.round(prod.precioCop ?? 0))
}

export function productoPrecioVenta(prod: McProducto, variante?: McProductoVariante | null): number {
  const lista = productoPrecioLista(prod, variante)
  const cfg = productoDescuentoConfig(prod)
  if (!cfg) return lista
  const desc = descuentoMontoDesdePrecio(lista, cfg.tipo, cfg.valor)
  return Math.max(0, lista - desc)
}

export function productoTieneDescuento(prod: McProducto): boolean {
  const cfg = productoDescuentoConfig(prod)
  if (!cfg) return false
  const lista = productoPrecioLista(prod)
  const venta = productoPrecioVenta(prod)
  return lista > 0 && venta < lista
}

export function productoPorcentajeDescuentoDisplay(
  prod: McProducto,
  variante?: McProductoVariante | null,
): number | null {
  const cfg = productoDescuentoConfig(prod)
  if (!cfg) return null
  const lista = productoPrecioLista(prod, variante)
  const venta = productoPrecioVenta(prod, variante)
  if (lista <= 0 || venta >= lista) return null
  if (cfg.tipo === 'porcentaje') return Math.min(100, Math.max(1, cfg.valor))
  return Math.max(1, Math.round(((lista - venta) / lista) * 100))
}

function variantesConNombre(prod: McProducto): McProductoVariante[] {
  return (prod.variantes ?? []).filter((v) => v.nombre?.trim())
}

/** Precio de venta más bajo (útil en tarjetas con variantes). */
export function productoPrecioVentaDesde(prod: McProducto): number {
  const vs = variantesConNombre(prod)
  if (vs.length === 0) return productoPrecioVenta(prod)
  return Math.min(...vs.map((v) => productoPrecioVenta(prod, v)))
}

/** Precio de lista más bajo (útil en tarjetas con variantes). */
export function productoPrecioListaDesde(prod: McProducto): number {
  const vs = variantesConNombre(prod)
  if (vs.length === 0) return productoPrecioLista(prod)
  return Math.min(...vs.map((v) => productoPrecioLista(prod, v)))
}

/** Mayor % de ahorro entre variantes (badge en listado). */
export function productoPorcentajeDescuentoMax(prod: McProducto): number | null {
  const vs = variantesConNombre(prod)
  if (vs.length === 0) return productoPorcentajeDescuentoDisplay(prod)
  let max: number | null = null
  for (const v of vs) {
    const pct = productoPorcentajeDescuentoDisplay(prod, v)
    if (pct != null && (max == null || pct > max)) max = pct
  }
  return max
}

export function resolveCatalogDescuentosTabLabel(tenant: McTenant): string {
  const label = tenant.catalogDescuentosTab?.label?.trim()
  return label || 'Descuento'
}

export function catalogDescuentosTabVisible(tenant: McTenant, discountedCount: number): boolean {
  return !!tenant.catalogDescuentosTab?.enabled && discountedCount > 0
}
