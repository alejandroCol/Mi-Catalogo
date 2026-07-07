import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcOrdenesCatalogoCollection } from '@/lib/mcCollections'
import type { McOrdenCatalogo } from '@/types/mc'

export function useCatalogOrdenes(
  tenantId: string | null | undefined,
  opts?: { desdeMs?: number; hastaMs?: number; enabled?: boolean },
) {
  const [ordenes, setOrdenes] = useState<(McOrdenCatalogo & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const enabled = opts?.enabled !== false

  useEffect(() => {
    if (!tenantId || !enabled) {
      setOrdenes([])
      setLoading(false)
      return
    }
    const db = getDb()
    const constraints: QueryConstraint[] = []
    if (opts?.desdeMs != null) constraints.push(where('createdAt', '>=', opts.desdeMs))
    if (opts?.hastaMs != null) constraints.push(where('createdAt', '<', opts.hastaMs))
    constraints.push(orderBy('createdAt', 'desc'))

    const q = query(collection(db, mcOrdenesCatalogoCollection(tenantId)), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrdenes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McOrdenCatalogo, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId, enabled, opts?.desdeMs, opts?.hastaMs])

  return { ordenes, loading }
}
