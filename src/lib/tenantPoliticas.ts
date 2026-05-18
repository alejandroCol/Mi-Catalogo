import type { McTenant } from '@/types/mc'

export function tenantHasPoliticas(tenant: McTenant | null | undefined): boolean {
  if (!tenant) return false
  const a = (tenant.politicasEnvios ?? '').trim()
  const b = (tenant.politicasPagos ?? '').trim()
  const c = (tenant.politicasCambios ?? '').trim()
  return Boolean(a || b || c)
}
