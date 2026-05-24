import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

/** Ajustes globales de plataforma (pasarela Mi Catálogo, planes, etc.). */
export function usePlatformSettings() {
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [ready, setReady] = useState(!firebaseConfigured)

  useEffect(() => {
    if (!firebaseConfigured) return
    let cancelled = false
    void (async () => {
      try {
        const ps = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
        if (cancelled) return
        setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
      } catch {
        if (!cancelled) setPlatformSettings({})
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { platformSettings, ready, loading: !ready }
}
