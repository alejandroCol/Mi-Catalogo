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
