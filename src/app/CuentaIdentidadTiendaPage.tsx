import { useEffect, useMemo, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import clsx from 'clsx'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { PublicStoreSlugField } from '@/components/store/PublicStoreSlugField'
import { StorePublicHostDisplay } from '@/components/store/StorePublicHostDisplay'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { callMcChangeStoreSlug, mapChangeStoreSlugError } from '@/lib/mcChangeStoreSlugApi'
import { MC } from '@/lib/mcCollections'
import {
  normalizePublicStoreSlug,
  probePublicSlugForTenantChange,
  type PublicSlugAvailabilityStatus,
  type PublicSlugValidationIssue,
} from '@/lib/publicSlug'
import {
  canChangeStoreSlug,
  formatStoreSlugChangeAvailableDate,
  nextStoreSlugChangeAtMs,
  validateStoreDisplayName,
} from '@/lib/storeIdentity'
import { formatStorePublicUrlLabel } from '@/lib/storePublicUrl'

const SLUG_PROBE_DEBOUNCE_MS = 320

type SlugProbeState = {
  status: PublicSlugAvailabilityStatus
  issue?: PublicSlugValidationIssue
}

export function CuentaIdentidadTiendaPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { showSaveSuccess } = useSaveSuccess()

  const [editingName, setEditingName] = useState(false)
  const [nombreDraft, setNombreDraft] = useState('')
  const [nameBusy, setNameBusy] = useState(false)
  const [nameErr, setNameErr] = useState<string | null>(null)

  const [editingSlug, setEditingSlug] = useState(false)
  const [slugDraft, setSlugDraft] = useState('')
  const [slugProbe, setSlugProbe] = useState<SlugProbeState>({ status: 'idle' })
  const [slugBusy, setSlugBusy] = useState(false)
  const [slugErr, setSlugErr] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    setNombreDraft(tenant.nombreTienda)
    setSlugDraft(tenant.slug)
  }, [tenant?.id, tenant?.nombreTienda, tenant?.slug])

  const slugChangeAllowed = tenant ? canChangeStoreSlug(tenant) : false
  const nextSlugChangeAt = tenant ? nextStoreSlugChangeAtMs(tenant) : null

  const normalizedSlugDraft = useMemo(() => normalizePublicStoreSlug(slugDraft), [slugDraft])
  const slugChanged = tenant ? normalizedSlugDraft !== tenant.slug.trim().toLowerCase() : false

  useEffect(() => {
    if (!editingSlug || !tenant || !firebaseConfigured) {
      setSlugProbe({ status: 'idle' })
      return
    }

    const trimmed = slugDraft.trim()
    if (trimmed.length < 3) {
      setSlugProbe({ status: 'invalid', issue: 'too_short' })
      return
    }

    let cancelled = false
    setSlugProbe({ status: 'checking' })

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await probePublicSlugForTenantChange(getDb(), trimmed, tenant.slug)
          if (!cancelled) {
            setSlugProbe({ status: result.status, issue: result.issue })
          }
        } catch {
          if (!cancelled) setSlugProbe({ status: 'idle' })
        }
      })()
    }, SLUG_PROBE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [editingSlug, slugDraft, tenant])

  async function guardarNombre() {
    if (!effectiveTenantId || !tenant) return
    const validationErr = validateStoreDisplayName(nombreDraft)
    if (validationErr) {
      setNameErr(validationErr)
      return
    }
    const trimmed = nombreDraft.trim()
    if (trimmed === tenant.nombreTienda.trim()) {
      setEditingName(false)
      setNameErr(null)
      return
    }

    setNameBusy(true)
    setNameErr(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), { nombreTienda: trimmed })
      setEditingName(false)
      showSaveSuccess({
        title: 'Nombre actualizado',
        message: 'El nombre visible de tu tienda ya se ve en el catálogo.',
      })
    } catch {
      setNameErr('No se pudo guardar el nombre. Revisá tu conexión.')
    } finally {
      setNameBusy(false)
    }
  }

  async function guardarDominio() {
    if (!tenant || !slugChangeAllowed) return
    if (!slugChanged) {
      setEditingSlug(false)
      setSlugErr(null)
      return
    }
    if (slugProbe.status === 'checking') {
      setSlugErr('Estamos comprobando el enlace. Esperá un segundo.')
      return
    }
    if (slugProbe.status !== 'available') {
      setSlugErr('Revisá el enlace antes de guardar.')
      return
    }

    setSlugBusy(true)
    setSlugErr(null)
    try {
      const result = await callMcChangeStoreSlug(normalizedSlugDraft)
      setEditingSlug(false)
      setSlugDraft(result.slug)
      showSaveSuccess({
        title: result.unchanged ? 'Sin cambios' : 'Dominio actualizado',
        message: result.unchanged
          ? 'Tu enlace público sigue igual.'
          : 'Compartí el nuevo enlace con tus clientes. El anterior ya no funcionará.',
      })
    } catch (err: unknown) {
      setSlugErr(mapChangeStoreSlugError(err))
    } finally {
      setSlugBusy(false)
    }
  }

  function cancelarNombre() {
    if (!tenant) return
    setNombreDraft(tenant.nombreTienda)
    setNameErr(null)
    setEditingName(false)
  }

  function cancelarDominio() {
    if (!tenant) return
    setSlugDraft(tenant.slug)
    setSlugErr(null)
    setSlugProbe({ status: 'idle' })
    setEditingSlug(false)
  }

  if (!tenant) {
    return (
      <ConfiguracionesSubpageLayout title="Nombre y dominio">
        <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
      </ConfiguracionesSubpageLayout>
    )
  }

  return (
    <ConfiguracionesSubpageLayout title="Nombre y dominio">
      <div className="space-y-4">
        <section className="mc-card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-medium tracking-tight text-[var(--cat-text)]">Nombre visible</h2>
              <p className="ios-footnote mt-1 leading-relaxed text-[var(--cat-muted)]">
                Es el título que ven tus clientes en la cabecera del catálogo.
              </p>
            </div>
            {!editingName ? (
              <button
                type="button"
                className="shrink-0 rounded-lg border border-neutral-200/70 bg-white px-3 py-2 text-[13px] font-medium text-[var(--cat-text)] transition hover:border-neutral-300 hover:bg-neutral-50/80"
                onClick={() => setEditingName(true)}
              >
                Editar nombre
              </button>
            ) : null}
          </div>

          {!editingName ? (
            <div className="rounded-xl border border-neutral-200/60 bg-gradient-to-br from-neutral-50/90 via-[var(--cat-surface)] to-[color-mix(in_srgb,var(--cat-accent)_4%,var(--cat-surface))] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">
                Nombre en el catálogo
              </p>
              <p className="mt-2 text-[1.35rem] font-medium leading-snug tracking-tight text-[var(--cat-text)]">
                {tenant.nombreTienda}
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-neutral-200/60 bg-white/80 px-4 py-4">
              <div>
                <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80" htmlFor="store-display-name">
                  Nuevo nombre
                </label>
                <input
                  id="store-display-name"
                  className="mc-input mt-1.5"
                  value={nombreDraft}
                  onChange={(e) => setNombreDraft(e.target.value)}
                  placeholder="Ej. Casual Clothes"
                  autoComplete="organization"
                  disabled={nameBusy}
                  autoFocus
                />
              </div>
              {nameErr ? <p className="text-[13px] leading-relaxed text-red-800">{nameErr}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="mc-btn-primary min-w-[7rem] flex-1 sm:flex-none"
                  disabled={nameBusy}
                  onClick={() => void guardarNombre()}
                >
                  {nameBusy ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  className="mc-btn-secondary min-w-[7rem] flex-1 sm:flex-none"
                  disabled={nameBusy}
                  onClick={cancelarNombre}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mc-card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-medium tracking-tight text-[var(--cat-text)]">Dominio del catálogo</h2>
              <p className="ios-footnote mt-1 leading-relaxed text-[var(--cat-muted)]">
                Tu enlace público personalizado. Podés cambiarlo una vez cada 6 meses.
              </p>
            </div>
            {!editingSlug && slugChangeAllowed ? (
              <button
                type="button"
                className="shrink-0 rounded-lg border border-neutral-200/70 bg-white px-3 py-2 text-[13px] font-medium text-[var(--cat-text)] transition hover:border-neutral-300 hover:bg-neutral-50/80"
                onClick={() => setEditingSlug(true)}
              >
                Editar dominio
              </button>
            ) : null}
          </div>

          {!editingSlug ? (
            <div className="rounded-xl border border-neutral-200/60 bg-gradient-to-br from-neutral-50/90 via-[var(--cat-surface)] to-[color-mix(in_srgb,var(--cat-accent)_4%,var(--cat-surface))] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">
                Enlace actual
              </p>
              <p className="mt-2">
                <StorePublicHostDisplay
                  host={formatStorePublicUrlLabel(tenant.slug)}
                  variant="highlight"
                  className="text-[15px] font-medium"
                />
              </p>
              {!slugChangeAllowed && nextSlugChangeAt ? (
                <p className="mt-3 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-950">
                  Podés volver a editar el dominio el{' '}
                  <span className="font-medium">{formatStoreSlugChangeAvailableDate(nextSlugChangeAt)}</span>.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-neutral-200/60 bg-white/80 px-4 py-4">
              <PublicStoreSlugField
                value={slugDraft}
                onChange={setSlugDraft}
                status={slugProbe.status}
                issue={slugProbe.issue}
                disabled={slugBusy}
                autoFocus
              />
              <p className="rounded-lg border border-amber-200/55 bg-amber-50/40 px-3 py-2.5 text-[12px] leading-relaxed text-amber-950">
                Al cambiar el dominio, el enlace anterior dejará de funcionar. Actualizá tus redes y materiales
                impresos.
              </p>
              {slugErr ? <p className="text-[13px] leading-relaxed text-red-800">{slugErr}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={clsx(
                    'mc-btn-primary min-w-[7rem] flex-1 sm:flex-none',
                    (!slugChanged || slugProbe.status !== 'available') && 'opacity-60',
                  )}
                  disabled={
                    slugBusy ||
                    slugProbe.status === 'checking' ||
                    !slugChanged ||
                    slugProbe.status !== 'available'
                  }
                  onClick={() => void guardarDominio()}
                >
                  {slugBusy ? 'Guardando…' : 'Guardar dominio'}
                </button>
                <button
                  type="button"
                  className="mc-btn-secondary min-w-[7rem] flex-1 sm:flex-none"
                  disabled={slugBusy}
                  onClick={cancelarDominio}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
