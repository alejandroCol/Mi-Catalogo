import { hasLiveFeatureAccess } from '@/lib/billingAccess'
import type { McTenant } from '@/types/mc'

/** Addi solo para Master con membresía activa (misma barra que Live). */
export function hasAddiFeatureAccess(tenant: McTenant | null | undefined): boolean {
  return hasLiveFeatureAccess(tenant)
}

/** Credenciales pegadas + toggle habilitado → ofrecer Addi en checkout. */
export function isAddiReadyForCheckout(tenant: McTenant | null | undefined): boolean {
  if (!hasAddiFeatureAccess(tenant)) return false
  if (tenant?.addiPaymentsEnabled !== true) return false
  const slug = tenant.addiAllySlug?.trim()
  return Boolean(slug)
}

export const ADDI_CHECKOUT_MIN_COP = 50_000
