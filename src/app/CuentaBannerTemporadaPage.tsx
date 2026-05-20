import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  SEASON_BANNER_DEFAULTS,
  SEASON_BANNER_LIMITS,
  buildSeasonBannerForSave,
  sanitizeSeasonBannerFields,
  seasonBannerStoragePath,
} from '@/lib/seasonBanner'
import { SeasonBannerHero } from '@/public/SeasonBannerHero'
import type { McSeasonBanner, McTenant } from '@/types/mc'

function previewTenant(
  base: McTenant,
  draft: {
    enabled: boolean
    eyebrow: string
    headline: string
    subheadline: string
    ctaLabel: string
    imageUrl: string | null
  },
): McTenant {
  const fields = sanitizeSeasonBannerFields(draft)
  const banner: McSeasonBanner = {
    enabled: draft.enabled,
    ...fields,
    updatedAt: Date.now(),
    ...(draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
  }
  return { ...base, seasonBanner: banner }
}

export function CuentaBannerTemporadaPage() {
  const { profile, tenant } = useMcAuth()
  const expertAccess = hasExpertFeatureAccess(tenant)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [eyebrow, setEyebrow] = useState<string>(SEASON_BANNER_DEFAULTS.eyebrow)
  const [headline, setHeadline] = useState<string>(SEASON_BANNER_DEFAULTS.headline)
  const [subheadline, setSubheadline] = useState<string>(SEASON_BANNER_DEFAULTS.subheadline)
  const [ctaLabel, setCtaLabel] = useState<string>(SEASON_BANNER_DEFAULTS.ctaLabel)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  useEffect(() => {
    if (!tenant) return
    const b = tenant.seasonBanner
    setEnabled(b?.enabled === true)
    setEyebrow(b?.eyebrow ?? SEASON_BANNER_DEFAULTS.eyebrow)
    setHeadline(b?.headline ?? SEASON_BANNER_DEFAULTS.headline)
    setSubheadline(b?.subheadline ?? SEASON_BANNER_DEFAULTS.subheadline)
    setCtaLabel(b?.ctaLabel ?? SEASON_BANNER_DEFAULTS.ctaLabel)
    setImageUrl(b?.imageUrl ?? null)
  }, [tenant])

  const previewTenantData = useMemo(() => {
    if (!tenant) return null
    return previewTenant(tenant, {
      enabled,
      eyebrow,
      headline,
      subheadline,
      ctaLabel,
      imageUrl,
    })
  }, [tenant, enabled, eyebrow, headline, subheadline, ctaLabel, imageUrl])

  async function onPickImage(file: File | null) {
    if (!file || !profile?.tenantId || !expertAccess) return
    if (!firebaseStorageConfigured) {
      setMsg('Firebase Storage no está configurado.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const optimized = await compressImageForUpload(file, { maxEdgePx: 1600, jpegQuality: 0.86 })
      const storage = getStorageApp()
      const pathRef = ref(storage, seasonBannerStoragePath(profile.tenantId))
      await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
      const url = await getDownloadURL(pathRef)
      setImageUrl(url)
      setPreviewKey((k) => k + 1)
      setMsg('Imagen lista. Guardá para publicar en el catálogo.')
    } catch {
      setMsg('No se pudo subir la imagen.')
    } finally {
      setBusy(false)
    }
  }

  async function quitarImagen() {
    if (!profile?.tenantId) return
    setBusy(true)
    setMsg(null)
    try {
      if (firebaseStorageConfigured) {
        try {
          await deleteObject(ref(getStorageApp(), seasonBannerStoragePath(profile.tenantId)))
        } catch {
          /* archivo ya ausente */
        }
      }
      setImageUrl(null)
      setPreviewKey((k) => k + 1)
      setMsg('Imagen quitada. Guardá para aplicar en el catálogo.')
    } catch {
      setMsg('No se pudo quitar la imagen.')
    } finally {
      setBusy(false)
    }
  }

  async function guardar() {
    if (!profile?.tenantId || !tenant) return
    setBusy(true)
    setMsg(null)
    try {
      const fields = sanitizeSeasonBannerFields({ eyebrow, headline, subheadline, ctaLabel })
      const banner = buildSeasonBannerForSave(enabled, fields, imageUrl, tenant.seasonBanner)
      const hasPayload = enabled || banner.imageUrl || Object.keys(fields).length > 0
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        seasonBanner: hasPayload ? banner : deleteField(),
      })
      setPreviewKey((k) => k + 1)
      setMsg(enabled ? 'Banner publicado en tu catálogo.' : 'Banner desactivado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink />
        <h1 className="ios-large-title mt-3 inline-flex items-center gap-2">
          <ExpertStar />
          Banner de temporada
        </h1>
        <p className="ios-subhead mt-2 max-w-2xl leading-relaxed text-[var(--cat-muted)]">
          Pantalla completa al entrar al catálogo.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : !expertAccess ? (
        <div className="mc-card space-y-4">
          <p className="ios-subhead leading-relaxed text-[var(--cat-text)]">
            El banner de temporada es una función <strong className="font-medium">Expert</strong>.
          </p>
          <Link
            to="/app/plan"
            className="mc-btn-primary inline-flex w-full items-center justify-center py-3 text-[15px] no-underline"
          >
            Ver planes
          </Link>
        </div>
      ) : (
        <>
          <div className="mc-card space-y-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-neutral-300"
                checked={enabled}
                disabled={busy}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>
                <span className="ios-subhead font-medium text-[var(--cat-text)]">Mostrar banner al entrar</span>
                <span className="ios-footnote mt-1 block leading-relaxed text-[var(--cat-muted)]">
                  Opcional. Si está desactivado, no se muestra aunque tengas imagen guardada.
                </span>
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['Etiqueta superior', eyebrow, setEyebrow, SEASON_BANNER_LIMITS.eyebrow, SEASON_BANNER_DEFAULTS.eyebrow],
                  ['Título principal', headline, setHeadline, SEASON_BANNER_LIMITS.headline, SEASON_BANNER_DEFAULTS.headline],
                  ['Subtítulo', subheadline, setSubheadline, SEASON_BANNER_LIMITS.subheadline, SEASON_BANNER_DEFAULTS.subheadline],
                  ['Texto del botón', ctaLabel, setCtaLabel, SEASON_BANNER_LIMITS.ctaLabel, SEASON_BANNER_DEFAULTS.ctaLabel],
                ] as const
              ).map(([label, val, setVal, max, placeholder]) => (
                <div key={label} className={label === 'Subtítulo' ? 'sm:col-span-2' : ''}>
                  <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">{label}</label>
                  <input
                    className="mc-input mt-1"
                    value={val}
                    maxLength={max}
                    disabled={busy}
                    placeholder={placeholder}
                    onChange={(e) => setVal(e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Imagen de campaña
              </label>
              <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
                Vertical u horizontal, buena luz. Recomendado 1200×1600 px o más. Se optimiza al subir.
              </p>
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                className="mt-2 w-full text-[15px] text-mc-600 file:mr-3 file:rounded-md file:border file:border-neutral-200/70 file:bg-neutral-50 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-mc-900"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  e.target.value = ''
                  void onPickImage(f)
                }}
              />
              {imageUrl && (
                <button
                  type="button"
                  className="mc-btn-secondary mt-3 w-full py-2.5 text-[14px]"
                  disabled={busy}
                  onClick={() => void quitarImagen()}
                >
                  Quitar imagen
                </button>
              )}
            </div>

            {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
            <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
              Guardar banner
            </button>
          </div>

          {previewTenantData && (
            <div className="space-y-3">
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Vista previa</p>
              <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-neutral-100/50">
                <SeasonBannerHero key={previewKey} tenant={previewTenantData} preview />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
