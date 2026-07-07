import { useCallback, useEffect, useState } from 'react'
import { fetchAnalyticsDailyDoc } from '@/hooks/useTenantAnalytics'
import { reportDateKeysBetween, type ReportDateRange } from '@/lib/reports/reportDateRange'
import type { McAnalyticsDaily } from '@/types/mc'

export function useReportAnalyticsDaily(tenantId: string | undefined, range: ReportDateRange | null) {
  const [daily, setDaily] = useState<McAnalyticsDaily[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!tenantId || !range) {
      setDaily([])
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const keys = reportDateKeysBetween(range.desde, range.hasta)
      const rows = await Promise.all(keys.map((key) => fetchAnalyticsDailyDoc(tenantId, key)))
      setDaily(rows)
    } catch {
      setErr('No se pudieron cargar las visitas del periodo.')
      setDaily([])
    } finally {
      setLoading(false)
    }
  }, [tenantId, range?.desde, range?.hasta])

  useEffect(() => {
    void reload()
  }, [reload])

  return { daily, loading, err, reload }
}
