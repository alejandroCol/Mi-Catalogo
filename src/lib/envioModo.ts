import type { McTenant } from '@/types/mc'

export type EnvioModo = 'automatico' | 'manual'

export function explicitEnvioModo(
  tenant: Pick<McTenant, 'envioCotizarAutomatico' | 'envioPorCiudad'> | null | undefined,
): EnvioModo | null {
  if (!tenant) return null
  if (tenant.envioCotizarAutomatico === true) return 'automatico'
  if (tenant.envioCotizarAutomatico === false) return 'manual'
  if ((tenant.envioPorCiudad?.length ?? 0) > 0) return 'manual'
  return null
}
