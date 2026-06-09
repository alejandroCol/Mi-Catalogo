import type { McTenant } from '@/types/mc'

export function formatTenantShortDate(ms: number) {
  return new Date(ms).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function tenantPlanLabel(plan: McTenant['subscriptionPlan'] | undefined): string {
  switch (plan) {
    case 'trial':
      return 'Prueba'
    case 'monthly':
      return 'Mensual'
    case 'yearly':
      return 'Anual'
    case 'custom':
      return 'Personalizado'
    default:
      return 'Sin etiqueta'
  }
}
