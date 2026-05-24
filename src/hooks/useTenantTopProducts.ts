import { useCallback, useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import {
  mcAnalyticsProductDailyCollection,
  mcAnalyticsProductDailyDocId,
  mcAnalyticsProductsCollection,
} from '@/lib/mcCollections'
import { mcAnalyticsDateKeysForPeriod } from '@/lib/mcAnalyticsDates'
import type { McAnalyticsPeriod, McTopProductRow } from '@/types/mc'

function periodDays(period: McAnalyticsPeriod): number {
  if (period === '7d') return 7
  if (period === '14d') return 14
  return 30
}

async function fetchTopProductsViaDailyList(
  tenantId: string,
  periodKeys: Set<string>,
): Promise<Map<string, McTopProductRow>> {
  const byProduct = new Map<string, McTopProductRow>()
  const snap = await getDocs(collection(getDb(), mcAnalyticsProductDailyCollection(tenantId)))
  for (const d of snap.docs) {
    const data = d.data()
    const dateKey = String(data.dateKey ?? '')
    if (!periodKeys.has(dateKey)) continue
    const productId = String(data.productId ?? '')
    if (!productId) continue
    const views = Number(data.views ?? 0)
    if (views <= 0) continue
    const cur = byProduct.get(productId)
    if (cur) {
      cur.views += views
      if (data.productTitle) cur.productTitle = String(data.productTitle)
      if (data.imageUrl) cur.imageUrl = String(data.imageUrl)
    } else {
      byProduct.set(productId, {
        productId,
        productTitle: String(data.productTitle ?? 'Producto'),
        imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
        views,
        sharePercent: 0,
      })
    }
  }
  return byProduct
}

/** Fallback sin list: productos conocidos + getDoc por día. */
async function fetchTopProductsViaGetDoc(
  tenantId: string,
  periodKeys: string[],
): Promise<Map<string, McTopProductRow>> {
  const byProduct = new Map<string, McTopProductRow>()
  const productsSnap = await getDocs(collection(getDb(), mcAnalyticsProductsCollection(tenantId)))
  if (productsSnap.empty) return byProduct

  await Promise.all(
    productsSnap.docs.map(async (productDoc) => {
      const meta = productDoc.data()
      const productId = productDoc.id
      let views = 0
      await Promise.all(
        periodKeys.map(async (dateKey) => {
          const snap = await getDoc(
            doc(
              getDb(),
              mcAnalyticsProductDailyCollection(tenantId),
              mcAnalyticsProductDailyDocId(dateKey, productId),
            ),
          )
          if (snap.exists()) views += Number(snap.data()?.views ?? 0)
        }),
      )
      if (views <= 0) return
      byProduct.set(productId, {
        productId,
        productTitle: String(meta.productTitle ?? 'Producto'),
        imageUrl: typeof meta.imageUrl === 'string' ? meta.imageUrl : undefined,
        views,
        sharePercent: 0,
      })
    }),
  )
  return byProduct
}

export async function fetchTenantTopProducts(
  tenantId: string,
  period: McAnalyticsPeriod,
  limit = 10,
): Promise<McTopProductRow[]> {
  const keys = mcAnalyticsDateKeysForPeriod(periodDays(period))
  const periodKeys = new Set(keys)

  let byProduct: Map<string, McTopProductRow>
  try {
    byProduct = await fetchTopProductsViaDailyList(tenantId, periodKeys)
  } catch {
    byProduct = await fetchTopProductsViaGetDoc(tenantId, keys)
  }

  const rows = [...byProduct.values()].sort((a, b) => b.views - a.views)
  const totalViews = rows.reduce((s, r) => s + r.views, 0)
  return rows.slice(0, limit).map((row) => ({
    ...row,
    sharePercent: totalViews > 0 ? Math.round((row.views / totalViews) * 100) : 0,
  }))
}

export function useTenantTopProducts(
  tenantId: string | undefined,
  period: McAnalyticsPeriod,
  limit = 10,
) {
  const [rows, setRows] = useState<McTopProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!tenantId || !firebaseConfigured) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const data = await fetchTenantTopProducts(tenantId, period, limit)
      setRows(data)
    } catch (e) {
      console.error('[useTenantTopProducts]', e)
      setErr('No se pudieron cargar las vistas por producto.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [tenantId, period, limit])

  useEffect(() => {
    void reload()
  }, [reload])

  return { rows, loading, err, reload }
}
