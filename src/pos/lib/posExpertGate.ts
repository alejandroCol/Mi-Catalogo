import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import type { McTenant } from '@/types/mc'

export type PosExpertBlockReason = 'needs_expert'
export type PosExpertGateVariant = 'sale' | 'vendor'

/** POS requiere Expert para cobrar en caja y crear vendedores (Free puede configurar sedes/inventario). */
export function posExpertBlockReason(
  tenant: McTenant | null | undefined,
): PosExpertBlockReason | null {
  if (hasExpertFeatureAccess(tenant)) return null
  return 'needs_expert'
}

export function hasPosExpertAccess(tenant: McTenant | null | undefined): boolean {
  return posExpertBlockReason(tenant) === null
}
