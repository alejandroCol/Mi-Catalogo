import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import type { ProductCostLookup } from '@/lib/reports/profitMetrics'
import type { McProducto } from '@/types/mc'

export function useCatalogProductCostMap(tenantId: string | null | undefined) {
  const [productos, setProductos] = useState<(McProducto & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setProductos([])
      setLoading(false)
      return
    }
    const unsub = onSnapshot(
      collection(getDb(), mcProductosCollection(tenantId)),
      (snap) => {
        setProductos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId])

  const costMap: ProductCostLookup = useMemo(() => {
    const map: ProductCostLookup = new Map()
    for (const p of productos) {
      map.set(p.id, { precioCostoCop: p.precioCostoCop })
    }
    return map
  }, [productos])

  return { productos, costMap, loading }
}
