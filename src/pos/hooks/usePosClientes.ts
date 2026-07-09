import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosClientesCollection } from '@/lib/mcPosCollections'
import type { McPosCliente } from '@/types/mc'

export function usePosClientes(tenantId: string | null | undefined) {
  const [clientes, setClientes] = useState<(McPosCliente & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setClientes([])
      setLoading(false)
      return
    }
    const db = getDb()
    const q = query(collection(db, mcPosClientesCollection(tenantId)), orderBy('nombre'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setClientes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McPosCliente, 'id'>) })))
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId])

  return { clientes, loading }
}
