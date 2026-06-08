import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

export type RegisteredStoreOption = {
  id: string
  nombreTienda: string
  slug: string
}

export function useRegisteredStores(enabled: boolean) {
  const [stores, setStores] = useState<RegisteredStoreOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setStores([])
      setLoading(false)
      setError(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    void getDocs(query(collection(getDb(), MC.tenants), orderBy('nombreTienda', 'asc'))).then(
      (snap) => {
        if (cancelled) return
        setStores(
          snap.docs.map((d) => {
            const data = d.data() as { nombreTienda?: string; slug?: string }
            return {
              id: d.id,
              nombreTienda: typeof data.nombreTienda === 'string' ? data.nombreTienda : d.id,
              slug: typeof data.slug === 'string' ? data.slug : '',
            }
          }),
        )
        setLoading(false)
      },
      () => {
        if (cancelled) return
        setStores([])
        setLoading(false)
        setError(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { stores, loading, error }
}
