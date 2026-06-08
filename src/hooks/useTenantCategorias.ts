import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcCategoriasCollection } from '@/lib/mcCollections'
import type { McCategoria } from '@/types/mc'

export function useTenantCategorias(tenantId: string | null | undefined) {
  const [categorias, setCategorias] = useState<(McCategoria & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) {
      setCategorias([])
      setLoading(false)
      return
    }
    setLoading(true)
    const db = getDb()
    const q = query(collection(db, mcCategoriasCollection(tenantId)), orderBy('orden', 'asc'))
    return onSnapshot(
      q,
      (snap) => {
        setCategorias(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McCategoria, 'id'>) })))
        setLoading(false)
      },
      () => {
        setCategorias([])
        setLoading(false)
      },
    )
  }, [tenantId])

  return { categorias, loading }
}
