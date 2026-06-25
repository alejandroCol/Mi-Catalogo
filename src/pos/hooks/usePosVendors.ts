import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { mapFirestoreDataToMcUser } from '@/lib/mcUserFromFirestore'
import type { McUser } from '@/types/mc'

export function usePosVendors(tenantId: string | null | undefined) {
  const [vendors, setVendors] = useState<McUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      setVendors([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    const db = getDb()
    const q = query(
      collection(db, MC.users),
      where('tenantId', '==', tenantId),
      where('role', '==', 'pos_vendor'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setVendors(
          snap.docs.map((d) => mapFirestoreDataToMcUser(d.id, d.data())),
        )
        setError(null)
        setLoading(false)
      },
      (err) => {
        console.error('usePosVendors', err)
        setVendors([])
        setError('No se pudieron cargar los vendedores.')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [tenantId])

  return { vendors, loading, error }
}
