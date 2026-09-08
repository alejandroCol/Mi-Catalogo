import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import type { McTenant } from '@/types/mc'

export type EnvioSinEnvioTenantPick = Pick<McTenant, 'checkoutVentasModo' | 'envioSinEnvio'>

/** “Sin envío” solo aplica cuando el cobro se coordina por WhatsApp. */
export function isEnvioSinEnvioAllowed(
  tenant: Pick<McTenant, 'checkoutVentasModo'> | null | undefined,
): boolean {
  return explicitCheckoutVentasModo(tenant) === 'whatsapp'
}

/** El vendedor activó “Sin envío” y el modo de cobro lo permite. */
export function isEnvioSinEnvioActive(
  tenant: EnvioSinEnvioTenantPick | null | undefined,
): boolean {
  return tenant?.envioSinEnvio === true && isEnvioSinEnvioAllowed(tenant)
}
