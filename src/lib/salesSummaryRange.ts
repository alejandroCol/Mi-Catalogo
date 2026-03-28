import type { McPedido } from '@/types/mc'

export type SalesSummaryPeriod = 'week' | 'fortnight'

/** Inicio del día local (medianoche). */
export function startOfLocalDay(ts = Date.now()): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Fin del día local. */
export function endOfLocalDay(ts = Date.now()): number {
  const d = new Date(ts)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

/** Lunes 00:00 local de la semana que contiene `ts`. */
export function startOfWeekMondayLocal(ts = Date.now()): number {
  const d = new Date(ts)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0)
  return monday.getTime()
}

/** Domingo 23:59:59.999 local de la semana que contiene `ts`. */
export function endOfWeekSundayLocal(ts = Date.now()): number {
  const start = startOfWeekMondayLocal(ts)
  const sun = new Date(start)
  sun.setDate(sun.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return sun.getTime()
}

/** Quincena calendario: 1–15 o 16–fin de mes (hora local). */
export function currentFortnightRangeLocal(ts = Date.now()): { start: number; end: number } {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()
  if (day <= 15) {
    const start = new Date(y, m, 1, 0, 0, 0, 0)
    const end = new Date(y, m, 15, 23, 59, 59, 999)
    return { start: start.getTime(), end: end.getTime() }
  }
  const last = new Date(y, m + 1, 0).getDate()
  const start = new Date(y, m, 16, 0, 0, 0, 0)
  const end = new Date(y, m, last, 23, 59, 59, 999)
  return { start: start.getTime(), end: end.getTime() }
}

export function periodRangeLocal(period: SalesSummaryPeriod, ts = Date.now()): { start: number; end: number } {
  if (period === 'week') {
    return { start: startOfWeekMondayLocal(ts), end: endOfWeekSundayLocal(ts) }
  }
  return currentFortnightRangeLocal(ts)
}

/** Etiqueta corta para el dashboard (es-CO). */
export function periodLabelShort(period: SalesSummaryPeriod, ts = Date.now()): string {
  if (period === 'week') {
    const a = new Date(startOfWeekMondayLocal(ts))
    const b = new Date(endOfWeekSundayLocal(ts))
    return `Semana ${a.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`
  }
  const d = new Date(ts)
  const half = d.getDate() <= 15 ? '1.ª' : '2.ª'
  return `Quincena ${half} · ${d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`
}

export function sumPedidosTotalCop(
  pedidos: Pick<McPedido, 'createdAt' | 'totalCop'>[],
  fromInclusive: number,
  toInclusive: number,
): number {
  let s = 0
  for (const p of pedidos) {
    if (p.createdAt < fromInclusive || p.createdAt > toInclusive) continue
    const t = p.totalCop
    if (typeof t === 'number' && Number.isFinite(t) && t > 0) s += t
  }
  return s
}

/** Ventana de consulta Firestore (días hacia atrás). */
export const PEDIDOS_SALES_LOOKBACK_DAYS = 45
