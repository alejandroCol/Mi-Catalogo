import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

type Props = {
  compact?: boolean
}

/** Configura el correo que recibe avisos cuando alguien registra una tienda nueva. */
export function NewStoreNotifyEmailSettings({ compact = false }: Props) {
  const [notifyEmail, setNotifyEmail] = useState('')
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
      setNotifyEmail(settings.newStoreNotifyEmail?.trim() ?? '')
    } catch {
      setErr('No se pudo cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function guardar() {
    setBusy(true)
    setMsg(null)
    setErr(null)
    const trimmed = notifyEmail.trim()
    if (trimmed && !emailOk(trimmed)) {
      setErr('Ingresá un correo válido o dejá el campo vacío.')
      setBusy(false)
      return
    }
    try {
      await setDoc(
        doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc),
        {
          newStoreNotifyEmail: trimmed || null,
          updatedAt: Date.now(),
        },
        { merge: true },
      )
      setMsg(trimmed ? 'Correo de aviso guardado.' : 'Avisos de registro desactivados.')
    } catch {
      setErr('No se pudo guardar la configuración.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={compact ? 'space-y-3' : 'mc-card space-y-4'} id="correo-nuevas-tiendas">
      <div>
        <h2 className="text-[15px] font-semibold text-mc-900">Correo de nuevas tiendas</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-mc-600">
          Cada vez que alguien registre una tienda, enviamos un correo a esta dirección (vía Resend). Dejá el campo
          vacío para desactivar los avisos.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="ios-footnote font-medium text-mc-700" htmlFor="new-store-notify-email">
            Correo de notificación
          </label>
          <input
            id="new-store-notify-email"
            type="email"
            className="mc-input mt-1.5"
            placeholder="admin@tudominio.com"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            disabled={loading || busy}
          />
        </div>
        <button
          type="button"
          className="mc-btn-primary shrink-0 px-5 py-3"
          disabled={loading || busy}
          onClick={() => void guardar()}
        >
          {busy ? 'Guardando…' : 'Guardar correo'}
        </button>
      </div>
      {loading ? <p className="text-[13px] text-mc-600">Cargando…</p> : null}
      {msg ? <p className="text-[13px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-[13px] text-red-800">{err}</p> : null}
    </section>
  )
}
