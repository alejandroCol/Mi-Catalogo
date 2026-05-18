import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, query } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'

/** Indica si el tenant tiene al menos un documento en productos. */
export function useTenantHasProducts(tenantId: string | undefined) {
  const [loading, setLoading] = useState(true)
  const [hasProducts, setHasProducts] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) {
      setLoading(false)
      setHasProducts(false)
      return
    }
    setLoading(true)
    const db = getDb()
    const q = query(collection(db, mcProductosCollection(tenantId)), limit(1))
    return onSnapshot(
      q,
      (snap) => {
        setHasProducts(snap.docs.length > 0)
        setLoading(false)
      },
      () => {
        setLoading(false)
      },
    )
  }, [tenantId])

  return { hasProducts, loading }
}
