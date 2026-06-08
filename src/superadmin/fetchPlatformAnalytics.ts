import type { Firestore } from 'firebase/firestore'
import { fetchAnalyticsDailyDoc } from '@/hooks/useTenantAnalytics'
import { mcAnalyticsDateKeysForPeriod } from '@/lib/mcAnalyticsDates'
import type { McAnalyticsDaily } from '@/types/mc'

export type TenantAnalyticsRow = {
  tenantId: string
  visits7d: number
  visits30d: number
  pageViews30d: number
  checkoutStarts30d: number
}

const TENANT_BATCH_SIZE = 6

function sumMetric(rows: McAnalyticsDaily[], key: keyof McAnalyticsDaily): number {
  return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0)
}

async function fetchTenantAnalyticsWindow(tenantId: string): Promise<TenantAnalyticsRow> {
  const keys30 = mcAnalyticsDateKeysForPeriod(30)
  const keys7 = new Set(mcAnalyticsDateKeysForPeriod(7))
  const rows = await Promise.all(keys30.map((dateKey) => fetchAnalyticsDailyDoc(tenantId, dateKey)))
  const rows7 = rows.filter((row) => keys7.has(row.dateKey))

  return {
    tenantId,
    visits7d: sumMetric(rows7, 'visits'),
    visits30d: sumMetric(rows, 'visits'),
    pageViews30d: sumMetric(rows, 'pageViews'),
    checkoutStarts30d: sumMetric(rows, 'checkoutStarts'),
  }
}

/** Métricas de tráfico por tienda (getDoc por día; evita collectionGroup + `in`). */
export async function fetchPlatformTenantAnalytics(
  _db: Firestore,
  tenantIds: string[],
): Promise<Map<string, TenantAnalyticsRow>> {
  const result = new Map<string, TenantAnalyticsRow>()
  const uniqueIds = [...new Set(tenantIds.filter(Boolean))]

  for (let i = 0; i < uniqueIds.length; i += TENANT_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + TENANT_BATCH_SIZE)
    const rows = await Promise.all(batch.map((tenantId) => fetchTenantAnalyticsWindow(tenantId)))
    for (const row of rows) {
      result.set(row.tenantId, row)
    }
  }

  return result
}

export function sumPlatformAnalytics(rows: Iterable<TenantAnalyticsRow>): {
  visits7d: number
  visits30d: number
  pageViews30d: number
  checkoutStarts30d: number
  storesWithTraffic: number
} {
  let visits7d = 0
  let visits30d = 0
  let pageViews30d = 0
  let checkoutStarts30d = 0
  let storesWithTraffic = 0

  for (const row of rows) {
    visits7d += row.visits7d
    visits30d += row.visits30d
    pageViews30d += row.pageViews30d
    checkoutStarts30d += row.checkoutStarts30d
    if (row.visits30d > 0) storesWithTraffic += 1
  }

  return { visits7d, visits30d, pageViews30d, checkoutStarts30d, storesWithTraffic }
}
