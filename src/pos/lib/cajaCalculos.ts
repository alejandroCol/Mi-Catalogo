import type { McPosVenta } from '@/types/mc'
import { isVentaActiva } from '@/pos/lib/posVentaUtils'

export function montoEfectivoVenta(v: McPosVenta) {
  if (!isVentaActiva(v)) return 0
  return v.pagos.filter((p) => p.metodo === 'efectivo').reduce((s, p) => s + p.monto, 0)
}

export function montoTransferenciaVenta(v: McPosVenta) {
  if (!isVentaActiva(v)) return 0
  return v.pagos
    .filter((p) => p.metodo === 'transferencia' || p.metodo === 'nequi')
    .reduce((s, p) => s + p.monto, 0)
}

function rangoDiaMs(fechaKey: string) {
  const [y, m, d] = fechaKey.split('-').map(Number)
  const start = new Date(y!, m! - 1, d!).getTime()
  return { start, end: start + 86400000 }
}

export function ventasDelDiaSede(ventas: McPosVenta[], sedeId: string, fechaKey: string) {
  const { start, end } = rangoDiaMs(fechaKey)
  return ventas
    .filter(
      (v) =>
        isVentaActiva(v) &&
        v.sedeId === sedeId &&
        v.createdAt >= start &&
        v.createdAt < end,
    )
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function ventasDelDiaVendedor(
  ventas: McPosVenta[],
  sedeId: string,
  vendedorUid: string,
  fechaKey: string,
) {
  const { start, end } = rangoDiaMs(fechaKey)
  return ventas
    .filter(
      (v) =>
        isVentaActiva(v) &&
        v.sedeId === sedeId &&
        v.vendedorUid === vendedorUid &&
        v.createdAt >= start &&
        v.createdAt < end,
    )
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function ventasEfectivoDelDiaSede(ventas: McPosVenta[], sedeId: string, fechaKey: string) {
  return ventasDelDiaSede(ventas, sedeId, fechaKey).reduce((s, v) => s + montoEfectivoVenta(v), 0)
}

export function totalVentasDelDiaSede(ventas: McPosVenta[], sedeId: string, fechaKey: string) {
  return ventasDelDiaSede(ventas, sedeId, fechaKey).reduce((s, v) => s + v.totalCop, 0)
}

export function ventasEfectivoDelDia(
  ventas: McPosVenta[],
  sedeId: string,
  vendedorUid: string,
  fechaKey: string,
) {
  return ventasDelDiaVendedor(ventas, sedeId, vendedorUid, fechaKey).reduce(
    (s, v) => s + montoEfectivoVenta(v),
    0,
  )
}

export function efectivoEsperadoCaja(
  saldoInicial: number,
  ventasEfectivo: number,
  totalEgresos: number,
  totalIngresos = 0,
) {
  return saldoInicial + ventasEfectivo + totalIngresos - totalEgresos
}

export function totalMovimientosCaja(
  movimientos: { montoCop: number }[],
) {
  return movimientos.reduce((s, m) => s + m.montoCop, 0)
}
