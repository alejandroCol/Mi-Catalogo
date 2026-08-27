import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcOrdenesCatalogoCollection, mcPedidosCollection } from '@/lib/mcCollections'
import { isOrdenCatalogoVentaValida } from '@/lib/reports/profitMetrics'
import {
  endOfLocalDay,
  periodLabelShort,
  periodRangeLocal,
  PEDIDOS_SALES_LOOKBACK_DAYS,
  startOfLocalDay,
  sumPedidosTotalCop,
  type SalesSummaryPeriod,
} from '@/lib/salesSummaryRange'
import type { McOrdenCatalogo, McPedido } from '@/types/mc'

export function useTenantPedidosSales(
  tenantId: string | undefined,
  summaryPeriod: SalesSummaryPeriod,
) {
  const [pedidos, setPedidos] = useState<(McPedido & { id: string })[]>([])
  const [ordenes, setOrdenes] = useState<(McOrdenCatalogo & { id: string })[]>([])
  const [loadingPedidos, setLoadingPedidos] = useState(true)
  const [loadingOrdenes, setLoadingOrdenes] = useState(true)
  const [listenKey, setListenKey] = useState(0)

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) {
      setPedidos([])
      setOrdenes([])
      setLoadingPedidos(false)
      setLoadingOrdenes(false)
      return
    }
    setLoadingPedidos(true)
    setLoadingOrdenes(true)
    const db = getDb()
    const cutoff = Date.now() - PEDIDOS_SALES_LOOKBACK_DAYS * 86400000
    const qPedidos = query(
      collection(db, mcPedidosCollection(tenantId)),
      where('createdAt', '>=', cutoff),
      orderBy('createdAt', 'desc'),
    )
    const qOrdenes = query(
      collection(db, mcOrdenesCatalogoCollection(tenantId)),
      where('createdAt', '>=', cutoff),
      orderBy('createdAt', 'desc'),
    )
    const unsubPedidos = onSnapshot(
      qPedidos,
      (snap) => {
        setPedidos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPedido, 'id'>) })))
        setLoadingPedidos(false)
      },
      () => setLoadingPedidos(false),
    )
    const unsubOrdenes = onSnapshot(
      qOrdenes,
      (snap) => {
        setOrdenes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McOrdenCatalogo, 'id'>) })))
        setLoadingOrdenes(false)
      },
      () => setLoadingOrdenes(false),
    )
    return () => {
      unsubPedidos()
      unsubOrdenes()
    }
  }, [tenantId, listenKey])

  const reload = useCallback(async () => {
    if (!firebaseConfigured || !tenantId) {
      setPedidos([])
      setOrdenes([])
      setLoadingPedidos(false)
      setLoadingOrdenes(false)
      return
    }
    setLoadingPedidos(true)
    setLoadingOrdenes(true)
    try {
      const db = getDb()
      const cutoff = Date.now() - PEDIDOS_SALES_LOOKBACK_DAYS * 86400000
      const qPedidos = query(
        collection(db, mcPedidosCollection(tenantId)),
        where('createdAt', '>=', cutoff),
        orderBy('createdAt', 'desc'),
      )
      const qOrdenes = query(
        collection(db, mcOrdenesCatalogoCollection(tenantId)),
        where('createdAt', '>=', cutoff),
        orderBy('createdAt', 'desc'),
      )
      const [pedidosSnap, ordenesSnap] = await Promise.all([getDocs(qPedidos), getDocs(qOrdenes)])
      setPedidos(pedidosSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPedido, 'id'>) })))
      setOrdenes(ordenesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McOrdenCatalogo, 'id'>) })))
      setListenKey((k) => k + 1)
    } catch {
      /* onSnapshot sigue activo */
    } finally {
      setLoadingPedidos(false)
      setLoadingOrdenes(false)
    }
  }, [tenantId])

  const sums = useMemo(() => {
    const now = Date.now()
    const dayStart = startOfLocalDay(now)
    const dayEnd = endOfLocalDay(now)
    const { start: pStart, end: pEnd } = periodRangeLocal(summaryPeriod, now)
    const ventasValidas = ordenes.filter(isOrdenCatalogoVentaValida)
    const today =
      sumPedidosTotalCop(pedidos, dayStart, dayEnd) + sumPedidosTotalCop(ventasValidas, dayStart, dayEnd)
    const inPeriod =
      sumPedidosTotalCop(pedidos, pStart, pEnd) + sumPedidosTotalCop(ventasValidas, pStart, pEnd)
    const periodLabel = summaryPeriod === 'week' ? 'Esta semana' : 'Esta quincena'
    const periodSub = periodLabelShort(summaryPeriod, now)
    return {
      today,
      periodTotal: inPeriod,
      periodLabel,
      periodSub,
      pedidosCount: pedidos.length + ventasValidas.length,
    }
  }, [pedidos, ordenes, summaryPeriod])

  return { loading: loadingPedidos || loadingOrdenes, reload, ...sums }
}
