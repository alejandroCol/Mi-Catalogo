import { billingPlanOf } from '@/lib/catalogTheme'
import { isPaidBillingPlan } from '@/lib/billingPlan'
import { isTenantMembershipActive } from '@/lib/subscription'
import type { TenantOverviewRow } from '@/superadmin/fetchTenantsOverview'

export type TenantPlanListFilter = 'all' | 'expert' | 'sin_expert'

export function tenantHasExpertPlan(row: TenantOverviewRow): boolean {
  return billingPlanOf(row.tenant) === 'expert'
}

export function tenantHasActiveExpertPlan(row: TenantOverviewRow): boolean {
  return tenantHasExpertPlan(row) && isTenantMembershipActive(row.tenant)
}

export function tenantIsFreePlan(row: TenantOverviewRow): boolean {
  return !isPaidBillingPlan(billingPlanOf(row.tenant))
}

export function filterTenantsByPlan(
  rows: TenantOverviewRow[],
  planFilter: TenantPlanListFilter,
): TenantOverviewRow[] {
  if (planFilter === 'expert') {
    return rows.filter(tenantHasExpertPlan)
  }
  if (planFilter === 'sin_expert') {
    return rows.filter(tenantIsFreePlan)
  }
  return rows
}

export function countTenantsByPlan(rows: TenantOverviewRow[]) {
  let expert = 0
  let sinExpert = 0
  for (const row of rows) {
    if (tenantHasExpertPlan(row)) expert++
    if (tenantIsFreePlan(row)) sinExpert++
  }
  return { expert, sinExpert, all: rows.length }
}
