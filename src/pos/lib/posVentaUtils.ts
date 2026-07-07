import type { McPosLineaVenta, McPosVenta } from '@/types/mc'

export function lineaVentaKey(productoId: string, varianteId?: string): string {
  return varianteId ? `${productoId}__${varianteId}` : productoId
}

export function lineaVentaKeyFromLinea(linea: McPosLineaVenta): string {
  return lineaVentaKey(linea.productoId, linea.varianteId)
}

export function isVentaActiva(v: McPosVenta): boolean {
  return v.estado !== 'anulada'
}

export function ventasActivas<T extends McPosVenta>(ventas: T[]): T[] {
  return ventas.filter(isVentaActiva)
}

export function isVentaContraEntrega(v: McPosVenta): boolean {
  return v.esContraEntrega === true
}

export function isVentaPendienteCobro(v: McPosVenta): boolean {
  return isVentaActiva(v) && isVentaContraEntrega(v) && v.estadoPago !== 'pagado'
}

export function isVentaCobrada(v: McPosVenta): boolean {
  if (!isVentaActiva(v)) return false
  if (isVentaContraEntrega(v)) return v.estadoPago === 'pagado'
  return true
}

export function montoCobradoVenta(v: McPosVenta): number {
  if (!isVentaCobrada(v)) return 0
  return v.pagos.reduce((s, p) => s + p.monto, 0)
}

/** Ingreso contable: $0 mientras la venta contra entrega siga pendiente. */
export function ingresoContableCop(v: McPosVenta): number {
  if (!isVentaActiva(v)) return 0
  if (isVentaContraEntrega(v) && !isVentaCobrada(v)) return 0
  return v.totalCop
}

/** Fecha para reportes de ingreso: cobro real en CE, creación en ventas inmediatas. */
export function ingresoContableMs(v: McPosVenta): number | null {
  if (ingresoContableCop(v) <= 0) return null
  if (isVentaContraEntrega(v) && v.pagadoAt != null) return v.pagadoAt
  return v.createdAt
}

export function ventaIngresoEnRango(v: McPosVenta, start: number, end: number): boolean {
  const ms = ingresoContableMs(v)
  return ms != null && ms >= start && ms < end
}

/** Vendedor al que se atribuye el efectivo en caja (cobrador en CE). */
export function cajaAtribucionVendedorUid(v: McPosVenta): string {
  if (isVentaContraEntrega(v) && v.cobradoPorUid) return v.cobradoPorUid
  return v.vendedorUid
}

/** Fecha para arqueo de caja: día del cobro en CE, día de la venta en el resto. */
export function cajaAtribucionMs(v: McPosVenta): number {
  if (isVentaContraEntrega(v) && v.pagadoAt != null) return v.pagadoAt
  return v.createdAt
}

export function saldoPendienteVenta(v: McPosVenta): number {
  if (!isVentaPendienteCobro(v)) return 0
  return Math.max(0, v.totalCop - montoCobradoVenta(v))
}
