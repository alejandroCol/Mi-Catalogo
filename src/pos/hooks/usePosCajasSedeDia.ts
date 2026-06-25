import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosCajaDiariaCollection } from '@/lib/mcPosCollections'
import type { McPosCajaDiaria } from '@/types/mc'

/** Todas las cajas diarias de una sede (supervisión admin). */
export function usePosCajasSedeDia(
  tenantId: string | null | undefined,
  sedeId: string | null | undefined,
  fechaKey: string,
) {
  const [cajas, setCajas] = useState<(McPosCajaDiaria & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId || !sedeId || !fechaKey) {
      setCajas([])
      setLoading(false)
      return
    }
    const db = getDb()
    const q = query(
      collection(db, mcPosCajaDiariaCollection(tenantId)),
      where('sedeId', '==', sedeId),
      where('fechaKey', '==', fechaKey),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCajas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosCajaDiaria, 'id'>) })))
        setLoading(false)
      },
      () => {
        setCajas([])
        setLoading(false)
      },
    )
    return () => unsub()
  }, [tenantId, sedeId, fechaKey])

  return { cajas, loading }
}
