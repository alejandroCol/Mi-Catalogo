import { isSubscriptionEndsAtActive } from './subscriptionMs.js';
import { isTenantMembershipActive } from './tenantMembership.js';
export function isExplicitPublishGrandfathered(tenant) {
    return tenant?.catalogPublishGrandfathered === true;
}
export function isImplicitLegacyStore(tenant) {
    if (!tenant)
        return false;
    if (tenant.catalogPublishGrandfathered === false)
        return false;
    return tenant.catalogPublished === undefined;
}
export function isLegacyGrandfatheredStore(tenant) {
    return isExplicitPublishGrandfathered(tenant) || isImplicitLegacyStore(tenant);
}
export function isCatalogPublishedFlag(tenant) {
    return tenant?.catalogPublished === true;
}
export function hasActiveExpertForPublish(tenant, nowMs = Date.now()) {
    if (!tenant || tenant.billingPlan !== 'expert')
        return false;
    if (isSubscriptionEndsAtActive(tenant.subscriptionEndsAt, nowMs))
        return true;
    if (tenant.billingSubStatus === 'past_due') {
        const grace = tenant.billingGraceUntilMs;
        return typeof grace === 'number' && grace > nowMs;
    }
    return false;
}
export function isCatalogPubliclyAccessible(tenant, nowMs = Date.now()) {
    if (!tenant)
        return false;
    if (isExplicitPublishGrandfathered(tenant))
        return true;
    if (isImplicitLegacyStore(tenant)) {
        return isTenantMembershipActive(tenant, nowMs);
    }
    if (!isCatalogPublishedFlag(tenant))
        return false;
    return hasActiveExpertForPublish(tenant, nowMs);
}
/** Despublica tiendas Expert sin grandfather al vencer suscripción o downgrade. */
export async function mcCatalogUnpublishIfNeeded(db, tenantId, tenant) {
    if (isExplicitPublishGrandfathered(tenant) || isImplicitLegacyStore(tenant))
        return;
    if (!isCatalogPublishedFlag(tenant))
        return;
    if (isCatalogPubliclyAccessible(tenant))
        return;
    await db.doc(`mc_tenants/${tenantId}`).set({
        catalogPublished: false,
        updatedAt: Date.now(),
    }, { merge: true });
}
