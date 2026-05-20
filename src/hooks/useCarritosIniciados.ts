import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcCarritosIniciadosCollection } from '@/lib/mcCollections'
import type { McCarritoIniciado } from '@/types/mc'

export type CarritoIniciadoRow = McCarritoIniciado & { id: string }

export function useCarritosIniciados(tenantId: string | undefined) {
  const [rows, setRows] = useState<CarritoIniciadoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId || !firebaseConfigured) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const q = query(
      collection(getDb(), mcCarritosIniciadosCollection(tenantId)),
      orderBy('updatedAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: CarritoIniciadoRow[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as McCarritoIniciado),
        }))
        setRows(next)
        setLoading(false)
      },
      () => {
        setError('No se pudieron cargar los carritos.')
        setLoading(false)
      },
    )
    return () => unsub()
  }, [tenantId])

  return { rows, loading, error }
}
