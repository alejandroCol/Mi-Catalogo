import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { ExpertUpgradeSheet } from '@/components/billing/ExpertUpgradeSheet'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { SeasonBannerImagePicker } from '@/components/seasonBanner/SeasonBannerImagePicker'
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

const TEXT_FIELDS = [
  ['Etiqueta superior', 'eyebrow', SEASON_BANNER_LIMITS.eyebrow, SEASON_BANNER_DEFAULTS.eyebrow],
  ['Título principal', 'headline', SEASON_BANNER_LIMITS.headline, SEASON_BANNER_DEFAULTS.headline],
  ['Subtítulo', 'subheadline', SEASON_BANNER_LIMITS.subheadline, SEASON_BANNER_DEFAULTS.subheadline],
  ['Texto del botón', 'ctaLabel', SEASON_BANNER_LIMITS.ctaLabel, SEASON_BANNER_DEFAULTS.ctaLabel],
] as const

export function CuentaBannerTemporadaPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const expertAccess = hasExpertFeatureAccess(tenant)
  const [busy, setBusy] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [expertSheetOpen, setExpertSheetOpen] = useState(false)
  const { showSaveSuccess } = useSaveSuccess()
  const [enabled, setEnabled] = useState(false)
  const [eyebrow, setEyebrow] = useState<string>(SEASON_BANNER_DEFAULTS.eyebrow)
  const [headline, setHeadline] = useState<string>(SEASON_BANNER_DEFAULTS.headline)
  const [subheadline, setSubheadline] = useState<string>(SEASON_BANNER_DEFAULTS.subheadline)
  const [ctaLabel, setCtaLabel] = useState<string>(SEASON_BANNER_DEFAULTS.ctaLabel)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<string | null>(null)
  const [removeImagePending, setRemoveImagePending] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)

  const fieldSetters = {
    eyebrow: setEyebrow,
    headline: setHeadline,
    subheadline: setSubheadline,
    ctaLabel: setCtaLabel,
  } as const

  const fieldValues = { eyebrow, headline, subheadline, ctaLabel } as const

  useEffect(() => {
    if (!tenant) return
    const b = tenant.seasonBanner
    setEnabled(b?.enabled === true)
    setEyebrow(b?.eyebrow ?? SEASON_BANNER_DEFAULTS.eyebrow)
    setHeadline(b?.headline ?? SEASON_BANNER_DEFAULTS.headline)
    setSubheadline(b?.subheadline ?? SEASON_BANNER_DEFAULTS.subheadline)
    setCtaLabel(b?.ctaLabel ?? SEASON_BANNER_DEFAULTS.ctaLabel)
    setImageUrl(b?.imageUrl ?? null)
    setPendingImageFile(null)
    setRemoveImagePending(false)
    setLocalImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [tenant])

  useEffect(() => {
    return () => {
      if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl)
    }
  }, [localImagePreviewUrl])

  const displayImageUrl = removeImagePending ? null : (localImagePreviewUrl ?? imageUrl)

  const previewTenantData = useMemo(() => {
    if (!tenant) return null
    return previewTenant(tenant, {
      enabled,
      eyebrow,
      headline,
      subheadline,
      ctaLabel,
      imageUrl: displayImageUrl,
    })
  }, [tenant, enabled, eyebrow, headline, subheadline, ctaLabel, displayImageUrl])

  function onPickImage(file: File) {
    if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl)
    setLocalImagePreviewUrl(URL.createObjectURL(file))
    setPendingImageFile(file)
    setRemoveImagePending(false)
    setPreviewKey((k) => k + 1)
    setMsg('Imagen lista. Guardá para publicar en el catálogo.')
  }

  function quitarImagen() {
    if (localImagePreviewUrl) {
      URL.revokeObjectURL(localImagePreviewUrl)
      setLocalImagePreviewUrl(null)
    }
    setPendingImageFile(null)
    setRemoveImagePending(true)
    setPreviewKey((k) => k + 1)
    setMsg('Imagen quitada. Guardá para aplicar en el catálogo.')
  }

  async function guardar() {
    if (!effectiveTenantId || !tenant) return
    if (!expertAccess) {
      setExpertSheetOpen(true)
      return
    }

    setBusy(true)
    setMsg(null)
    try {
      let resolvedImageUrl = removeImagePending ? null : imageUrl

      if (pendingImageFile) {
        if (!firebaseStorageConfigured) {
          setMsg('Firebase Storage no está configurado.')
          return
        }
        setUploadingImage(true)
        const optimized = await compressImageForUpload(pendingImageFile, { maxEdgePx: 1600, jpegQuality: 0.86 })
        const storage = getStorageApp()
        const pathRef = ref(storage, seasonBannerStoragePath(effectiveTenantId))
        await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
        resolvedImageUrl = await getDownloadURL(pathRef)
        if (localImagePreviewUrl) {
          URL.revokeObjectURL(localImagePreviewUrl)
          setLocalImagePreviewUrl(null)
        }
        setPendingImageFile(null)
        setImageUrl(resolvedImageUrl)
        setRemoveImagePending(false)
      } else if (removeImagePending) {
        if (firebaseStorageConfigured) {
          try {
            await deleteObject(ref(getStorageApp(), seasonBannerStoragePath(effectiveTenantId)))
          } catch {
            /* archivo ya ausente */
          }
        }
        setImageUrl(null)
        setRemoveImagePending(false)
      }

      const fields = sanitizeSeasonBannerFields({ eyebrow, headline, subheadline, ctaLabel })
      const banner = buildSeasonBannerForSave(enabled, fields, resolvedImageUrl, tenant.seasonBanner)
      const hasPayload = enabled || banner.imageUrl || Object.keys(fields).length > 0
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        seasonBanner: hasPayload ? banner : deleteField(),
      })
      setPreviewKey((k) => k + 1)
      showSaveSuccess({
        title: enabled ? 'Banner publicado' : 'Banner desactivado',
        message: enabled
          ? 'Ya se muestra al entrar a tu catálogo público.'
          : 'El banner de temporada ya no aparece en el catálogo.',
      })
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
      setUploadingImage(false)
    }
  }

  const formDisabled = busy || uploadingImage

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} state={navState} />
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
      ) : (
        <>
          <div className="mc-card space-y-5">
            {!expertAccess && (
              <p className="ios-footnote border border-neutral-200/60 bg-neutral-50/50 px-3 py-2">
                <ExpertStar className="mr-1 inline" /> Función Expert —{' '}
                <Link to="/app/plan" className="font-medium underline">
                  activá tu plan
                </Link>{' '}
                para guardar.
              </p>
            )}

            <ProductoFormSection
              title="Visibilidad"
              description="Controlá si el banner aparece al abrir tu catálogo público."
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-neutral-300"
                  checked={enabled}
                  disabled={formDisabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span>
                  <span className="ios-subhead font-medium text-[var(--cat-text)]">Mostrar banner al entrar</span>
                  <span className="ios-footnote mt-1 block leading-relaxed text-[var(--cat-muted)]">
                    Si está desactivado, no se muestra aunque tengas imagen guardada.
                  </span>
                </span>
              </label>
            </ProductoFormSection>

            <ProductoFormSection
              title="Textos del banner"
              description="Personalizá los mensajes que aparecen sobre la imagen."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {TEXT_FIELDS.map(([label, key, max, placeholder]) => (
                  <div key={key} className={key === 'subheadline' ? 'sm:col-span-2' : ''}>
                    <label className="ios-footnote font-medium text-mc-800">{label}</label>
                    <input
                      className="mc-input mt-1"
                      value={fieldValues[key]}
                      maxLength={max}
                      disabled={formDisabled}
                      placeholder={placeholder}
                      onChange={(e) => fieldSetters[key](e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </ProductoFormSection>

            <ProductoFormSection
              title="Imagen de campaña"
              description="Foto de fondo a pantalla completa. Revisá las medidas recomendadas antes de subir."
            >
              <SeasonBannerImagePicker
                imageUrl={displayImageUrl}
                disabled={busy}
                uploading={uploadingImage}
                onPick={onPickImage}
                onRemove={() => quitarImagen()}
              />
            </ProductoFormSection>

            {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
            <button
              type="button"
              className="mc-btn-primary w-full"
              disabled={formDisabled}
              onClick={() => void guardar()}
            >
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

      <ExpertUpgradeSheet
        open={expertSheetOpen}
        onClose={() => setExpertSheetOpen(false)}
        title="Banner de temporada — Plan Expert"
      />
    </div>
  )
}
