import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosProductosCollection } from '@/lib/mcPosCollections'
import type { McPosProducto } from '@/types/mc'

export function usePosProductos(tenantId: string | null | undefined, sedeId?: string | null) {
  const [productos, setProductos] = useState<(McPosProducto & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setProductos([])
      setLoading(false)
      return
    }
    const db = getDb()
    const q = query(collection(db, mcPosProductosCollection(tenantId)), orderBy('nombre'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosProducto, 'id'>) }))
        if (sedeId) rows = rows.filter((p) => p.sedeId === sedeId)
        setProductos(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId, sedeId])

  return { productos, loading }
}
