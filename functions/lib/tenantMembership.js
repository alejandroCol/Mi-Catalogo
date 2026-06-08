export function isFreeBillingPlan(tenant) {
    return tenant?.billingPlan !== 'expert';
}
/** Membresía activa: plan Free sin vencimiento; Expert según subscriptionEndsAt. */
export function isTenantMembershipActive(tenant, nowMs = Date.now()) {
    if (!tenant)
        return false;
    if (isFreeBillingPlan(tenant))
        return true;
    return typeof tenant.subscriptionEndsAt === 'number' && tenant.subscriptionEndsAt > nowMs;
}
