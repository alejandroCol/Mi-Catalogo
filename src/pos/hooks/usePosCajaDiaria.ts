import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcPosCajaDiariaCollection, mcPosCajaDiariaDocId } from '@/lib/mcPosCollections'
import type { McPosCajaDiaria } from '@/types/mc'

export function usePosCajaDiaria(
  tenantId: string | null | undefined,
  sedeId: string | null | undefined,
  vendedorUid: string | null | undefined,
  fechaKey: string,
) {
  const [caja, setCaja] = useState<(McPosCajaDiaria & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId || !sedeId || !vendedorUid) {
      setCaja(null)
      setLoading(false)
      return
    }
    const db = getDb()
    const docId = mcPosCajaDiariaDocId(sedeId, vendedorUid, fechaKey)
    const ref = doc(db, mcPosCajaDiariaCollection(tenantId), docId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setCaja(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<McPosCajaDiaria, 'id'>) } : null)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [tenantId, sedeId, vendedorUid, fechaKey])

  return { caja, loading }
}
