import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { mapSalesVisitFromFirestore } from '@/lib/mapSalesVisit'
import type { McSalesVisit } from '@/types/mc'

export function useSalesRepVisits(salesRepUid: string | undefined) {
  const [visits, setVisits] = useState<McSalesVisit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!salesRepUid) {
      setVisits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      collection(getDb(), MC.salesVisits),
      where('salesRepUid', '==', salesRepUid),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVisits(snap.docs.map((d) => mapSalesVisitFromFirestore(d.id, d.data() as Record<string, unknown>)))
        setLoading(false)
      },
      () => {
        setVisits([])
        setLoading(false)
      },
    )
    return () => unsub()
  }, [salesRepUid])

  const stats = useMemo(() => {
    const total = visits.length
    const vendidas = visits.filter((v) => v.outcome === 'venta_exitosa').length
    const pendientes = visits.filter((v) => v.outcome === 'pendiente').length
    const rechazos = visits.filter((v) => v.outcome === 'rechazo').length
    return { total, vendidas, pendientes, rechazos }
  }, [visits])

  return { visits, loading, stats }
}
