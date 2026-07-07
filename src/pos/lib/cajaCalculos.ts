import type { McPosVenta } from '@/types/mc'
import {
  cajaAtribucionMs,
  cajaAtribucionVendedorUid,
  ingresoContableCop,
  isVentaActiva,
  isVentaCobrada,
} from '@/pos/lib/posVentaUtils'

export function montoEfectivoVenta(v: McPosVenta) {
  if (!isVentaActiva(v) || !isVentaCobrada(v)) return 0
  return v.pagos.filter((p) => p.metodo === 'efectivo').reduce((s, p) => s + p.monto, 0)
}

export function montoTransferenciaVenta(v: McPosVenta) {
  if (!isVentaActiva(v) || !isVentaCobrada(v)) return 0
  return v.pagos
    .filter((p) => p.metodo === 'transferencia' || p.metodo === 'nequi')
    .reduce((s, p) => s + p.monto, 0)
}

function rangoDiaMs(fechaKey: string) {
  const [y, m, d] = fechaKey.split('-').map(Number)
  const start = new Date(y!, m! - 1, d!).getTime()
  return { start, end: start + 86400000 }
}

function ventaEnCajaDia(v: McPosVenta, sedeId: string, fechaKey: string, vendedorUid?: string) {
  const { start, end } = rangoDiaMs(fechaKey)
  const ms = cajaAtribucionMs(v)
  if (!isVentaActiva(v) || v.sedeId !== sedeId || ms < start || ms >= end) return false
  if (vendedorUid != null && cajaAtribucionVendedorUid(v) !== vendedorUid) return false
  return true
}

export function ventasDelDiaSede(ventas: McPosVenta[], sedeId: string, fechaKey: string) {
  return ventas
    .filter((v) => ventaEnCajaDia(v, sedeId, fechaKey))
    .sort((a, b) => cajaAtribucionMs(a) - cajaAtribucionMs(b))
}

export function ventasDelDiaVendedor(
  ventas: McPosVenta[],
  sedeId: string,
  vendedorUid: string,
  fechaKey: string,
) {
  return ventas
    .filter((v) => ventaEnCajaDia(v, sedeId, fechaKey, vendedorUid))
    .sort((a, b) => cajaAtribucionMs(a) - cajaAtribucionMs(b))
}

export function ventasEfectivoDelDiaSede(ventas: McPosVenta[], sedeId: string, fechaKey: string) {
  return ventasDelDiaSede(ventas, sedeId, fechaKey).reduce((s, v) => s + montoEfectivoVenta(v), 0)
}

export function totalVentasDelDiaSede(ventas: McPosVenta[], sedeId: string, fechaKey: string) {
  return ventasDelDiaSede(ventas, sedeId, fechaKey).reduce((s, v) => s + ingresoContableCop(v), 0)
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

export function totalMovimientosCaja(movimientos: { montoCop: number }[]) {
  return movimientos.reduce((s, m) => s + m.montoCop, 0)
}
