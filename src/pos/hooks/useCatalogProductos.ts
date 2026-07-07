import { useEffect, useState } from 'react'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import type { McProducto } from '@/types/mc'

/** Productos de catálogo (para expansión de combos en POS). */
export function useCatalogProductos(tenantId: string | null | undefined) {
  const [productos, setProductos] = useState<(McProducto & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setProductos([])
      setLoading(false)
      return
    }
    const q = query(collection(getDb(), mcProductosCollection(tenantId)))
    return onSnapshot(
      q,
      (snap) => {
        setProductos(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [tenantId])

  return { productos, loading }
}
