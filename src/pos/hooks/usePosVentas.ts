import { useEffect, useState } from 'react'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosVentasCollection } from '@/lib/mcPosCollections'
import type { McPosVenta } from '@/types/mc'

export function usePosVentas(
  tenantId: string | null | undefined,
  opts?: { sedeId?: string | null; desdeMs?: number; hastaMs?: number; max?: number; enabled?: boolean },
) {
  const [ventas, setVentas] = useState<(McPosVenta & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const enabled = opts?.enabled !== false

  useEffect(() => {
    if (!tenantId || !enabled) {
      setVentas([])
      setLoading(false)
      return
    }
    const db = getDb()
    const constraints: QueryConstraint[] = []
    if (opts?.sedeId) constraints.push(where('sedeId', '==', opts.sedeId))
    if (opts?.desdeMs != null) constraints.push(where('createdAt', '>=', opts.desdeMs))
    if (opts?.hastaMs != null) constraints.push(where('createdAt', '<', opts.hastaMs))
    constraints.push(orderBy('createdAt', 'desc'))
    if (opts?.max) constraints.push(limit(opts.max))

    const q = query(collection(db, mcPosVentasCollection(tenantId)), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVentas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosVenta, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId, enabled, opts?.sedeId, opts?.desdeMs, opts?.hastaMs, opts?.max])

  return { ventas, loading }
}
