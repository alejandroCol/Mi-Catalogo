export type TenantMembershipSlice = {
  billingPlan?: string
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
