import { MC_ANALYTICS_TIMEZONE } from '@/lib/mcAnalyticsDates'

export type ReportPeriodPreset =
  | 'hoy'
  | '7d'
  | '14d'
  | '30d'
  | 'semana'
  | 'quincena'
  | 'mes'
  | 'personalizado'

export type ReportDateRange = {
  preset: ReportPeriodPreset
  desde: string
  hasta: string
  startMs: number
  endMs: number
}

export const REPORT_PERIOD_OPTIONS: { id: ReportPeriodPreset; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '14d', label: '14 días' },
  { id: '30d', label: '30 días' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'quincena', label: 'Esta quincena' },
  { id: 'mes', label: 'Este mes' },
]

function bogotaDateKey(ms = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: MC_ANALYTICS_TIMEZONE }).format(new Date(ms))
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!, 12, 0, 0, 0)
}

function dateKeyFromParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function bogotaParts(ms = Date.now()): { y: number; m: number; d: number; weekday: number } {
  const key = bogotaDateKey(ms)
  const [y, m, d] = key.split('-').map(Number)
  const weekday = parseDateKey(key).getDay()
  return { y: y!, m: m!, d: d!, weekday }
}

/** Inicio del día en ms local (para queries Firestore). */
export function reportRangeToMs(desde: string, hasta: string): { startMs: number; endMs: number } {
  const start = parseDateKey(desde)
  start.setHours(0, 0, 0, 0)
  const end = parseDateKey(hasta)
  end.setHours(23, 59, 59, 999)
  return { startMs: start.getTime(), endMs: end.getTime() + 1 }
}

export function reportPresetToRange(
  preset: ReportPeriodPreset,
  custom?: { desde: string; hasta: string },
): ReportDateRange {
  const hoy = bogotaDateKey()
  if (preset === 'personalizado' && custom?.desde && custom?.hasta) {
    const { startMs, endMs } = reportRangeToMs(custom.desde, custom.hasta)
    return { preset, desde: custom.desde, hasta: custom.hasta, startMs, endMs }
  }
  if (preset === 'hoy') {
    const { startMs, endMs } = reportRangeToMs(hoy, hoy)
    return { preset, desde: hoy, hasta: hoy, startMs, endMs }
  }
  if (preset === '7d' || preset === '14d' || preset === '30d') {
    const days = preset === '7d' ? 7 : preset === '14d' ? 14 : 30
    const endMs = Date.now()
    const desdeMs = endMs - (days - 1) * 24 * 60 * 60 * 1000
    const desde = bogotaDateKey(desdeMs)
    const { startMs, endMs: endExclusive } = reportRangeToMs(desde, hoy)
    return { preset, desde, hasta: hoy, startMs, endMs: endExclusive }
  }
  const { y, m, d } = bogotaParts()
  if (preset === 'mes') {
    const desde = dateKeyFromParts(y, m, 1)
    const { startMs, endMs } = reportRangeToMs(desde, hoy)
    return { preset, desde, hasta: hoy, startMs, endMs }
  }
  if (preset === 'quincena') {
    const firstDay = d <= 15 ? 1 : 16
    const desde = dateKeyFromParts(y, m, firstDay)
    const { startMs, endMs } = reportRangeToMs(desde, hoy)
    return { preset, desde, hasta: hoy, startMs, endMs }
  }
  if (preset === 'semana') {
    const { weekday } = bogotaParts()
    const mondayOffset = weekday === 0 ? 6 : weekday - 1
    const mondayMs = Date.now() - mondayOffset * 24 * 60 * 60 * 1000
    const desde = bogotaDateKey(mondayMs)
    const { startMs, endMs } = reportRangeToMs(desde, hoy)
    return { preset, desde, hasta: hoy, startMs, endMs }
  }
  const { startMs, endMs } = reportRangeToMs(hoy, hoy)
  return { preset: 'hoy', desde: hoy, hasta: hoy, startMs, endMs }
}

export function reportFormatRangeLabel(desde: string, hasta: string): string {
  const fmt = (key: string) =>
    parseDateKey(key).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  if (desde === hasta) return fmt(desde)
  return `${fmt(desde)} – ${fmt(hasta)}`
}

export function reportDateKeysBetween(desde: string, hasta: string): string[] {
  const keys: string[] = []
  const cur = parseDateKey(desde)
  const end = parseDateKey(hasta)
  while (cur <= end) {
    keys.push(bogotaDateKey(cur.getTime()))
    cur.setDate(cur.getDate() + 1)
  }
  return keys
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function reportDiaSemanaLabel(dateKey: string): string {
  return DIAS_SEMANA[parseDateKey(dateKey).getDay()] ?? dateKey
}

export function reportDiaSemanaCorto(dateKey: string): string {
  return reportDiaSemanaLabel(dateKey).slice(0, 3)
}

export function reportHourBucket(ms: number): number {
  return new Date(ms).getHours()
}
