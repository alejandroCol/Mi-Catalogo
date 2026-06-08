import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { isNewStoreExpertPromoEnabled } from '@/lib/newStoreOnboarding'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

type Props = {
  compact?: boolean
}

/** Activa o desactiva el banner promo Expert 24 h para tiendas nuevas. */
export function NewStoreExpertPromoSettings({ compact = false }: Props) {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    setErr(null)
    try {
      const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const settings = snap.exists() ? (snap.data() as McPlatformSettings) : {}
      setEnabled(isNewStoreExpertPromoEnabled(settings))
    } catch {
      setErr('No se pudo cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function guardar(nextEnabled: boolean) {
    setBusy(true)
    setMsg(null)
    setErr(null)
    setEnabled(nextEnabled)
    try {
      await setDoc(
        doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc),
        {
          newStoreExpertPromoBannerEnabled: nextEnabled,
          updatedAt: Date.now(),
        },
        { merge: true },
      )
      setMsg(nextEnabled ? 'Promo Expert 24 h activada.' : 'Promo Expert 24 h desactivada.')
    } catch {
      setErr('No se pudo guardar la configuración.')
      void load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={compact ? 'space-y-3' : 'mc-card space-y-4'} id="promo-expert-tiendas-nuevas">
      <div>
        <h2 className="text-[15px] font-semibold text-mc-900">Promo Expert 24 h (tiendas nuevas)</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-mc-600">
          Controla el banner superior en Inicio con la promo de Expert por 1 mes. El checklist de primeros pasos
          sigue visible para tiendas nuevas aunque desactives esta promo.
        </p>
      </div>

      <McToggleSwitch
        id="new-store-expert-promo-enabled"
        checked={enabled}
        disabled={loading || busy}
        onChange={(checked) => void guardar(checked)}
        label="Mostrar banner promo Expert en tiendas nuevas"
        description="Incluye el contador de 24 h y el código Expert al completar el checklist dentro de ese plazo."
      />

      {loading ? <p className="text-[13px] text-mc-600">Cargando…</p> : null}
      {msg ? <p className="text-[13px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-[13px] text-red-800">{err}</p> : null}
    </section>
  )
}
