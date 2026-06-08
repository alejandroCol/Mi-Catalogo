import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McDemoStore } from '@/types/mc'

function mapDemoDoc(id: string, data: Record<string, unknown>): McDemoStore {
  return {
    id,
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : '',
    slug: typeof data.slug === 'string' ? data.slug : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : '',
    description: typeof data.description === 'string' ? data.description : undefined,
    active: data.active !== false,
    order: typeof data.order === 'number' ? data.order : 0,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
  }
}

export function useDemoStores(activeOnly = true) {
  const [stores, setStores] = useState<McDemoStore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const col = collection(getDb(), MC.demoStores)
    const q = activeOnly
      ? query(col, where('active', '==', true), orderBy('order', 'asc'))
      : query(col, orderBy('order', 'asc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStores(snap.docs.map((d) => mapDemoDoc(d.id, d.data() as Record<string, unknown>)))
        setLoading(false)
      },
      () => {
        setStores([])
        setLoading(false)
      },
    )
    return () => unsub()
  }, [activeOnly])

  return { stores, loading }
}
