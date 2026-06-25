import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosSedesCollection } from '@/lib/mcPosCollections'
import type { McPosSede } from '@/types/mc'

export function usePosSedes(tenantId: string | null | undefined) {
  const [sedes, setSedes] = useState<(McPosSede & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setSedes([])
      setLoading(false)
      return
    }
    const db = getDb()
    const q = query(collection(db, mcPosSedesCollection(tenantId)), orderBy('nombre'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSedes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosSede, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId])

  return { sedes, loading }
}
