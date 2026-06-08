import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

/** Ajustes globales de plataforma (pasarela Mi Catálogo, planes, etc.). */
export function usePlatformSettings() {
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [ready, setReady] = useState(!firebaseConfigured)

  const reload = useCallback(async () => {
    if (!firebaseConfigured) {
      setReady(true)
      return
    }
    setReady(false)
    try {
      const ps = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
    } catch {
      setPlatformSettings({})
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { platformSettings, ready, loading: !ready, reload }
}
