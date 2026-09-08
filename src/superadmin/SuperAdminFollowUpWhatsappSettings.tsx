import { useCallback, useEffect, useMemo, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  buildSuperAdminFollowUpMessage,
  DEFAULT_SUPER_ADMIN_FOLLOW_UP_WHATSAPP_MESSAGE,
  SUPER_ADMIN_FOLLOW_UP_STORE_PLACEHOLDER,
} from '@/lib/superAdminFollowUpWhatsapp'
import type { McPlatformSettings } from '@/types/mc'

const PREVIEW_STORE_NAME = 'Mi Tienda Demo'

type Props = {
  compact?: boolean
  onSaved?: () => void
}

/** Plantilla editable del mensaje WhatsApp «Hacer seguimiento» en el listado de tiendas. */
export function SuperAdminFollowUpWhatsappSettings({ compact = false, onSaved }: Props) {
  const [message, setMessage] = useState(DEFAULT_SUPER_ADMIN_FOLLOW_UP_WHATSAPP_MESSAGE)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const preview = useMemo(
    () => buildSuperAdminFollowUpMessage(PREVIEW_STORE_NAME, { superAdminFollowUpWhatsappMessage: message }),
    [message],
  )

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    setErr(null)
    try {
      const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const settings = snap.exists() ? (snap.data() as McPlatformSettings) : {}
      const template = settings.superAdminFollowUpWhatsappMessage?.trim()
      setMessage(template && template.length > 0 ? template : DEFAULT_SUPER_ADMIN_FOLLOW_UP_WHATSAPP_MESSAGE)
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
    const trimmed = message.trim()
    if (!trimmed) {
      setErr('El mensaje no puede quedar vacío.')
      setBusy(false)
      return
    }
    try {
      await setDoc(
        doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc),
        {
          superAdminFollowUpWhatsappMessage: trimmed,
          updatedAt: Date.now(),
        },
        { merge: true },
      )
      setMsg('Mensaje de seguimiento guardado.')
      onSaved?.()
    } catch {
      setErr('No se pudo guardar la configuración.')
    } finally {
      setBusy(false)
    }
  }

  async function restaurarDefault() {
    setMessage(DEFAULT_SUPER_ADMIN_FOLLOW_UP_WHATSAPP_MESSAGE)
    setMsg(null)
    setErr(null)
  }

  return (
    <section className={compact ? 'space-y-3' : 'mc-card space-y-4'} id="whatsapp-seguimiento-tiendas">
      <div>
        <h2 className="text-[15px] font-semibold text-mc-900">Mensaje WhatsApp de seguimiento</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-mc-600">
          Texto que se envía al tocar <strong className="font-medium text-mc-800">Hacer seguimiento</strong> en tiendas
          Free. Usá{' '}
          <code className="rounded bg-mc-100 px-1 text-[12px]">{SUPER_ADMIN_FOLLOW_UP_STORE_PLACEHOLDER}</code> donde
          quieras insertar el nombre de la tienda.
        </p>
      </div>

      <div>
        <label className="ios-footnote font-medium text-mc-700" htmlFor="follow-up-whatsapp-message">
          Plantilla del mensaje
        </label>
        <textarea
          id="follow-up-whatsapp-message"
          className="mc-input mt-1.5 min-h-[12rem] resize-y font-sans text-[13px] leading-relaxed"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={loading || busy}
          spellCheck
        />
      </div>

      <div className="rounded-lg border border-mc-200/80 bg-mc-50/50 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-mc-500">Vista previa</p>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-mc-800">{preview}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="mc-btn-primary px-5 py-3"
          disabled={loading || busy}
          onClick={() => void guardar()}
        >
          {busy ? 'Guardando…' : 'Guardar mensaje'}
        </button>
        <button
          type="button"
          className="mc-btn-secondary px-5 py-3"
          disabled={loading || busy}
          onClick={() => void restaurarDefault()}
        >
          Restaurar predeterminado
        </button>
      </div>

      {loading ? <p className="text-[13px] text-mc-600">Cargando…</p> : null}
      {msg ? <p className="text-[13px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-[13px] text-red-800">{err}</p> : null}
    </section>
  )
}
