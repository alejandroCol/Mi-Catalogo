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
import { mcPosTurnosCollection } from '@/lib/mcPosCollections'
import type { McPosTurno } from '@/types/mc'

export function usePosTurnos(
  tenantId: string | null | undefined,
  opts?: { sedeId?: string | null; desdeMs?: number; hastaMs?: number; enabled?: boolean },
) {
  const [turnos, setTurnos] = useState<(McPosTurno & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const enabled = opts?.enabled !== false

  useEffect(() => {
    if (!tenantId || !enabled || opts?.desdeMs == null || opts?.hastaMs == null) {
      setTurnos([])
      setLoading(false)
      return
    }

    const db = getDb()
    const constraints: QueryConstraint[] = []
    if (opts.sedeId) constraints.push(where('sedeId', '==', opts.sedeId))
    constraints.push(where('inicioAt', '>=', opts.desdeMs))
    constraints.push(where('inicioAt', '<', opts.hastaMs))
    constraints.push(orderBy('inicioAt', 'desc'))

    const q = query(collection(db, mcPosTurnosCollection(tenantId)), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTurnos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosTurno, 'id'>) })))
        setLoading(false)
      },
      () => {
        setTurnos([])
        setLoading(false)
      },
    )
    return () => unsub()
  }, [tenantId, enabled, opts?.sedeId, opts?.desdeMs, opts?.hastaMs])

  return { turnos, loading }
}
