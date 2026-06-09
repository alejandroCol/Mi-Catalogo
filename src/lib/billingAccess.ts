import { billingPlanOf } from '@/lib/catalogTheme'
import { isSubscriptionActive } from '@/lib/subscription'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export const MC_BILLING_GRACE_DAYS = 7

export const DEFAULT_PLAN_EXPERT_DISPLAY_NAME = 'Expert'

export function planExpertDisplayName(settings: McPlatformSettings | null | undefined): string {
  const n = settings?.planExpertDisplayName?.trim()
  return n && n.length > 0 ? n : DEFAULT_PLAN_EXPERT_DISPLAY_NAME
}

/** Suscripción Expert activa (o gracia): requisito para publicar la tienda. */
export function hasExpertFeatureAccess(tenant: McTenant | null | undefined): boolean {
  if (!tenant || billingPlanOf(tenant) !== 'expert') return false
  if (isSubscriptionActive(tenant.subscriptionEndsAt)) return true
  const grace = tenant.billingGraceUntilMs
  return typeof grace === 'number' && grace > Date.now()
}

/** Cobro vencido pero aún en período de gracia (7 días). */
export function isBillingPastDueInGrace(tenant: McTenant | null | undefined): boolean {
  if (!tenant || tenant.billingSubStatus !== 'past_due') return false
  const grace = tenant.billingGraceUntilMs
  return typeof grace === 'number' && grace > Date.now()
}

/** Debe actualizar método de pago (past_due en gracia o suscripción activa con aviso). */
export function needsBillingPaymentUpdate(tenant: McTenant | null | undefined): boolean {
  return isBillingPastDueInGrace(tenant)
}

export function billingGraceDaysRemaining(tenant: McTenant | null | undefined): number {
  const grace = tenant?.billingGraceUntilMs
  if (typeof grace !== 'number') return 0
  const ms = grace - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

/** Etiqueta elegante del plan actual para el dueño. */
export function ownerPlanEleganceLabel(
  tenant: McTenant | null | undefined,
  settings: McPlatformSettings | null | undefined,
): string {
  if (!tenant) return 'Free'
  if (billingPlanOf(tenant) === 'expert') {
    return planExpertDisplayName(settings)
  }
  return 'Free'
}
