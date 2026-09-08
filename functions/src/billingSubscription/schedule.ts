/** Periodos de facturación (calendario local, alineado a G-PRO subscription_v2). */

function addCalendarMonthsLocal(anchorMs: number, months: number): number {
  const d = new Date(anchorMs)
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() !== day) {
    d.setDate(0)
  }
  return d.getTime()
}

function addCalendarYearsLocal(anchorMs: number, years: number): number {
  const d = new Date(anchorMs)
  d.setFullYear(d.getFullYear() + years)
  return d.getTime()
}

export type McBillingPeriod = 'monthly' | 'yearly'

export function computeFirstPeriodEndMs(anchorMs: number, billing: McBillingPeriod): number {
  return billing === 'yearly'
    ? addCalendarYearsLocal(anchorMs, 1)
    : addCalendarMonthsLocal(anchorMs, 1)
}

export function computeFreeMonthsEndMs(anchorMs: number, freeMonths: number): number {
  const months = Math.min(3, Math.max(1, Math.round(freeMonths)))
  return addCalendarMonthsLocal(anchorMs, months)
}

/** Paquete prepago de la promo del mes (2–12 meses). */
export function computePrepaidMonthsEndMs(anchorMs: number, prepaidMonths: number): number {
  const months = Math.min(12, Math.max(2, Math.round(prepaidMonths)))
  return addCalendarMonthsLocal(anchorMs, months)
}

export function advancePeriodEndMs(currentPeriodEndMs: number, billing: McBillingPeriod): number {
  return billing === 'yearly'
    ? addCalendarYearsLocal(currentPeriodEndMs, 1)
    : addCalendarMonthsLocal(currentPeriodEndMs, 1)
}

/** Débito automático: por defecto 0 días antes (tarjeta). */
export function nextDebitDueFromPeriodEnd(periodEndMs: number, leadDays = 0): number {
  const d = Math.max(0, Math.min(60, Math.round(leadDays)))
  return periodEndMs - d * 86_400_000
}

export function idempotencyKeyForBillingDebit(
  tenantId: string,
  periodEndMs: number,
): string {
  return `mcb-${tenantId.slice(0, 12)}-${periodEndMs}`.slice(0, 64)
}

/** Clave estable para el primer cobro de activación (evita débitos duplicados por reintentos). */
export function idempotencyKeyForActivation(
  tenantId: string,
  period: McBillingPeriod | 'month_promo',
): string {
  return `mcb-${tenantId.slice(0, 12)}-init-${period}`.slice(0, 64)
}
