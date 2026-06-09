import type { McPlanConfig } from '@/lib/billingPlans'

/** Beneficios del plan Expert mostrados en oferta y checkout. */
export function expertPlanFeatureList(_planConfig: McPlanConfig): string[] {
  return [
    'Publicar tu tienda online para tus clientes',
    'Tu catálogo visible en tu enlace público',
    'Renovación mensual o anual',
  ]
}
