import { isEnvioSinEnvioActive } from '@/lib/envioSinEnvio'
import type { McTenant } from '@/types/mc'

export type EnvioModo = 'automatico' | 'manual' | 'sin_envio'

export type EnvioModoTenantPick = Pick<
  McTenant,
  'envioCotizarAutomatico' | 'envioPorCiudad' | 'envioSinEnvio' | 'checkoutVentasModo'
>

export function explicitEnvioModo(tenant: EnvioModoTenantPick | null | undefined): EnvioModo | null {
  if (!tenant) return null
  if (isEnvioSinEnvioActive(tenant)) return 'sin_envio'
  if (tenant.envioCotizarAutomatico === true) return 'automatico'
  if (tenant.envioCotizarAutomatico === false) return 'manual'
  if ((tenant.envioPorCiudad?.length ?? 0) > 0) return 'manual'
  return null
}
