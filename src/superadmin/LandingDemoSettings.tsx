import { useCallback, useEffect, useMemo, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { IconLink } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { buildStorePublicUrl, formatStorePublicUrlLabel } from '@/lib/storePublicUrl'
import { useRegisteredStores } from '@/vendedor/hooks/useRegisteredStores'
import type { McPlatformSettings } from '@/types/mc'

type Props = {
  compact?: boolean
}

/** Selector de tienda demo visible en la landing («Ver tienda demo»). */
export function LandingDemoSettings({ compact = false }: Props) {
  const { stores, loading: storesLoading, error: storesError } = useRegisteredStores(true)
  const [selectedSlug, setSelectedSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const storeOptions = useMemo(
    () => stores.filter((s) => s.slug.trim().length >= 2),
    [stores],
  )

  const selectedStore = useMemo(
    () => storeOptions.find((s) => s.slug === selectedSlug) ?? null,
    [storeOptions, selectedSlug],
  )

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    setErr(null)
    try {
      const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const settings = snap.exists() ? (snap.data() as McPlatformSettings) : {}
      setSelectedSlug(settings.landingDemoSlug?.trim().toLowerCase() ?? '')
    } catch {
      setErr('No se pudo cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function guardar(slug: string) {
    setBusy(true)
    setMsg(null)
    setErr(null)
    const normalized = slug.trim().toLowerCase()
    const store = storeOptions.find((s) => s.slug === normalized)
    try {
      await setDoc(
        doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc),
        {
          landingDemoSlug: normalized || null,
          landingDemoDisplayName: store?.nombreTienda ?? null,
          updatedAt: Date.now(),
        },
        { merge: true },
      )
      setSelectedSlug(normalized)
      setMsg(
        normalized
          ? `Tienda demo: ${store?.nombreTienda ?? normalized}.`
          : 'Tienda demo desactivada en la landing.',
      )
    } catch {
      setErr('No se pudo guardar la configuración.')
      void load()
    } finally {
      setBusy(false)
    }
  }

  const previewUrl = selectedStore?.slug ? buildStorePublicUrl(selectedStore.slug) : null

  return (
    <section className={compact ? 'space-y-3' : 'mc-card space-y-4'} id="landing-tienda-demo">
      <div>
        <h2 className="text-[15px] font-semibold text-mc-900">Tienda demo en la landing</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-mc-600">
          Elegí qué tienda se abre cuando un visitante hace clic en{' '}
          <strong className="font-medium text-mc-800">Ver tienda demo</strong> en la página de
          inicio. Solo se muestra el botón si hay una tienda seleccionada.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="landing-demo-store" className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">
          Tienda para la demo
        </label>
        <select
          id="landing-demo-store"
          className="mc-input"
          value={selectedSlug}
          disabled={loading || storesLoading || busy}
          onChange={(e) => {
            const next = e.target.value
            setSelectedSlug(next)
            void guardar(next)
          }}
        >
          <option value="">Sin tienda demo (ocultar botón)</option>
          {storeOptions.map((s) => (
            <option key={s.id} value={s.slug}>
              {s.nombreTienda} — {s.slug}
            </option>
          ))}
        </select>
        {storesError ? (
          <p className="text-[13px] text-red-800">No se pudo cargar el listado de tiendas.</p>
        ) : null}
      </div>

      {selectedStore ? (
        <div className="rounded-xl border border-mc-200/80 bg-mc-50/50 px-4 py-3">
          <p className="text-[13px] text-mc-600">
            URL pública:{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-[12px] text-mc-800">
              {formatStorePublicUrlLabel(selectedStore.slug)}
            </code>
          </p>
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
            >
              <IconLink size={15} />
              Abrir tienda en nueva pestaña
            </a>
          ) : null}
        </div>
      ) : null}

      {loading || storesLoading ? <p className="text-[13px] text-mc-600">Cargando…</p> : null}
      {busy ? <p className="text-[13px] text-mc-600">Guardando…</p> : null}
      {msg ? <p className="text-[13px] text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-[13px] text-red-800">{err}</p> : null}
    </section>
  )
}
