import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { isMuxLiveTestEnabled } from '@/lib/muxLiveTestMode'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

type Props = {
  compact?: boolean
}

/** Activa o desactiva streams Mux de prueba (watermark TEST) para nuevos lives. */
export function MuxLiveTestSettings({ compact = false }: Props) {
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
      setEnabled(isMuxLiveTestEnabled(settings))
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
          muxLiveTestEnabled: nextEnabled,
          updatedAt: Date.now(),
        },
        { merge: true },
      )
      setMsg(
        nextEnabled
          ? 'Modo test Mux activado. Los nuevos lives tendrán la etiqueta TEST.'
          : 'Modo producción Mux activado. Los nuevos lives se cobran por minuto en Mux.',
      )
    } catch {
      setErr('No se pudo guardar la configuración.')
      void load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={compact ? 'space-y-3' : 'mc-card space-y-4'} id="mux-live-test">
      <div>
        <h2 className="text-[15px] font-semibold text-mc-900">Live shopping — modo Mux</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-mc-600">
          Controla si los <strong className="font-medium text-mc-900">nuevos</strong> lives se crean como streams de
          prueba en Mux (watermark TEST, ~5 min gratis) o como producción (sin TEST, cobro por minuto). Los lives ya
          creados no cambian.
        </p>
      </div>

      <McToggleSwitch
        id="mux-live-test-enabled"
        checked={enabled}
        disabled={loading || busy}
        onChange={(checked) => void guardar(checked)}
        label="Streams Mux de prueba (watermark TEST)"
        description={
          enabled
            ? 'Activado: ideal para probar sin costo. Desactivá para lives reales con clientes.'
            : 'Desactivado: lives de producción en Mux. Requiere plan de pago y credenciales MUX_TOKEN_ID / MUX_TOKEN_SECRET.'
        }
      />

      {loading ? <p className="text-[13px] text-mc-600">Cargando…</p> : null}
      {msg ? <p className="text-[13px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-[13px] text-red-800">{err}</p> : null}
    </section>
  )
}
