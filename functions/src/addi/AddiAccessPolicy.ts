import { HttpsError } from 'firebase-functions/v2/https'
import { isMasterBillingPlan } from '../billingPlan.js'
import { isSubscriptionEndsAtActive } from '../subscriptionMs.js'

export type AddiTenantAccessSnapshot = {
  billingPlan?: string
  subscriptionEndsAt?: number
  billingGraceUntilMs?: number
  billingSubStatus?: string
  addiPaymentsEnabled?: boolean
  ownerUid?: string
}

function hasMasterMembership(tenant: AddiTenantAccessSnapshot, nowMs = Date.now()): boolean {
  if (!isMasterBillingPlan(tenant.billingPlan)) return false
  if (isSubscriptionEndsAtActive(tenant.subscriptionEndsAt, nowMs)) return true
  const grace = tenant.billingGraceUntilMs
  return typeof grace === 'number' && grace > nowMs
}

/**
 * Política de acceso Addi (OCP: reglas centralizadas, no en handlers UI).
 * Por ahora solo Master con membresía activa (o gracia).
 */
export class AddiAccessPolicy {
  static assertMasterTenant(tenant: AddiTenantAccessSnapshot, opts?: { requireEnabled?: boolean }): void {
    if (!hasMasterMembership(tenant)) {
      throw new HttpsError(
        'failed-precondition',
        'Addi está disponible solo para tiendas con plan Master activo.',
      )
    }
    if (opts?.requireEnabled && tenant.addiPaymentsEnabled !== true) {
      throw new HttpsError('failed-precondition', 'Addi no está habilitado en esta tienda.')
    }
  }

  static canOfferAtCheckout(tenant: AddiTenantAccessSnapshot | null | undefined): boolean {
    if (!tenant) return false
    if (!hasMasterMembership(tenant)) return false
    return tenant.addiPaymentsEnabled === true
  }
}
