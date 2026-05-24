import { collectionGroup, getDocs, query, where } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { mcAnalyticsDateKeysForPeriod } from '@/lib/mcAnalyticsDates'
import type { McAnalyticsDaily } from '@/types/mc'

export type TenantAnalyticsRow = {
  tenantId: string
  visits7d: number
  visits30d: number
  pageViews30d: number
  checkoutStarts30d: number
}

function tenantIdFromAnalyticsPath(path: string): string | null {
  const parts = path.split('/')
  const idx = parts.indexOf('mc_tenants')
  if (idx === -1 || !parts[idx + 1]) return null
  return parts[idx + 1]!
}

function sumMetric(rows: McAnalyticsDaily[], key: keyof McAnalyticsDaily): number {
  return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0)
}

async function fetchDailyByDateKeys(db: Firestore, dateKeys: string[]): Promise<Map<string, McAnalyticsDaily[]>> {
  const byTenant = new Map<string, McAnalyticsDaily[]>()
  if (dateKeys.length === 0) return byTenant

  const chunks: string[][] = []
  for (let i = 0; i < dateKeys.length; i += 10) {
    chunks.push(dateKeys.slice(i, i + 10))
  }

  const snaps = await Promise.all(
    chunks.map((chunk) => getDocs(query(collectionGroup(db, 'analytics_daily'), where('dateKey', 'in', chunk)))),
  )

  for (const snap of snaps) {
    for (const docSnap of snap.docs) {
      const tenantId = tenantIdFromAnalyticsPath(docSnap.ref.path)
      if (!tenantId) continue
      const row = docSnap.data() as McAnalyticsDaily
      const list = byTenant.get(tenantId) ?? []
      list.push(row)
      byTenant.set(tenantId, list)
    }
  }

  return byTenant
}

export async function fetchPlatformTenantAnalytics(db: Firestore): Promise<Map<string, TenantAnalyticsRow>> {
  const keys30 = mcAnalyticsDateKeysForPeriod(30)
  const keys7 = new Set(mcAnalyticsDateKeysForPeriod(7))
  const byTenant = await fetchDailyByDateKeys(db, keys30)
  const result = new Map<string, TenantAnalyticsRow>()

  for (const [tenantId, rows] of byTenant) {
    const rows7 = rows.filter((r) => keys7.has(r.dateKey))
    result.set(tenantId, {
      tenantId,
      visits7d: sumMetric(rows7, 'visits'),
      visits30d: sumMetric(rows, 'visits'),
      pageViews30d: sumMetric(rows, 'pageViews'),
      checkoutStarts30d: sumMetric(rows, 'checkoutStarts'),
    })
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
