import type { McPlanConfig } from '@/lib/billingPlans'

/** Beneficios del plan Expert mostrados en oferta y checkout. */
export function expertPlanFeatureList(planConfig: McPlanConfig): string[] {
  return [
    'Plantillas y colores del catálogo',
    'Logo de tienda',
    'Carga masiva de fotos',
    'Recuperación de carritos abandonados',
    `Hasta ${planConfig.expertMaxProductos} productos`,
  ]
}
