import type { Firestore } from 'firebase-admin/firestore'
import { isSubscriptionEndsAtActive } from './subscriptionMs.js'
import { isTenantMembershipActive, type TenantMembershipSlice } from './tenantMembership.js'

export type CatalogPublishSlice = TenantMembershipSlice & {
  catalogPublished?: boolean
  catalogPublishedAt?: number
  catalogPublishGrandfathered?: boolean
  billingSubStatus?: string
  billingGraceUntilMs?: number
}

export function isExplicitPublishGrandfathered(
  tenant: CatalogPublishSlice | null | undefined,
): boolean {
  return tenant?.catalogPublishGrandfathered === true
}

export function isImplicitLegacyStore(tenant: CatalogPublishSlice | null | undefined): boolean {
  if (!tenant) return false
  if (tenant.catalogPublishGrandfathered === false) return false
  return tenant.catalogPublished === undefined
}

export function isLegacyGrandfatheredStore(tenant: CatalogPublishSlice | null | undefined): boolean {
  return isExplicitPublishGrandfathered(tenant) || isImplicitLegacyStore(tenant)
}

export function isCatalogPublishedFlag(tenant: CatalogPublishSlice | null | undefined): boolean {
  return tenant?.catalogPublished === true
}

export function hasActiveExpertForPublish(
  tenant: CatalogPublishSlice | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!tenant || tenant.billingPlan !== 'expert') return false
  if (isSubscriptionEndsAtActive(tenant.subscriptionEndsAt, nowMs)) return true
  if (tenant.billingSubStatus === 'past_due') {
    const grace = tenant.billingGraceUntilMs
    return typeof grace === 'number' && grace > nowMs
  }
  return false
}

export function isCatalogPubliclyAccessible(
  tenant: CatalogPublishSlice | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!tenant) return false
  if (isExplicitPublishGrandfathered(tenant)) return true
  if (isImplicitLegacyStore(tenant)) {
    return isTenantMembershipActive(tenant, nowMs)
  }
  if (!isCatalogPublishedFlag(tenant)) return false
  return hasActiveExpertForPublish(tenant, nowMs)
}

/** Despublica tiendas Expert sin grandfather al vencer suscripción o downgrade. */
export async function mcCatalogUnpublishIfNeeded(
  db: Firestore,
  tenantId: string,
  tenant: CatalogPublishSlice,
): Promise<void> {
  if (isExplicitPublishGrandfathered(tenant) || isImplicitLegacyStore(tenant)) return
  if (!isCatalogPublishedFlag(tenant)) return
  if (isCatalogPubliclyAccessible(tenant)) return
  await db.doc(`mc_tenants/${tenantId}`).set(
    {
      catalogPublished: false,
      updatedAt: Date.now(),
    },
    { merge: true },
  )
}
