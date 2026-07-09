import { useEffect, useState } from 'react'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosVentasCollection } from '@/lib/mcPosCollections'
import type { McPosVenta } from '@/types/mc'

export function usePosVentasPorCliente(
  tenantId: string | null | undefined,
  clienteId: string | null | undefined,
  opts?: { max?: number },
) {
  const [ventas, setVentas] = useState<(McPosVenta & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId || !clienteId) {
      setVentas([])
      setLoading(false)
      return
    }
    const db = getDb()
    const constraints = [
      where('clienteId', '==', clienteId),
      orderBy('createdAt', 'desc'),
    ] as const
    const q = query(
      collection(db, mcPosVentasCollection(tenantId)),
      ...constraints,
      ...(opts?.max ? [limit(opts.max)] : []),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVentas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosVenta, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId, clienteId, opts?.max])

  return { ventas, loading }
}
