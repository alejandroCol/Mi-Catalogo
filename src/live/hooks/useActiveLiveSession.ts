import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcLiveSessionsCollection } from '@/lib/mcCollections'
import type { McLiveSession } from '@/types/mc'

/** Sesión en vivo activa de la tienda (si hay). */
export function useActiveLiveSession(tenantId: string | undefined) {
  const [session, setSession] = useState<(McLiveSession & { id: string }) | null>(null)
  const [loading, setLoading] = useState(Boolean(tenantId))

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) {
      setSession(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const db = getDb()
    const q = query(
      collection(db, mcLiveSessionsCollection(tenantId)),
      where('status', '==', 'live'),
      limit(1),
    )
    return onSnapshot(
      q,
      (snap) => {
        const doc = snap.docs[0]
        setSession(doc ? { id: doc.id, ...(doc.data() as Omit<McLiveSession, 'id'>) } : null)
        setLoading(false)
      },
      () => {
        setSession(null)
        setLoading(false)
      },
    )
  }, [tenantId])

  return { session, loading }
}
