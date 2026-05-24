import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { PlatformTermsModal } from '@/components/legal/PlatformTermsModal'
import { IconChevronLeft } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import {
  DEFAULT_PLATFORM_TERMS_TEXT,
  DEFAULT_PLATFORM_TERMS_VERSION,
  hashTermsContent,
  resolvePlatformTerms,
} from '@/lib/platformTerms'
import type { McPlatformSettings } from '@/types/mc'

export function SuperAdminTerminosPage() {
  const { profile } = useMcAuth()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const [version, setVersion] = useState(DEFAULT_PLATFORM_TERMS_VERSION)
  const [text, setText] = useState(DEFAULT_PLATFORM_TERMS_TEXT)
  const [savedVersion, setSavedVersion] = useState<string | null>(null)
  const [savedText, setSavedText] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | undefined>()

  const contentHash = useMemo(() => hashTermsContent(text), [text])
  const hasChanges = savedVersion !== version || savedText !== text

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    setErr(null)
    try {
      const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const data = snap.exists() ? (snap.data() as McPlatformSettings) : {}
      const resolved = resolvePlatformTerms(data)
      setVersion(resolved.version)
      setText(resolved.text)
      setSavedVersion(resolved.version)
      setSavedText(resolved.text)
      setUpdatedAt(resolved.updatedAt)
    } catch {
      setErr('No se pudo cargar los términos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void load()
  }, [profile, load])

  function suggestNewVersion() {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    setVersion(`${y}-${m}-${d}`)
  }

  function restoreDefaults() {
    setText(DEFAULT_PLATFORM_TERMS_TEXT)
    if (!version.trim()) setVersion(DEFAULT_PLATFORM_TERMS_VERSION)
  }

  async function guardar() {
    const v = version.trim()
    const t = text.trim()
    if (!v) {
      setErr('Indicá una versión (ej. 2026-05-23).')
      return
    }
    if (t.length < 200) {
      setErr('El texto de términos es demasiado corto.')
      return
    }
    if (savedText && savedText !== t && savedVersion === v) {
      setErr('Si cambiaste el texto, actualizá también la versión para distinguir aceptaciones.')
      return
    }

    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      const ref = doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)
      const now = Date.now()
      const payload: Pick<
        McPlatformSettings,
        'platformTermsVersion' | 'platformTermsText' | 'platformTermsUpdatedAt' | 'updatedAt'
      > = {
        platformTermsVersion: v,
        platformTermsText: t,
        platformTermsUpdatedAt: now,
        updatedAt: now,
      }
      await setDoc(ref, payload, { merge: true })
      setSavedVersion(v)
      setSavedText(t)
      setUpdatedAt(now)
      setMsg('Términos publicados. Las nuevas tiendas deberán aceptar esta versión al registrarse.')
    } catch {
      setErr('No se pudo guardar. Revisá reglas Firestore (súper admin).')
    } finally {
      setBusy(false)
    }
  }

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="mc-shell mx-auto max-w-3xl space-y-8 pb-32">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        Volver al panel
      </Link>

      <div>
        <h1 className="ios-large-title">Términos y condiciones</h1>
        <p className="ios-subhead mt-1 max-w-xl">
          Texto legal que cada comerciante debe aceptar al crear su tienda. Podés editarlo por completo; al
          publicar cambios, incrementá la versión.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900" aria-hidden />
          <p className="ios-subhead text-mc-600">Cargando…</p>
        </div>
      ) : (
        <>
          <section className="mc-card space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1.5">
                <label className="ios-footnote font-medium text-mc-700" htmlFor="terms-version">
                  Versión vigente
                </label>
                <input
                  id="terms-version"
                  className="mc-input max-w-xs font-mono text-[14px]"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="2026-05-23"
                />
                <p className="text-[12px] leading-relaxed text-mc-500">
                  Se guarda como huella en cada registro. Cambiá la versión cuando modifiques el texto.
                </p>
              </div>
              <button
                type="button"
                className="mc-btn-secondary shrink-0 px-4 py-2.5 text-[14px]"
                onClick={suggestNewVersion}
              >
                Usar fecha de hoy
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="ios-footnote font-medium text-mc-700" htmlFor="terms-text">
                Texto completo
              </label>
              <textarea
                id="terms-text"
                className="mc-input min-h-[28rem] resize-y font-mono text-[13px] leading-relaxed"
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
              />
              <p className="text-[12px] text-mc-500">
                {text.length.toLocaleString('es-CO')} caracteres · hash{' '}
                <span className="font-mono">{contentHash}</span>
                {updatedAt ? (
                  <>
                    {' '}
                    · publicado{' '}
                    {new Date(updatedAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                  </>
                ) : null}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-mc-100 pt-4">
              <button
                type="button"
                className="mc-btn-primary px-5 py-2.5"
                disabled={busy || !hasChanges}
                onClick={() => void guardar()}
              >
                {busy ? 'Publicando…' : 'Publicar términos'}
              </button>
              <button
                type="button"
                className="mc-btn-secondary px-4 py-2.5 text-[14px]"
                disabled={busy}
                onClick={() => setPreviewOpen(true)}
              >
                Vista previa
              </button>
              <button
                type="button"
                className="mc-btn-secondary px-4 py-2.5 text-[14px]"
                disabled={busy}
                onClick={restoreDefaults}
              >
                Restaurar plantilla legal
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-[13px] leading-relaxed text-amber-950">
            <strong className="font-medium">Nota legal:</strong> este editor facilita la gestión del texto mostrado
            al registrarse. Consultá con un abogado antes de depender de cláusulas específicas en disputas reales.
          </section>

          {err && (
            <p className="border border-red-200/60 bg-red-50/40 px-3 py-2 text-[14px] leading-relaxed text-red-900">
              {err}
            </p>
          )}
          {msg && (
            <p className="border border-neutral-200/60 bg-neutral-50/50 px-3 py-2 text-[14px] leading-relaxed text-mc-900">
              {msg}
            </p>
          )}
        </>
      )}

      <PlatformTermsModal
        open={previewOpen}
        version={version.trim() || DEFAULT_PLATFORM_TERMS_VERSION}
        text={text}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  )
}
