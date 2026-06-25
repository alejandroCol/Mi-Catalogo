export function isPaidBillingPlan(plan?: string | null): boolean {
  return plan === 'expert' || plan === 'master'
}

export function isMasterBillingPlan(plan?: string | null): boolean {
  return plan === 'master'
}

export function isFreeBillingPlan(plan?: string | null): boolean {
  return !isPaidBillingPlan(plan)
}
