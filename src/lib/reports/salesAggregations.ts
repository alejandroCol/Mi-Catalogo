import {
  reportDateKeysBetween,
  reportDiaSemanaLabel,
  reportHourBucket,
  type ReportDateRange,
} from '@/lib/reports/reportDateRange'
import { mcAnalyticsDateKeyBogota, mcAnalyticsShortDayLabel } from '@/lib/mcAnalyticsDates'
import { ingresoContableCop, ingresoContableMs, isVentaActiva, isVentaCobrada } from '@/pos/lib/posVentaUtils'
import { isOrdenCatalogoVentaValida } from '@/lib/reports/profitMetrics'
import type { McAnalyticsDaily, McOrdenCatalogo, McPosVenta } from '@/types/mc'

export type ChartPoint = { label: string; value: number; extra?: string }

export function aggregateCatalogByDay(orders: McOrdenCatalogo[]): ChartPoint[] {
  const map = new Map<string, number>()
  for (const o of orders) {
    if (!isOrdenCatalogoVentaValida(o)) continue
    const key = mcAnalyticsDateKeyBogota(o.createdAt)
    map.set(key, (map.get(key) ?? 0) + o.totalCop)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ label: mcAnalyticsShortDayLabel(key), value, extra: key }))
}

export function aggregateCatalogByHour(orders: McOrdenCatalogo[]): ChartPoint[] {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, '0')}:00`,
    value: 0,
  }))
  for (const o of orders) {
    if (!isOrdenCatalogoVentaValida(o)) continue
    const h = reportHourBucket(o.createdAt)
    buckets[h]!.value += o.totalCop
  }
  return buckets
}

export function aggregateCatalogByCiudad(orders: McOrdenCatalogo[]): ChartPoint[] {
  const map = new Map<string, number>()
  for (const o of orders) {
    if (!isOrdenCatalogoVentaValida(o)) continue
    const ciudad = o.envioCiudad?.trim() || o.envioDepartamento?.trim() || 'Sin ubicación'
    map.set(ciudad, (map.get(ciudad) ?? 0) + o.totalCop)
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export function aggregateCatalogByDiaSemana(orders: McOrdenCatalogo[]): ChartPoint[] {
  const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const map = new Map<string, number>()
  for (const name of order) map.set(name, 0)
  for (const o of orders) {
    if (!isOrdenCatalogoVentaValida(o)) continue
    const label = reportDiaSemanaLabel(mcAnalyticsDateKeyBogota(o.createdAt))
    map.set(label, (map.get(label) ?? 0) + o.totalCop)
  }
  return order.map((label) => ({ label, value: map.get(label) ?? 0 }))
}

export function aggregatePosByDay(ventas: McPosVenta[]): ChartPoint[] {
  const map = new Map<string, number>()
  for (const v of ventas) {
    if (!isVentaActiva(v)) continue
    const ingreso = ingresoContableCop(v)
    const ms = ingresoContableMs(v)
    if (ingreso <= 0 || ms == null) continue
    const key = mcAnalyticsDateKeyBogota(ms)
    map.set(key, (map.get(key) ?? 0) + ingreso)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ label: mcAnalyticsShortDayLabel(key), value, extra: key }))
}

export function aggregatePosByHour(ventas: McPosVenta[]): ChartPoint[] {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, '0')}:00`,
    value: 0,
  }))
  for (const v of ventas) {
    if (!isVentaActiva(v)) continue
    const ingreso = ingresoContableCop(v)
    const ms = ingresoContableMs(v)
    if (ingreso <= 0 || ms == null) continue
    buckets[reportHourBucket(ms)]!.value += ingreso
  }
  return buckets
}

export function aggregatePosBySede(
  ventas: McPosVenta[],
  sedeNames: Map<string, string>,
): ChartPoint[] {
  const map = new Map<string, number>()
  for (const v of ventas) {
    if (!isVentaActiva(v)) continue
    const ingreso = ingresoContableCop(v)
    if (ingreso <= 0) continue
    const label = sedeNames.get(v.sedeId) ?? v.sedeId
    map.set(label, (map.get(label) ?? 0) + ingreso)
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export function aggregatePosByDiaSemana(ventas: McPosVenta[]): ChartPoint[] {
  const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const map = new Map<string, number>()
  for (const name of order) map.set(name, 0)
  for (const v of ventas) {
    if (!isVentaActiva(v)) continue
    const ingreso = ingresoContableCop(v)
    const ms = ingresoContableMs(v)
    if (ingreso <= 0 || ms == null) continue
    const label = reportDiaSemanaLabel(mcAnalyticsDateKeyBogota(ms))
    map.set(label, (map.get(label) ?? 0) + ingreso)
  }
  return order.map((label) => ({ label, value: map.get(label) ?? 0 }))
}

export function aggregatePosByMetodoPago(ventas: McPosVenta[]): ChartPoint[] {
  const map = new Map<string, number>()
  for (const v of ventas) {
    if (!isVentaActiva(v) || !isVentaCobrada(v)) continue
    for (const p of v.pagos) {
      const label =
        p.metodo === 'efectivo'
          ? 'Efectivo'
          : p.metodo === 'transferencia'
            ? 'Transferencia'
            : p.metodo === 'nequi'
              ? 'Nequi'
              : 'Crédito'
      map.set(label, (map.get(label) ?? 0) + p.monto)
    }
  }
  return [...map.entries()].map(([label, value]) => ({ label, value }))
}

export function mergeVisitsWithSales(
  dailyAnalytics: McAnalyticsDaily[],
  salesByDay: Map<string, number>,
  range: ReportDateRange,
): { label: string; visitas: number; ventas: number }[] {
  const keys = reportDateKeysBetween(range.desde, range.hasta)
  const analyticsMap = new Map(dailyAnalytics.map((d) => [d.dateKey, d.visits]))
  return keys.map((key) => ({
    label: mcAnalyticsShortDayLabel(key),
    visitas: analyticsMap.get(key) ?? 0,
    ventas: salesByDay.get(key) ?? 0,
  }))
}

export function topCatalogProducts(
  orders: McOrdenCatalogo[],
  limit = 10,
): { nombre: string; unidades: number; ingresoCop: number }[] {
  const map = new Map<string, { nombre: string; unidades: number; ingresoCop: number }>()
  for (const o of orders) {
    if (!isOrdenCatalogoVentaValida(o)) continue
    for (const l of o.lineas) {
      const cur = map.get(l.productId) ?? { nombre: l.nombre, unidades: 0, ingresoCop: 0 }
      cur.unidades += l.cantidad
      cur.ingresoCop += l.precioUnitarioCop * l.cantidad
      map.set(l.productId, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.ingresoCop - a.ingresoCop).slice(0, limit)
}

export function topPosProducts(
  ventas: McPosVenta[],
  limit = 10,
): { nombre: string; unidades: number; ingresoCop: number }[] {
  const map = new Map<string, { nombre: string; unidades: number; ingresoCop: number }>()
  for (const v of ventas) {
    if (!isVentaActiva(v)) continue
    for (const l of v.lineas) {
      const cur = map.get(l.productoId) ?? { nombre: l.nombre, unidades: 0, ingresoCop: 0 }
      cur.unidades += l.cantidad
      if (isVentaCobrada(v)) {
        cur.ingresoCop += l.subtotalCop
      }
      map.set(l.productoId, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.ingresoCop - a.ingresoCop).slice(0, limit)
}
