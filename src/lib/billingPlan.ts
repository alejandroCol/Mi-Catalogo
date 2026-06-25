import type { McBillingPlan } from '@/types/mc'

/** Plan de pago con funciones Expert (catálogo premium, publicar, etc.). */
export function isPaidBillingPlan(plan?: McBillingPlan | string | null): boolean {
  return plan === 'expert' || plan === 'master'
}

export function isMasterBillingPlan(plan?: McBillingPlan | string | null): boolean {
  return plan === 'master'
}

export function isExpertBillingPlan(plan?: McBillingPlan | string | null): boolean {
  return plan === 'expert'
}

export function isFreeBillingPlan(plan?: McBillingPlan | string | null): boolean {
  return !isPaidBillingPlan(plan)
}
