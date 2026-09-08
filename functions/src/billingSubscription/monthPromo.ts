export const MONTH_PROMO_LIMITS = {
  discountMin: 5,
  discountMax: 80,
  prepaidMin: 2,
  prepaidMax: 12,
} as const

export type MonthPromoSettings = {
  enabled?: boolean
  monthKey?: string
  discountPercent?: number
  prepaidMonths?: number
}

function clampInt(n: unknown, fallback: number, min: number, max: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

export function currentMonthKey(now = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(now))
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function resolveLiveMonthPromo(
  settings: { monthPromo?: MonthPromoSettings } | null | undefined,
): { discountPercent: number; prepaidMonths: number } | null {
  const raw = settings?.monthPromo
  if (raw?.enabled !== true) return null
  return {
    discountPercent: clampInt(raw.discountPercent, 50, MONTH_PROMO_LIMITS.discountMin, MONTH_PROMO_LIMITS.discountMax),
    prepaidMonths: clampInt(raw.prepaidMonths, 3, MONTH_PROMO_LIMITS.prepaidMin, MONTH_PROMO_LIMITS.prepaidMax),
  }
}

export function computeMonthPromoTotals(
  monthlyCop: number,
  promo: { discountPercent: number; prepaidMonths: number },
): { baseTotalCop: number; finalTotalCop: number; prepaidMonths: number; renewalAmountCop: number } {
  const monthly = Math.max(0, Math.round(monthlyCop))
  const baseTotalCop = monthly * promo.prepaidMonths
  const finalTotalCop = Math.max(0, Math.round((baseTotalCop * (100 - promo.discountPercent)) / 100))
  return {
    baseTotalCop,
    finalTotalCop,
    prepaidMonths: promo.prepaidMonths,
    renewalAmountCop: monthly,
  }
}
