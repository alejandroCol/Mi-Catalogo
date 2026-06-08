import type { McBillingPlan } from '@/types/mc'

/** Duración de prueba manual (súper admin / Expert). */
export const MC_TRIAL_DAYS = 7

export type TenantMembershipSlice = {
  billingPlan?: McBillingPlan
  subscriptionEndsAt?: number
}

export function isFreeBillingPlan(tenant: TenantMembershipSlice | null | undefined): boolean {
  return tenant?.billingPlan !== 'expert'
}

/** Membresía activa: plan Free sin vencimiento; Expert según subscriptionEndsAt. */
export function isTenantMembershipActive(
  tenant: TenantMembershipSlice | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!tenant) return false
  if (isFreeBillingPlan(tenant)) return true
  return typeof tenant.subscriptionEndsAt === 'number' && tenant.subscriptionEndsAt > nowMs
}

export function trialEndMs(): number {
  return Date.now() + MC_TRIAL_DAYS * 24 * 60 * 60 * 1000
}

/** Vencimiento Expert (ms). Para Free no aplica. */
export function isSubscriptionActive(subscriptionEndsAt: number | undefined, nowMs = Date.now()): boolean {
  return typeof subscriptionEndsAt === 'number' && subscriptionEndsAt > nowMs
}

export function membershipExpiryLabel(
  tenant: TenantMembershipSlice | null | undefined,
  formatDate: (ms: number) => string = (ms) => new Date(ms).toLocaleDateString('es-CO'),
): string {
  if (!tenant || isFreeBillingPlan(tenant)) return 'Sin vencimiento'
  const ends = tenant.subscriptionEndsAt
  if (typeof ends !== 'number') return 'Sin fecha'
  return formatDate(ends)
}

export function extendSubscription(currentEndsAt: number, addMs: number): number {
  const base = Math.max(currentEndsAt, Date.now())
  return base + addMs
}

/** Fija el vencimiento como ahora + duración (alta o reset de plan desde hoy). */
export function setSubscriptionFromNow(addMs: number): number {
  return Date.now() + addMs
}

export const MS_DAY = 24 * 60 * 60 * 1000
/** Igual al trial de registro (ver MC_TRIAL_DAYS). */
export const MS_TRIAL = MC_TRIAL_DAYS * MS_DAY
export const MS_MONTH = 30 * 24 * 60 * 60 * 1000
export const MS_YEAR = 365 * 24 * 60 * 60 * 1000
