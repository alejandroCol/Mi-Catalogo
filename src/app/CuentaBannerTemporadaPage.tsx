import { useEffect, useMemo, useState } from 'react'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { SeasonBannerMediaPicker } from '@/components/seasonBanner/SeasonBannerMediaPicker'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  SEASON_BANNER_DEFAULTS,
  SEASON_BANNER_LIMITS,
  buildSeasonBannerForSave,
  resolveSeasonBannerMediaType,
  sanitizeSeasonBannerFields,
  seasonBannerImageStoragePath,
  seasonBannerPosterStoragePath,
  seasonBannerVideoStoragePath,
} from '@/lib/seasonBanner'
import { prepareSeasonBannerVideo } from '@/lib/seasonBannerVideo'
import { uploadSeasonBannerFile } from '@/lib/uploadSeasonBannerFile'
import { SeasonBannerHero } from '@/public/SeasonBannerHero'
import type { McSeasonBanner, McSeasonBannerMediaType, McTenant } from '@/types/mc'

function previewTenant(
  base: McTenant,
  draft: {
    enabled: boolean
    mediaType: McSeasonBannerMediaType
    eyebrow: string
    headline: string
    subheadline: string
    ctaLabel: string
    imageUrl: string | null
    videoUrl: string | null
    posterUrl: string | null
  },
): McTenant {
  const fields = sanitizeSeasonBannerFields(draft)
  const banner: McSeasonBanner = {
    enabled: draft.enabled,
    mediaType: draft.mediaType,
    ...fields,
    updatedAt: Date.now(),
    ...(draft.mediaType === 'image' && draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
    ...(draft.mediaType === 'video' && draft.videoUrl
      ? {
          videoUrl: draft.videoUrl,
          ...(draft.posterUrl ? { posterUrl: draft.posterUrl } : {}),
        }
      : {}),
  }
  return { ...base, seasonBanner: banner }
}

const TEXT_FIELDS = [
  ['Etiqueta superior', 'eyebrow', SEASON_BANNER_LIMITS.eyebrow, SEASON_BANNER_DEFAULTS.eyebrow],
  ['Título principal', 'headline', SEASON_BANNER_LIMITS.headline, SEASON_BANNER_DEFAULTS.headline],
  ['Subtítulo', 'subheadline', SEASON_BANNER_LIMITS.subheadline, SEASON_BANNER_DEFAULTS.subheadline],
  ['Texto del botón', 'ctaLabel', SEASON_BANNER_LIMITS.ctaLabel, SEASON_BANNER_DEFAULTS.ctaLabel],
] as const

async function deleteStorageIfExists(path: string): Promise<void> {
  if (!firebaseStorageConfigured) return
  try {
    await deleteObject(ref(getStorageApp(), path))
  } catch {
    /* archivo ya ausente */
  }
}

export function CuentaBannerTemporadaPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const [busy, setBusy] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [processingVideo, setProcessingVideo] = useState(false)
  const [processingLabel, setProcessingLabel] = useState('')
  const [processingPercent, setProcessingPercent] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()
  const [enabled, setEnabled] = useState(false)
  const [mediaType, setMediaType] = useState<McSeasonBannerMediaType>('image')
  const [eyebrow, setEyebrow] = useState<string>(SEASON_BANNER_DEFAULTS.eyebrow)
  const [headline, setHeadline] = useState<string>(SEASON_BANNER_DEFAULTS.headline)
  const [subheadline, setSubheadline] = useState<string>(SEASON_BANNER_DEFAULTS.subheadline)
  const [ctaLabel, setCtaLabel] = useState<string>(SEASON_BANNER_DEFAULTS.ctaLabel)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null)
  const [pendingPosterFile, setPendingPosterFile] = useState<File | null>(null)
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<string | null>(null)
  const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState<string | null>(null)
  const [localPosterPreviewUrl, setLocalPosterPreviewUrl] = useState<string | null>(null)
  const [removeImagePending, setRemoveImagePending] = useState(false)
  const [removeVideoPending, setRemoveVideoPending] = useState(false)
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
    setMediaType(resolveSeasonBannerMediaType(b))
    setEyebrow(b?.eyebrow ?? SEASON_BANNER_DEFAULTS.eyebrow)
    setHeadline(b?.headline ?? SEASON_BANNER_DEFAULTS.headline)
    setSubheadline(b?.subheadline ?? SEASON_BANNER_DEFAULTS.subheadline)
    setCtaLabel(b?.ctaLabel ?? SEASON_BANNER_DEFAULTS.ctaLabel)
    setImageUrl(b?.imageUrl ?? null)
    setVideoUrl(b?.videoUrl ?? null)
    setPosterUrl(b?.posterUrl ?? null)
    setPendingImageFile(null)
    setPendingVideoFile(null)
    setPendingPosterFile(null)
    setRemoveImagePending(false)
    setRemoveVideoPending(false)
    setVideoError(null)
    setLocalImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setLocalVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setLocalPosterPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [tenant])

  useEffect(() => {
    return () => {
      if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl)
      if (localVideoPreviewUrl) URL.revokeObjectURL(localVideoPreviewUrl)
      if (localPosterPreviewUrl) URL.revokeObjectURL(localPosterPreviewUrl)
    }
  }, [localImagePreviewUrl, localVideoPreviewUrl, localPosterPreviewUrl])

  const displayImageUrl = removeImagePending ? null : (localImagePreviewUrl ?? imageUrl)
  const displayVideoUrl = removeVideoPending ? null : (localVideoPreviewUrl ?? videoUrl)
  const displayPosterUrl = removeVideoPending ? null : (localPosterPreviewUrl ?? posterUrl)

  const previewTenantData = useMemo(() => {
    if (!tenant) return null
    return previewTenant(tenant, {
      enabled,
      mediaType,
      eyebrow,
      headline,
      subheadline,
      ctaLabel,
      imageUrl: displayImageUrl,
      videoUrl: displayVideoUrl,
      posterUrl: displayPosterUrl,
    })
  }, [
    tenant,
    enabled,
    mediaType,
    eyebrow,
    headline,
    subheadline,
    ctaLabel,
    displayImageUrl,
    displayVideoUrl,
    displayPosterUrl,
  ])

  function onPickImage(file: File) {
    if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl)
    setLocalImagePreviewUrl(URL.createObjectURL(file))
    setPendingImageFile(file)
    setRemoveImagePending(false)
    setPreviewKey((k) => k + 1)
    setMsg('Imagen lista. Guardá para publicar en el catálogo.')
    setVideoError(null)
  }

  async function onPickVideo(file: File) {
    setVideoError(null)
    setProcessingVideo(true)
    setProcessingLabel('Analizando video…')
    setProcessingPercent(5)
    try {
      const prepared = await prepareSeasonBannerVideo(file, (progress) => {
        setProcessingLabel(progress.label)
        setProcessingPercent(progress.percent)
      })

      if (localVideoPreviewUrl) URL.revokeObjectURL(localVideoPreviewUrl)
      if (localPosterPreviewUrl) URL.revokeObjectURL(localPosterPreviewUrl)

      setLocalVideoPreviewUrl(URL.createObjectURL(prepared.video))
      setLocalPosterPreviewUrl(URL.createObjectURL(prepared.poster))
      setPendingVideoFile(prepared.video)
      setPendingPosterFile(prepared.poster)
      setRemoveVideoPending(false)
      setPreviewKey((k) => k + 1)
      setMsg(
        prepared.optimized
          ? 'Video optimizado y listo. Guardá para publicar en el catálogo.'
          : 'Video listo. Guardá para publicar en el catálogo.',
      )
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'No se pudo procesar el video.')
    } finally {
      setProcessingVideo(false)
      setProcessingLabel('')
      setProcessingPercent(0)
    }
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

  function quitarVideo() {
    if (localVideoPreviewUrl) {
      URL.revokeObjectURL(localVideoPreviewUrl)
      setLocalVideoPreviewUrl(null)
    }
    if (localPosterPreviewUrl) {
      URL.revokeObjectURL(localPosterPreviewUrl)
      setLocalPosterPreviewUrl(null)
    }
    setPendingVideoFile(null)
    setPendingPosterFile(null)
    setRemoveVideoPending(true)
    setPreviewKey((k) => k + 1)
    setVideoError(null)
    setMsg('Video quitado. Guardá para aplicar en el catálogo.')
  }

  async function guardar() {
    if (!effectiveTenantId || !tenant) return
    setBusy(true)
    setMsg(null)
    try {
      let resolvedImageUrl: string | null | undefined = removeImagePending ? null : imageUrl
      let resolvedVideoUrl: string | null | undefined = removeVideoPending ? null : videoUrl
      let resolvedPosterUrl: string | null | undefined = removeVideoPending ? null : posterUrl

      if (mediaType === 'image' && pendingImageFile) {
        if (!firebaseStorageConfigured) {
          setMsg('Firebase Storage no está configurado.')
          return
        }
        setUploadingMedia(true)
        const optimized = await compressImageForUpload(pendingImageFile, { maxEdgePx: 1600, jpegQuality: 0.86 })
        resolvedImageUrl = await uploadSeasonBannerFile(
          seasonBannerImageStoragePath(effectiveTenantId),
          optimized,
          'image/jpeg',
        )
        if (localImagePreviewUrl) {
          URL.revokeObjectURL(localImagePreviewUrl)
          setLocalImagePreviewUrl(null)
        }
        setPendingImageFile(null)
        setImageUrl(resolvedImageUrl)
        setRemoveImagePending(false)
      } else if (mediaType === 'image' && removeImagePending) {
        await deleteStorageIfExists(seasonBannerImageStoragePath(effectiveTenantId))
        setImageUrl(null)
        setRemoveImagePending(false)
      }

      if (mediaType === 'video' && pendingVideoFile && pendingPosterFile) {
        if (!firebaseStorageConfigured) {
          setMsg('Firebase Storage no está configurado.')
          return
        }
        setUploadingMedia(true)
        resolvedVideoUrl = await uploadSeasonBannerFile(
          seasonBannerVideoStoragePath(effectiveTenantId),
          pendingVideoFile,
          'video/mp4',
          (pct) => setProcessingPercent(pct),
        )
        resolvedPosterUrl = await uploadSeasonBannerFile(
          seasonBannerPosterStoragePath(effectiveTenantId),
          pendingPosterFile,
          'image/jpeg',
        )
        if (localVideoPreviewUrl) {
          URL.revokeObjectURL(localVideoPreviewUrl)
          setLocalVideoPreviewUrl(null)
        }
        if (localPosterPreviewUrl) {
          URL.revokeObjectURL(localPosterPreviewUrl)
          setLocalPosterPreviewUrl(null)
        }
        setPendingVideoFile(null)
        setPendingPosterFile(null)
        setVideoUrl(resolvedVideoUrl)
        setPosterUrl(resolvedPosterUrl)
        setRemoveVideoPending(false)
      } else if (mediaType === 'video' && removeVideoPending) {
        await deleteStorageIfExists(seasonBannerVideoStoragePath(effectiveTenantId))
        await deleteStorageIfExists(seasonBannerPosterStoragePath(effectiveTenantId))
        setVideoUrl(null)
        setPosterUrl(null)
        setRemoveVideoPending(false)
      }

      const fields = sanitizeSeasonBannerFields({ eyebrow, headline, subheadline, ctaLabel })
      const banner = buildSeasonBannerForSave(
        enabled,
        fields,
        {
          mediaType,
          imageUrl: mediaType === 'image' ? resolvedImageUrl : null,
          videoUrl: mediaType === 'video' ? resolvedVideoUrl : null,
          posterUrl: mediaType === 'video' ? resolvedPosterUrl : null,
        },
        tenant.seasonBanner,
      )

      if (mediaType === 'video') {
        await deleteStorageIfExists(seasonBannerImageStoragePath(effectiveTenantId))
      } else {
        await deleteStorageIfExists(seasonBannerVideoStoragePath(effectiveTenantId))
        await deleteStorageIfExists(seasonBannerPosterStoragePath(effectiveTenantId))
      }

      const hasMedia =
        mediaType === 'video'
          ? Boolean(banner.videoUrl)
          : Boolean(banner.imageUrl)
      const hasPayload = enabled || hasMedia || Object.keys(fields).length > 0

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
      setUploadingMedia(false)
      setProcessingPercent(0)
    }
  }

  const formDisabled = busy || uploadingMedia || processingVideo

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} state={navState} />
        <h1 className="ios-large-title mt-3">Banner de temporada</h1>
        <p className="ios-subhead mt-2 max-w-2xl leading-relaxed text-[var(--cat-muted)]">
          Pantalla completa al entrar al catálogo. Elegí una foto o un video corto en loop.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : (
        <>
          <div className="mc-card space-y-5">
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
                    Si está desactivado, no se muestra aunque tengas contenido guardado.
                  </span>
                </span>
              </label>
            </ProductoFormSection>

            <ProductoFormSection
              title="Textos del banner"
              description="Personalizá los mensajes que aparecen sobre el fondo."
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
              title="Fondo del banner"
              description="Foto estática o video corto. El video se optimiza automáticamente al subir."
            >
              <SeasonBannerMediaPicker
                mediaType={mediaType}
                imageUrl={displayImageUrl}
                videoUrl={displayVideoUrl}
                posterUrl={displayPosterUrl}
                disabled={busy}
                uploading={uploadingMedia}
                processing={processingVideo}
                processingLabel={processingLabel}
                processingPercent={processingPercent}
                error={videoError}
                onMediaTypeChange={(type) => {
                  setMediaType(type)
                  setPreviewKey((k) => k + 1)
                  setVideoError(null)
                }}
                onPickImage={onPickImage}
                onPickVideo={(file) => void onPickVideo(file)}
                onRemoveImage={quitarImagen}
                onRemoveVideo={quitarVideo}
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
    </div>
  )
}
