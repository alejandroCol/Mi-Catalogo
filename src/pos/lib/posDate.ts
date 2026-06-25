/** Fecha local Colombia en formato YYYY-MM-DD. */
export function posFechaKeyLocal(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${d}`
}

export function posRangoDiaLocal(fechaKey: string): { start: number; end: number } {
  const [y, m, d] = fechaKey.split('-').map(Number)
  const start = new Date(y!, m! - 1, d!).getTime()
  return { start, end: start + 86400000 }
}

export function posRangoFechas(fechaDesde: string, fechaHasta: string): { start: number; end: number } {
  const desde = posRangoDiaLocal(fechaDesde).start
  const hasta = posRangoDiaLocal(fechaHasta).end
  return { start: desde, end: hasta }
}

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function posAddDaysToKey(key: string, days: number): string {
  const d = dateFromKey(key)
  d.setDate(d.getDate() + days)
  return posFechaKeyLocal(d)
}

/** Lunes de la semana calendario del día dado (YYYY-MM-DD). */
export function posInicioSemanaKey(hoy: string): string {
  const d = dateFromKey(hoy)
  const dow = d.getDay()
  const diff = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - diff)
  return posFechaKeyLocal(d)
}

/** Inicio de la quincena calendario (1–15 o 16–fin). */
export function posInicioQuincenaKey(hoy: string): string {
  const [y, m, day] = hoy.split('-').map(Number)
  const startDay = day! <= 15 ? 1 : 16
  return `${y}-${String(m).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
}

export type PosRangoPreset = 'hoy' | 'ayer' | 'semana' | 'quincena' | 'personalizado'

export const POS_RANGO_PRESET_LABELS: Record<PosRangoPreset, string> = {
  hoy: 'Hoy',
  ayer: 'Ayer',
  semana: 'Esta semana',
  quincena: 'Esta quincena',
  personalizado: 'Rango',
}

export function posRangoPresetToRange(
  preset: PosRangoPreset,
  custom?: { desde: string; hasta: string },
  refDate = new Date(),
): { desde: string; hasta: string } {
  const hoy = posFechaKeyLocal(refDate)
  if (preset === 'hoy') return { desde: hoy, hasta: hoy }
  if (preset === 'ayer') {
    const ayer = posAddDaysToKey(hoy, -1)
    return { desde: ayer, hasta: ayer }
  }
  if (preset === 'semana') {
    return { desde: posInicioSemanaKey(hoy), hasta: hoy }
  }
  if (preset === 'quincena') {
    return { desde: posInicioQuincenaKey(hoy), hasta: hoy }
  }
  if (preset === 'personalizado' && custom?.desde && custom?.hasta) {
    const desde = custom.desde <= custom.hasta ? custom.desde : custom.hasta
    let hasta = custom.desde <= custom.hasta ? custom.hasta : custom.desde
    if (hasta > hoy) hasta = hoy
    return { desde, hasta }
  }
  return { desde: hoy, hasta: hoy }
}

export function posFormatHora(ms: number): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))
}

export function posFormatFechaCorta(ms: number): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
  }).format(new Date(ms))
}

/** Duración legible: «2h 35m». */
export function posFormatDuracion(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export function posTurnoDuracionMs(turno: { inicioAt: number; finAt?: number; estado: string }, now = Date.now()) {
  const fin = turno.finAt ?? (turno.estado === 'abierto' ? now : turno.inicioAt)
  return Math.max(0, fin - turno.inicioAt)
}

/** Etiqueta corta para un rango YYYY-MM-DD — YYYY-MM-DD. */
export function posFormatRangoLabel(desde: string, hasta: string): string {
  const fmt = (key: string) =>
    posFormatFechaCorta(new Date(`${key}T12:00:00`).getTime())
  if (desde === hasta) return fmt(desde)
  return `${fmt(desde)} – ${fmt(hasta)}`
}

/** Cantidad de días inclusivos en un rango local. */
export function posDiasEnRango(desde: string, hasta: string): number {
  const { start } = posRangoDiaLocal(desde)
  const { end } = posRangoDiaLocal(hasta)
  return Math.max(1, Math.round((end - start) / 86400000))
}

export function defaultComparativoRanges(): {
  desdeA: string
  hastaA: string
  desdeB: string
  hastaB: string
} {
  const hoy = new Date()
  const hastaB = posFechaKeyLocal(hoy)
  const desdeBDate = new Date(hoy)
  desdeBDate.setDate(desdeBDate.getDate() - 6)
  const desdeB = posFechaKeyLocal(desdeBDate)

  const hastaADate = new Date(desdeBDate)
  hastaADate.setDate(hastaADate.getDate() - 1)
  const hastaA = posFechaKeyLocal(hastaADate)
  const desdeADate = new Date(hastaADate)
  desdeADate.setDate(desdeADate.getDate() - 6)
  const desdeA = posFechaKeyLocal(desdeADate)

  return { desdeA, hastaA, desdeB, hastaB }
}

export type ComparativoPreset = '7d' | '30d' | 'mes'

export function comparativoPresetToRanges(preset: ComparativoPreset): {
  desdeA: string
  hastaA: string
  desdeB: string
  hastaB: string
} {
  const hoy = new Date()
  const hastaB = posFechaKeyLocal(hoy)

  if (preset === 'mes') {
    const firstB = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const lastA = new Date(firstB)
    lastA.setDate(lastA.getDate() - 1)
    const firstA = new Date(lastA.getFullYear(), lastA.getMonth(), 1)
    return {
      desdeA: posFechaKeyLocal(firstA),
      hastaA: posFechaKeyLocal(lastA),
      desdeB: posFechaKeyLocal(firstB),
      hastaB,
    }
  }

  const dias = preset === '30d' ? 30 : 7
  const desdeBDate = new Date(hoy)
  desdeBDate.setDate(desdeBDate.getDate() - (dias - 1))
  const desdeB = posFechaKeyLocal(desdeBDate)

  const hastaADate = new Date(desdeBDate)
  hastaADate.setDate(hastaADate.getDate() - 1)
  const hastaA = posFechaKeyLocal(hastaADate)
  const desdeADate = new Date(hastaADate)
  desdeADate.setDate(desdeADate.getDate() - (dias - 1))
  const desdeA = posFechaKeyLocal(desdeADate)

  return { desdeA, hastaA, desdeB, hastaB }
}
