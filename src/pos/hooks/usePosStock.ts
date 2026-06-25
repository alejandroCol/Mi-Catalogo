import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosStockCollection } from '@/lib/mcPosCollections'
import type { McPosStock } from '@/types/mc'

export function usePosStock(tenantId: string | null | undefined, sedeId?: string | null) {
  const [stock, setStock] = useState<(McPosStock & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setStock([])
      setLoading(false)
      return
    }
    const db = getDb()
    const unsub = onSnapshot(
      collection(db, mcPosStockCollection(tenantId)),
      (snap) => {
        let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosStock, 'id'>) }))
        if (sedeId) rows = rows.filter((s) => s.sedeId === sedeId)
        setStock(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId, sedeId])

  return { stock, loading }
}
