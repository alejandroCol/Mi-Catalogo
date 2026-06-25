import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import type { McTenant } from '@/types/mc'

/** POS requiere Expert solo al confirmar una venta (no al configurar sedes/inventario). */
export function canCompletePosSale(tenant: McTenant | null | undefined): boolean {
  return hasExpertFeatureAccess(tenant)
}
