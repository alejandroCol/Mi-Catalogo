import { Timestamp } from 'firebase/firestore'
import type { McBillingPlan } from '@/types/mc'

/** Duración de prueba manual (súper admin / Expert). */
export const MC_TRIAL_DAYS = 7

export type TenantMembershipSlice = {
  billingPlan?: McBillingPlan
  subscriptionEndsAt?: unknown
}

/** Normaliza subscriptionEndsAt desde Firestore (number o Timestamp). */
export function subscriptionEndsAtMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value instanceof Timestamp) return value.toMillis()
  return null
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
  const ends = subscriptionEndsAtMs(tenant.subscriptionEndsAt)
  return ends !== null && ends > nowMs
}

export function trialEndMs(): number {
  return Date.now() + MC_TRIAL_DAYS * 24 * 60 * 60 * 1000
}

/** Vencimiento Expert (ms). Para Free no aplica. */
export function isSubscriptionActive(subscriptionEndsAt: unknown, nowMs = Date.now()): boolean {
  const ends = subscriptionEndsAtMs(subscriptionEndsAt)
  return ends !== null && ends > nowMs
}

export function membershipExpiryLabel(
  tenant: TenantMembershipSlice | null | undefined,
  formatDate: (ms: number) => string = (ms) => new Date(ms).toLocaleDateString('es-CO'),
): string {
  if (!tenant || isFreeBillingPlan(tenant)) return 'Sin vencimiento'
  const ends = subscriptionEndsAtMs(tenant.subscriptionEndsAt)
  if (ends === null) return 'Sin fecha'
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
export const MS_QUARTER = 90 * MS_DAY
export const MS_YEAR = 365 * 24 * 60 * 60 * 1000
