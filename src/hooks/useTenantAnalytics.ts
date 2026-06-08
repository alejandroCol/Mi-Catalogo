import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcAnalyticsDailyCollection } from '@/lib/mcCollections'
import {
  mcAnalyticsDateKeyBogota,
  mcAnalyticsDateKeysForPeriod,
} from '@/lib/mcAnalyticsDates'
import type { McAnalyticsDaily, McAnalyticsPeriod, McAnalyticsSummary } from '@/types/mc'

function periodDays(period: McAnalyticsPeriod): number {
  if (period === '7d') return 7
  if (period === '14d') return 14
  return 30
}

function emptyDaily(dateKey: string): McAnalyticsDaily {
  return {
    dateKey,
    visits: 0,
    pageViews: 0,
    productViews: 0,
    checkoutStarts: 0,
    checkoutCompletes: 0,
  }
}

function sumDaily(rows: McAnalyticsDaily[]): Omit<McAnalyticsSummary, 'daily'> {
  return rows.reduce(
    (acc, row) => ({
      visits: acc.visits + row.visits,
      pageViews: acc.pageViews + row.pageViews,
      productViews: acc.productViews + row.productViews,
      checkoutStarts: acc.checkoutStarts + row.checkoutStarts,
      checkoutCompletes: acc.checkoutCompletes + row.checkoutCompletes,
    }),
    {
      visits: 0,
      pageViews: 0,
      productViews: 0,
      checkoutStarts: 0,
      checkoutCompletes: 0,
    },
  )
}

/** Misma estrategia que el contador del home: getDoc por día (evita queries `in` en subcolección). */
export async function fetchAnalyticsDailyDoc(
  tenantId: string,
  dateKey: string,
): Promise<McAnalyticsDaily> {
  const snap = await getDoc(doc(getDb(), mcAnalyticsDailyCollection(tenantId), dateKey))
  if (!snap.exists()) return emptyDaily(dateKey)
  const data = snap.data() as Partial<McAnalyticsDaily>
  return {
    dateKey,
    visits: Number(data.visits ?? 0),
    pageViews: Number(data.pageViews ?? 0),
    productViews: Number(data.productViews ?? 0),
    checkoutStarts: Number(data.checkoutStarts ?? 0),
    checkoutCompletes: Number(data.checkoutCompletes ?? 0),
    updatedAt: data.updatedAt,
  }
}

export async function fetchTenantAnalyticsSummary(
  tenantId: string,
  period: McAnalyticsPeriod,
): Promise<McAnalyticsSummary> {
  const keys = mcAnalyticsDateKeysForPeriod(periodDays(period))
  const daily = await Promise.all(keys.map((dateKey) => fetchAnalyticsDailyDoc(tenantId, dateKey)))
  return { ...sumDaily(daily), daily }
}

export async function fetchTenantTodayVisits(tenantId: string): Promise<number> {
  const dateKey = mcAnalyticsDateKeyBogota()
  const row = await fetchAnalyticsDailyDoc(tenantId, dateKey)
  return row.visits
}

function analyticsLoadErrorMessage(e: unknown): string {
  const code =
    e && typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : ''
  if (code === 'permission-denied') {
    return 'Sin permiso para leer estadísticas. Revisá que las reglas de Firestore estén desplegadas.'
  }
  return 'No se pudieron cargar las estadísticas.'
}

export function useTenantAnalytics(tenantId: string | undefined, period: McAnalyticsPeriod) {
  const [summary, setSummary] = useState<McAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!tenantId || !firebaseConfigured) {
      setSummary(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const data = await fetchTenantAnalyticsSummary(tenantId, period)
      setSummary(data)
    } catch (e) {
      console.error('[useTenantAnalytics]', e)
      setErr(analyticsLoadErrorMessage(e))
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [tenantId, period])

  useEffect(() => {
    void reload()
  }, [reload])

  return { summary, loading, err, reload }
}

export function useTenantTodayVisits(tenantId: string | undefined) {
  const [visits, setVisits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!tenantId || !firebaseConfigured) {
      setVisits(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setVisits(await fetchTenantTodayVisits(tenantId))
    } catch {
      setVisits(null)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { visits, loading, reload }
}
