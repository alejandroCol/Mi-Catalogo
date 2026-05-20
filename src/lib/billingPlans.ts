import { billingPlanOf } from '@/lib/catalogTheme'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export const DEFAULT_PLAN_FREE_MAX_PRODUCTOS = 20
export const DEFAULT_PLAN_EXPERT_MAX_PRODUCTOS = 500
export const DEFAULT_PLAN_EXPERT_PRECIO_MENSUAL_COP = 29_900
export const DEFAULT_PLAN_EXPERT_PRECIO_ANUAL_COP = 299_000

export interface McPlanConfig {
  freeMaxProductos: number
  expertMaxProductos: number
  expertPrecioMensualCop: number
  expertPrecioAnualCop: number
}

function clampInt(n: unknown, fallback: number, min: number, max: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

/** Resuelve la configuración de planes desde `mc_platform/settings` con defaults seguros. */
export function resolvePlanConfig(settings: McPlatformSettings | null | undefined): McPlanConfig {
  return {
    freeMaxProductos: clampInt(
      settings?.planFreeMaxProductos,
      DEFAULT_PLAN_FREE_MAX_PRODUCTOS,
      1,
      10_000,
    ),
    expertMaxProductos: clampInt(
      settings?.planExpertMaxProductos,
      DEFAULT_PLAN_EXPERT_MAX_PRODUCTOS,
      1,
      100_000,
    ),
    expertPrecioMensualCop: clampInt(
      settings?.planExpertPrecioMensualCop,
      DEFAULT_PLAN_EXPERT_PRECIO_MENSUAL_COP,
      0,
      999_999_999,
    ),
    expertPrecioAnualCop: clampInt(
      settings?.planExpertPrecioAnualCop,
      DEFAULT_PLAN_EXPERT_PRECIO_ANUAL_COP,
      0,
      999_999_999,
    ),
  }
}

export function maxProductosForTenant(
  tenant: Pick<McTenant, 'billingPlan'>,
  config: McPlanConfig,
): number {
  return billingPlanOf(tenant as McTenant) === 'expert'
    ? config.expertMaxProductos
    : config.freeMaxProductos
}

export function canAddProductos(
  tenant: Pick<McTenant, 'billingPlan'>,
  config: McPlanConfig,
  currentCount: number,
  addCount = 1,
): boolean {
  if (addCount <= 0) return true
  return currentCount + addCount <= maxProductosForTenant(tenant, config)
}

export function productLimitMessage(
  tenant: Pick<McTenant, 'billingPlan'>,
  config: McPlanConfig,
  currentCount: number,
): string | null {
  const max = maxProductosForTenant(tenant, config)
  if (currentCount < max) return null
  if (billingPlanOf(tenant as McTenant) === 'free') {
    return `Alcanzaste el límite de ${max} productos del plan Free. Pasá a Expert para ampliar tu inventario.`
  }
  return `Alcanzaste el límite de ${max} productos de tu plan.`
}
