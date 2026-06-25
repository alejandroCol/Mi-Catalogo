import { isPaidBillingPlan } from './billingPlan.js';
import { isSubscriptionEndsAtActive } from './subscriptionMs.js';
export function isFreeBillingPlan(tenant) {
    return !isPaidBillingPlan(tenant?.billingPlan);
}
/** Membresía activa: plan Free sin vencimiento; Expert según subscriptionEndsAt. */
export function isTenantMembershipActive(tenant, nowMs = Date.now()) {
    if (!tenant)
        return false;
    if (isFreeBillingPlan(tenant))
        return true;
    return isSubscriptionEndsAtActive(tenant.subscriptionEndsAt, nowMs);
}
