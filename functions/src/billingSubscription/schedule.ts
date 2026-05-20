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
