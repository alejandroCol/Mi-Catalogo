import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcCategoriasCollection } from '@/lib/mcCollections'
import type { McCategoria } from '@/types/mc'

/** Categorías visibles en catálogo público (solo activas; alinea permisos Firestore). */
export function usePublicCategorias(tenantId: string | null | undefined) {
  const [categorias, setCategorias] = useState<(McCategoria & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) {
      setCategorias([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const db = getDb()
    const q = query(
      collection(db, mcCategoriasCollection(tenantId)),
      where('activa', '==', true),
      orderBy('orden', 'asc'),
    )
    return onSnapshot(
      q,
      (snap) => {
        setCategorias(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McCategoria, 'id'>) })))
        setLoading(false)
      },
      (err) => {
        console.error('[usePublicCategorias]', err)
        setCategorias([])
        setLoading(false)
        setError('No se pudieron cargar las categorías.')
      },
    )
  }, [tenantId])

  return { categorias, loading, error }
}
