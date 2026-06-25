import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

/** Resuelve tenantId desde slug público (sin exigir catálogo publicado). */
export function usePublicTenantId(slug: string | undefined) {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseConfigured || !slug) {
      setTenantId(null)
      setLoading(false)
      setError('Catálogo no disponible.')
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const slugSnap = await getDoc(doc(getDb(), MC.slugs, slug))
        if (cancelled) return
        if (!slugSnap.exists() || !(slugSnap.data() as { active?: boolean }).active) {
          setTenantId(null)
          setError('Tienda no encontrada.')
          return
        }
        const tid = String((slugSnap.data() as { tenantId?: string }).tenantId ?? '').trim()
        if (!tid) {
          setTenantId(null)
          setError('Tienda no encontrada.')
          return
        }
        setTenantId(tid)
        setError(null)
      } catch {
        if (!cancelled) {
          setTenantId(null)
          setError('No se pudo conectar con la tienda.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [slug])

  return { tenantId, loading, error }
}
