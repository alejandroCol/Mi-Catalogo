import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcPedidosCollection } from '@/lib/mcCollections'
import {
  endOfLocalDay,
  periodLabelShort,
  periodRangeLocal,
  PEDIDOS_SALES_LOOKBACK_DAYS,
  startOfLocalDay,
  sumPedidosTotalCop,
  type SalesSummaryPeriod,
} from '@/lib/salesSummaryRange'
import type { McPedido } from '@/types/mc'

export function useTenantPedidosSales(
  tenantId: string | undefined,
  summaryPeriod: SalesSummaryPeriod,
) {
  const [rows, setRows] = useState<(McPedido & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const db = getDb()
    const cutoff = Date.now() - PEDIDOS_SALES_LOOKBACK_DAYS * 86400000
    const q = query(
      collection(db, mcPedidosCollection(tenantId)),
      where('createdAt', '>=', cutoff),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPedido, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [tenantId])

  const sums = useMemo(() => {
    const now = Date.now()
    const dayStart = startOfLocalDay(now)
    const dayEnd = endOfLocalDay(now)
    const { start: pStart, end: pEnd } = periodRangeLocal(summaryPeriod, now)
    const today = sumPedidosTotalCop(rows, dayStart, dayEnd)
    const inPeriod = sumPedidosTotalCop(rows, pStart, pEnd)
    const periodLabel = summaryPeriod === 'week' ? 'Esta semana' : 'Esta quincena'
    const periodSub = periodLabelShort(summaryPeriod, now)
    return {
      today,
      periodTotal: inPeriod,
      periodLabel,
      periodSub,
      pedidosCount: rows.length,
    }
  }, [rows, summaryPeriod])

  return { loading, ...sums }
}
