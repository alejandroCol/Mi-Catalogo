import { isPaidBillingPlan } from '@/lib/billingPlan'
import { catalogoVendedorGate, isCatalogoVendedorListo } from '@/lib/checkoutVentasModo'
import { isTenantMembershipActive, subscriptionEndsAtMs } from '@/lib/subscription'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export type CatalogPublishSlice = Pick<
  McTenant,
  | 'catalogPublished'
  | 'catalogPublishedAt'
  | 'catalogPublishGrandfathered'
  | 'billingPlan'
  | 'subscriptionEndsAt'
  | 'billingSubStatus'
  | 'billingGraceUntilMs'
>

/** Backfill explícito: tiendas existentes que permanecen públicas sin Expert. */
export function isExplicitPublishGrandfathered(
  tenant: CatalogPublishSlice | null | undefined,
): boolean {
  return tenant?.catalogPublishGrandfathered === true
}

/** Tiendas creadas antes del modelo publish: sin `catalogPublished` explícito. */
export function isImplicitLegacyStore(
  tenant: CatalogPublishSlice | null | undefined,
): boolean {
  if (!tenant) return false
  if (tenant.catalogPublishGrandfathered === false) return false
  return tenant.catalogPublished === undefined
}

/** Compat UI: cualquier forma de grandfather. */
export function isLegacyGrandfatheredStore(
  tenant: CatalogPublishSlice | null | undefined,
): boolean {
  return isExplicitPublishGrandfathered(tenant) || isImplicitLegacyStore(tenant)
}

export function isCatalogPublishedFlag(tenant: CatalogPublishSlice | null | undefined): boolean {
  return tenant?.catalogPublished === true
}

/** Expert activo (suscripción o gracia) — requisito para mantener publicada una tienda nueva. */
export function hasActiveExpertForPublish(
  tenant: CatalogPublishSlice | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!tenant || !isPaidBillingPlan(tenant.billingPlan)) return false
  const ends = subscriptionEndsAtMs(tenant.subscriptionEndsAt)
  if (ends !== null && ends > nowMs) return true
  if (tenant.billingSubStatus === 'past_due') {
    const grace = tenant.billingGraceUntilMs
    return typeof grace === 'number' && grace > nowMs
  }
  return false
}

/** ¿El catálogo es accesible para clientes (URL pública)? */
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

export type CatalogPublishBlockReason =
  | 'already_published'
  | 'needs_expert'
  | 'needs_checkout'
  | 'needs_envio'

export function catalogPublishBlockReason(
  tenant: McTenant | null | undefined,
  platformSettings: McPlatformSettings | null | undefined,
): CatalogPublishBlockReason | null {
  if (!tenant) return 'needs_expert'
  if (isCatalogPubliclyAccessible(tenant) && isCatalogPublishedFlag(tenant)) return 'already_published'
  if (!hasActiveExpertForPublish(tenant)) return 'needs_expert'
  if (!isCatalogoVendedorListo(tenant, platformSettings)) {
    const gate = catalogoVendedorGate(tenant, platformSettings)
    return gate === 'envio' ? 'needs_envio' : 'needs_checkout'
  }
  return null
}

/** Dueño puede ejecutar «Publicar tienda». */
export function canOwnerPublishCatalog(
  tenant: McTenant | null | undefined,
  platformSettings: McPlatformSettings | null | undefined,
): boolean {
  return catalogPublishBlockReason(tenant, platformSettings) === null
}

export function catalogPublishStatusLabel(tenant: McTenant | null | undefined): string {
  if (!tenant) return 'Borrador'
  if (isCatalogPubliclyAccessible(tenant)) return 'Publicada'
  if (isCatalogPublishedFlag(tenant)) return 'Pausada'
  return 'Borrador'
}

export function catalogPublishStatusTone(
  tenant: McTenant | null | undefined,
): 'published' | 'paused' | 'draft' {
  if (!tenant) return 'draft'
  if (isCatalogPubliclyAccessible(tenant)) return 'published'
  if (isCatalogPublishedFlag(tenant)) return 'paused'
  return 'draft'
}
