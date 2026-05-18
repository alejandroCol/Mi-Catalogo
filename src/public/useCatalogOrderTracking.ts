import { useCallback, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import type { CatalogOrderTrackingPublic } from '@/lib/catalogOrderTracking'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'

type FetchInput = {
  slug: string
  orderId: string
}

export function useCatalogOrderTracking() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<CatalogOrderTrackingPublic | null>(null)

  const fetchTracking = useCallback(async (input: FetchInput) => {
    if (!firebaseConfigured) {
      setError('Servicio no disponible.')
      return null
    }
    setLoading(true)
    setError(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcCatalogOrderTracking')
      const r = await fn(input)
      const d = r.data as { notFound?: boolean; order?: CatalogOrderTrackingPublic; message?: string }
      if (d?.notFound) {
        setOrder(null)
        setError('No encontramos un pedido con ese número. Revisá que esté bien escrito.')
        return null
      }
      if (!d?.order) {
        setOrder(null)
        setError(d?.message ?? 'No se pudo cargar el pedido.')
        return null
      }
      setOrder(d.order)
      return d.order
    } catch (e) {
      setOrder(null)
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : 'No se pudo consultar el pedido.'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setOrder(null)
    setError(null)
    setLoading(false)
  }, [])

  return { loading, error, order, fetchTracking, reset }
}
