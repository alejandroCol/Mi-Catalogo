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
import { mcPosTurnosCollection } from '@/lib/mcPosCollections'
import type { McPosTurno } from '@/types/mc'

export function usePosTurnoAbierto(
  tenantId: string | null | undefined,
  vendedorUid: string | null | undefined,
  sedeId: string | null | undefined,
) {
  const [turno, setTurno] = useState<(McPosTurno & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId || !vendedorUid || !sedeId) {
      setTurno(null)
      setLoading(false)
      return
    }
    const db = getDb()
    const q = query(
      collection(db, mcPosTurnosCollection(tenantId)),
      where('vendedorUid', '==', vendedorUid),
      where('sedeId', '==', sedeId),
      where('estado', '==', 'abierto'),
      orderBy('inicioAt', 'desc'),
      limit(1),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const doc = snap.docs[0]
        setTurno(doc ? { id: doc.id, ...(doc.data() as Omit<McPosTurno, 'id'>) } : null)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId, vendedorUid, sedeId])

  return { turno, loading }
}
