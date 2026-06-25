import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { isCatalogPubliclyAccessible } from '@/lib/catalogPublish'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export function usePublicTenant(slug: string | undefined) {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenant, setTenant] = useState<(McTenant & { id: string }) | null>(null)
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseConfigured || !slug) {
      setLoading(false)
      setError('Catálogo no disponible.')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const db = getDb()
        const sref = doc(db, MC.slugs, slug)
        const ss = await getDoc(sref)
        if (cancelled) return
        if (!ss.exists() || !(ss.data() as { active?: boolean }).active) {
          setError('Tienda no encontrada.')
          setLoading(false)
          return
        }
        const tid = (ss.data() as { tenantId: string }).tenantId
        const [ts, ps] = await Promise.all([
          getDoc(doc(db, MC.tenants, tid)),
          getDoc(doc(db, MC.mcPlatform, MC.mcPlatformSettingsDoc)),
        ])
        if (cancelled) return
        if (!ts.exists()) {
          setError('Tienda no disponible.')
          setLoading(false)
          return
        }
        const t = { id: ts.id, ...(ts.data() as Omit<McTenant, 'id'>) }
        if (!isCatalogPubliclyAccessible(t)) {
          setError(
            t.catalogPublished === true
              ? 'Esta tienda tiene la membresía pausada. Renová tu plan para volver a publicar.'
              : 'Esta tienda aún no está publicada. Desde tu panel: Inicio → Publicar tienda.',
          )
          setLoading(false)
          return
        }
        setTenantId(tid)
        setTenant(t)
        setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
        setError(null)
      } catch (err) {
        if (!cancelled) {
          const code = (err as { code?: string })?.code
          setError(
            code === 'permission-denied'
              ? 'Esta tienda no está publicada. Publicala desde tu panel de Mi Catálogo.'
              : 'No se pudo cargar.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  return {
    tenantId,
    tenant,
    platformSettings,
    loading,
    error,
  }
}
