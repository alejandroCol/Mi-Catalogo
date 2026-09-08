import type { McMonthPromo, McPlatformSettings } from '@/types/mc'

export const MONTH_PROMO_LIMITS = {
  label: 40,
  hint: 160,
  discountMin: 5,
  discountMax: 80,
  prepaidMin: 2,
  prepaidMax: 12,
} as const

export const MONTH_PROMO_DEFAULTS = {
  label: 'HOT SALE',
  discountPercent: 50,
  prepaidMonths: 3,
} as const

export const MONTH_PROMO_PREPAID_OPTIONS = [2, 3, 4, 6] as const

const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

export type MonthPromoPricing = {
  monthlyCop: number
  prepaidMonths: number
  discountPercent: number
  baseTotalCop: number
  finalTotalCop: number
  savingsCop: number
}

function clampInt(n: unknown, fallback: number, min: number, max: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function trimTo(value: string | undefined, max: number): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Mes actual en Bogotá (`YYYY-MM`). */
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

export function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function formatMonthKeyLabel(monthKey: string): string {
  if (!isMonthKey(monthKey)) return monthKey
  const [year, month] = monthKey.split('-')
  const name = MONTH_NAMES_ES[Number(month) - 1]
  if (!name || !year) return monthKey
  return `${name} ${year}`
}

/** Mes para la banda de esquina, ej. «Septiembre». */
export function formatMonthPromoSash(monthKey: string): string {
  if (!isMonthKey(monthKey)) return 'Promo'
  const [, month] = monthKey.split('-')
  const name = MONTH_NAMES_ES[Number(month) - 1]
  if (!name) return 'Promo'
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
}

export function monthKeyToParts(monthKey: string): { year: number; month: number } | null {
  if (!isMonthKey(monthKey)) return null
  const [year, month] = monthKey.split('-')
  return { year: Number(year), month: Number(month) }
}

export function buildMonthKey(year: number, month: number): string {
  const m = Math.max(1, Math.min(12, Math.round(month)))
  return `${Math.round(year)}-${String(m).padStart(2, '0')}`
}

/** Próximos 14 meses (incluye el actual) para el selector de súper admin. */
export function upcomingMonthKeys(now = Date.now(), count = 14): string[] {
  const current = monthKeyToParts(currentMonthKey(now))
  if (!current) return [currentMonthKey(now)]
  const keys: string[] = []
  for (let i = 0; i < count; i += 1) {
    const d = new Date(current.year, current.month - 1 + i, 1)
    keys.push(buildMonthKey(d.getFullYear(), d.getMonth() + 1))
  }
  return keys
}

export function sanitizeMonthPromo(raw: {
  enabled: boolean
  monthKey?: string
  label?: string
  discountPercent?: number
  prepaidMonths?: number
  hint?: string
}): McMonthPromo | null {
  if (!raw.enabled) return null
  const monthKey = isMonthKey(raw.monthKey) ? raw.monthKey : currentMonthKey()
  const label = trimTo(raw.label, MONTH_PROMO_LIMITS.label) || MONTH_PROMO_DEFAULTS.label
  const discountPercent = clampInt(
    raw.discountPercent,
    MONTH_PROMO_DEFAULTS.discountPercent,
    MONTH_PROMO_LIMITS.discountMin,
    MONTH_PROMO_LIMITS.discountMax,
  )
  const prepaidMonths = clampInt(
    raw.prepaidMonths,
    MONTH_PROMO_DEFAULTS.prepaidMonths,
    MONTH_PROMO_LIMITS.prepaidMin,
    MONTH_PROMO_LIMITS.prepaidMax,
  )
  const hint = trimTo(raw.hint, MONTH_PROMO_LIMITS.hint)
  return {
    enabled: true,
    monthKey,
    label,
    discountPercent,
    prepaidMonths,
    ...(hint ? { hint } : {}),
    updatedAt: Date.now(),
  }
}

export function isMonthPromoLive(
  promo: McMonthPromo | null | undefined,
): promo is McMonthPromo {
  return Boolean(promo?.enabled && isMonthKey(promo.monthKey))
}

export function resolveMonthPromo(
  settings: McPlatformSettings | null | undefined,
): McMonthPromo | null {
  const raw = settings?.monthPromo
  if (!raw) return null
  const sanitized = sanitizeMonthPromo({
    enabled: raw.enabled === true,
    monthKey: raw.monthKey,
    label: raw.label,
    discountPercent: raw.discountPercent,
    prepaidMonths: raw.prepaidMonths,
    hint: raw.hint,
  })
  return isMonthPromoLive(sanitized) ? sanitized : null
}

export function computeMonthPromoPricing(
  monthlyCop: number,
  promo: Pick<McMonthPromo, 'discountPercent' | 'prepaidMonths'>,
): MonthPromoPricing {
  const monthly = Math.max(0, Math.round(monthlyCop))
  const prepaidMonths = clampInt(
    promo.prepaidMonths,
    MONTH_PROMO_DEFAULTS.prepaidMonths,
    MONTH_PROMO_LIMITS.prepaidMin,
    MONTH_PROMO_LIMITS.prepaidMax,
  )
  const discountPercent = clampInt(
    promo.discountPercent,
    MONTH_PROMO_DEFAULTS.discountPercent,
    MONTH_PROMO_LIMITS.discountMin,
    MONTH_PROMO_LIMITS.discountMax,
  )
  const baseTotalCop = monthly * prepaidMonths
  const finalTotalCop = Math.max(0, Math.round((baseTotalCop * (100 - discountPercent)) / 100))
  return {
    monthlyCop: monthly,
    prepaidMonths,
    discountPercent,
    baseTotalCop,
    finalTotalCop,
    savingsCop: Math.max(0, baseTotalCop - finalTotalCop),
  }
}

export function monthPromoHint(
  promo: Pick<McMonthPromo, 'prepaidMonths' | 'hint'>,
  monthlyCop: number,
  formatPrice: (n: number) => string,
): string {
  const custom = trimTo(promo.hint, MONTH_PROMO_LIMITS.hint)
  if (custom) return custom
  const months = promo.prepaidMonths
  const unit = months === 1 ? 'mes' : 'meses'
  return `Pagás ${months} ${unit} ahora. Después de que se terminen los ${months} ${unit} se cobra el precio mensual normal (${formatPrice(monthlyCop)}/mes).`
}
