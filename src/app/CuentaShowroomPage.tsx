import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { collection, deleteField, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { CatalogFontPickerGrid } from '@/app/CatalogFontPickerGrid'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import { SeasonBannerMediaPicker } from '@/components/seasonBanner/SeasonBannerMediaPicker'
import { ShowroomProductPicker } from '@/components/showroom/ShowroomProductPicker'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import {
  SHOWROOM_DEFAULTS,
  SHOWROOM_HOME_LAYOUTS,
  SHOWROOM_LIMITS,
  SHOWROOM_MOODS,
  buildCollectionShowroomForSave,
  datetimeLocalValueToMs,
  isShowroomDropLocked,
  msToDatetimeLocalValue,
  normalizeShowroomHomeFontId,
  normalizeShowroomHomeFullWidth,
  normalizeShowroomHomeLayout,
  resolveShowroomMediaType,
  sanitizeShowroomTextFields,
  showroomTeaserImageStoragePath,
  showroomTeaserPosterStoragePath,
  showroomTeaserVideoStoragePath,
} from '@/lib/collectionShowroom'
import { ShowroomEntranceView } from '@/public/showroom/ShowroomEntranceCard'
import { firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { MC, mcProductosCollection } from '@/lib/mcCollections'
import { prepareSeasonBannerVideo } from '@/lib/seasonBannerVideo'
import { uploadSeasonBannerFile } from '@/lib/uploadSeasonBannerFile'
import type {
  McCatalogFontId,
  McCollectionShowroom,
  McProducto,
  McSeasonBannerMediaType,
  McShowroomHomeLayout,
  McShowroomMood,
} from '@/types/mc'

async function deleteStorageIfExists(path: string): Promise<void> {
  if (!firebaseStorageConfigured) return
  try {
    await deleteObject(ref(getStorageApp(), path))
  } catch {
    /* ausente */
  }
}

export function CuentaShowroomPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const { showSaveSuccess } = useSaveSuccess()

  const [busy, setBusy] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [processingVideo, setProcessingVideo] = useState(false)
  const [processingLabel, setProcessingLabel] = useState('')
  const [processingPercent, setProcessingPercent] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [dropLocal, setDropLocal] = useState('')
  const [waitlistEnabled, setWaitlistEnabled] = useState(true)
  const [showStockLeft, setShowStockLeft] = useState(true)
  const [mood, setMood] = useState<McShowroomMood>(SHOWROOM_DEFAULTS.mood)
  const [mediaType, setMediaType] = useState<McSeasonBannerMediaType>('image')

  const [teaserEyebrow, setTeaserEyebrow] = useState<string>(SHOWROOM_DEFAULTS.teaserEyebrow)
  const [teaserHeadline, setTeaserHeadline] = useState<string>(SHOWROOM_DEFAULTS.teaserHeadline)
  const [teaserSubheadline, setTeaserSubheadline] = useState<string>(SHOWROOM_DEFAULTS.teaserSubheadline)
  const [teaserCtaLabel, setTeaserCtaLabel] = useState<string>(SHOWROOM_DEFAULTS.teaserCtaLabel)
  const [collectionTitle, setCollectionTitle] = useState<string>(SHOWROOM_DEFAULTS.collectionTitle)
  const [collectionSubtitle, setCollectionSubtitle] = useState<string>(SHOWROOM_DEFAULTS.collectionSubtitle)
  const [homeEyebrow, setHomeEyebrow] = useState<string>(SHOWROOM_DEFAULTS.homeEyebrow)
  const [homeHeadline, setHomeHeadline] = useState<string>(SHOWROOM_DEFAULTS.homeHeadline)
  const [homeSubheadline, setHomeSubheadline] = useState<string>(SHOWROOM_DEFAULTS.homeSubheadline)
  const [homeCtaLabel, setHomeCtaLabel] = useState<string>(SHOWROOM_DEFAULTS.homeCtaLabel)
  const [homeLayout, setHomeLayout] = useState<McShowroomHomeLayout>(SHOWROOM_DEFAULTS.homeLayout)
  const [homeFontId, setHomeFontId] = useState<McCatalogFontId>(SHOWROOM_DEFAULTS.homeFontId)
  const [homeFullWidth, setHomeFullWidth] = useState<boolean>(SHOWROOM_DEFAULTS.homeFullWidth)
  const [atelierHeadline, setAtelierHeadline] = useState<string>(SHOWROOM_DEFAULTS.atelierHeadline)
  const [atelierSubheadline, setAtelierSubheadline] = useState<string>(SHOWROOM_DEFAULTS.atelierSubheadline)

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

  const [productIds, setProductIds] = useState<string[]>([])
  const [atelierProductIds, setAtelierProductIds] = useState<string[]>([])
  const [products, setProducts] = useState<McProducto[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  useEffect(() => {
    if (!tenant) return
    const s = tenant.collectionShowroom
    setEnabled(s?.enabled === true)
    setDropLocal(msToDatetimeLocalValue(s?.dropAtMs))
    setWaitlistEnabled(s?.waitlistEnabled !== false)
    setShowStockLeft(s?.showStockLeft !== false)
    setMood(s?.mood ?? SHOWROOM_DEFAULTS.mood)
    setMediaType(resolveShowroomMediaType(s))
    setTeaserEyebrow(s?.teaserEyebrow ?? SHOWROOM_DEFAULTS.teaserEyebrow)
    setTeaserHeadline(s?.teaserHeadline ?? SHOWROOM_DEFAULTS.teaserHeadline)
    setTeaserSubheadline(s?.teaserSubheadline ?? SHOWROOM_DEFAULTS.teaserSubheadline)
    setTeaserCtaLabel(s?.teaserCtaLabel ?? SHOWROOM_DEFAULTS.teaserCtaLabel)
    setCollectionTitle(s?.collectionTitle ?? SHOWROOM_DEFAULTS.collectionTitle)
    setCollectionSubtitle(s?.collectionSubtitle ?? SHOWROOM_DEFAULTS.collectionSubtitle)
    setHomeEyebrow(s?.homeEyebrow ?? SHOWROOM_DEFAULTS.homeEyebrow)
    setHomeHeadline(s?.homeHeadline ?? SHOWROOM_DEFAULTS.homeHeadline)
    setHomeSubheadline(s?.homeSubheadline ?? SHOWROOM_DEFAULTS.homeSubheadline)
    setHomeCtaLabel(s?.homeCtaLabel ?? SHOWROOM_DEFAULTS.homeCtaLabel)
    setHomeLayout(normalizeShowroomHomeLayout(s?.homeLayout))
    setHomeFontId(normalizeShowroomHomeFontId(s?.homeFontId))
    setHomeFullWidth(normalizeShowroomHomeFullWidth(s?.homeFullWidth))
    setAtelierHeadline(s?.atelierHeadline ?? SHOWROOM_DEFAULTS.atelierHeadline)
    setAtelierSubheadline(s?.atelierSubheadline ?? SHOWROOM_DEFAULTS.atelierSubheadline)
    setImageUrl(s?.teaserImageUrl ?? null)
    setVideoUrl(s?.teaserVideoUrl ?? null)
    setPosterUrl(s?.teaserPosterUrl ?? null)
    setProductIds(s?.productIds ?? [])
    setAtelierProductIds(s?.atelierProductIds ?? [])
    setPendingImageFile(null)
    setPendingVideoFile(null)
    setPendingPosterFile(null)
    setRemoveImagePending(false)
    setRemoveVideoPending(false)
  }, [tenant])

  useEffect(() => {
    if (!effectiveTenantId) return
    setProductsLoading(true)
    const q = query(
      collection(getDb(), mcProductosCollection(effectiveTenantId)),
      where('activo', '==', true),
      where('enCatalogo', '==', true),
      orderBy('orden', 'asc'),
    )
    return onSnapshot(
      q,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
        setProductsLoading(false)
      },
      () => setProductsLoading(false),
    )
  }, [effectiveTenantId])

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
  const formDisabled = busy || uploadingMedia || processingVideo

  const dropHint = useMemo(() => {
    const ms = datetimeLocalValueToMs(dropLocal)
    if (ms == null) return 'Sin fecha: el pasillo queda abierto de inmediato.'
    if (ms > Date.now()) return 'Antes de esa hora los clientes ven el Drop Room cerrado.'
    return 'La fecha ya pasó: el pasillo aparece abierto.'
  }, [dropLocal])

  const entrancePreviewShowroom = useMemo((): McCollectionShowroom => {
    return {
      enabled: true,
      mood,
      dropAtMs: datetimeLocalValueToMs(dropLocal) ?? undefined,
      teaserMediaType: mediaType,
      ...(mediaType === 'video'
        ? {
            ...(displayVideoUrl ? { teaserVideoUrl: displayVideoUrl } : {}),
            ...(displayPosterUrl ? { teaserPosterUrl: displayPosterUrl } : {}),
          }
        : displayImageUrl
          ? { teaserImageUrl: displayImageUrl }
          : {}),
      teaserEyebrow,
      teaserHeadline,
      teaserSubheadline,
      teaserCtaLabel,
      collectionTitle,
      collectionSubtitle,
      homeEyebrow,
      homeHeadline,
      homeSubheadline,
      homeCtaLabel,
      homeLayout,
      homeFontId,
      homeFullWidth,
    }
  }, [
    mood,
    dropLocal,
    mediaType,
    displayImageUrl,
    displayVideoUrl,
    displayPosterUrl,
    teaserEyebrow,
    teaserHeadline,
    teaserSubheadline,
    teaserCtaLabel,
    collectionTitle,
    collectionSubtitle,
    homeEyebrow,
    homeHeadline,
    homeSubheadline,
    homeCtaLabel,
    homeLayout,
    homeFontId,
    homeFullWidth,
  ])

  function onPickImage(file: File) {
    if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl)
    setLocalImagePreviewUrl(URL.createObjectURL(file))
    setPendingImageFile(file)
    setRemoveImagePending(false)
    setMsg('Imagen lista. Guardá para publicar.')
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
      setMsg('Video listo. Guardá para publicar.')
    } catch (e) {
      setVideoError(e instanceof Error ? e.message : 'No se pudo procesar el video.')
    } finally {
      setProcessingVideo(false)
      setProcessingPercent(0)
    }
  }

  async function guardar() {
    if (!tenant || !effectiveTenantId) return
    if (enabled && productIds.length === 0) {
      setMsg('Elegí al menos un producto para el pasillo.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      let resolvedImageUrl = removeImagePending ? null : imageUrl
      let resolvedVideoUrl = removeVideoPending ? null : videoUrl
      let resolvedPosterUrl = removeVideoPending ? null : posterUrl

      if (mediaType === 'image' && pendingImageFile) {
        setUploadingMedia(true)
        const compressed = await compressImageForUpload(pendingImageFile)
        resolvedImageUrl = await uploadSeasonBannerFile(
          showroomTeaserImageStoragePath(effectiveTenantId),
          compressed,
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
        await deleteStorageIfExists(showroomTeaserImageStoragePath(effectiveTenantId))
        setImageUrl(null)
        setRemoveImagePending(false)
      }

      if (mediaType === 'video' && pendingVideoFile && pendingPosterFile) {
        setUploadingMedia(true)
        resolvedVideoUrl = await uploadSeasonBannerFile(
          showroomTeaserVideoStoragePath(effectiveTenantId),
          pendingVideoFile,
          'video/mp4',
          (pct) => setProcessingPercent(pct),
        )
        resolvedPosterUrl = await uploadSeasonBannerFile(
          showroomTeaserPosterStoragePath(effectiveTenantId),
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
        await deleteStorageIfExists(showroomTeaserVideoStoragePath(effectiveTenantId))
        await deleteStorageIfExists(showroomTeaserPosterStoragePath(effectiveTenantId))
        setVideoUrl(null)
        setPosterUrl(null)
        setRemoveVideoPending(false)
      }

      if (mediaType === 'video') {
        await deleteStorageIfExists(showroomTeaserImageStoragePath(effectiveTenantId))
      } else {
        await deleteStorageIfExists(showroomTeaserVideoStoragePath(effectiveTenantId))
        await deleteStorageIfExists(showroomTeaserPosterStoragePath(effectiveTenantId))
      }

      const fields = sanitizeShowroomTextFields({
        teaserEyebrow,
        teaserHeadline,
        teaserSubheadline,
        teaserCtaLabel,
        collectionTitle,
        collectionSubtitle,
        homeEyebrow,
        homeHeadline,
        homeSubheadline,
        homeCtaLabel,
        atelierHeadline,
        atelierSubheadline,
      })

      const showroom = buildCollectionShowroomForSave({
        enabled,
        dropAtMs: datetimeLocalValueToMs(dropLocal),
        mood,
        showStockLeft,
        waitlistEnabled,
        productIds,
        atelierProductIds,
        homeLayout,
        homeFontId,
        homeFullWidth,
        fields,
        media: {
          mediaType,
          imageUrl: mediaType === 'image' ? resolvedImageUrl : null,
          videoUrl: mediaType === 'video' ? resolvedVideoUrl : null,
          posterUrl: mediaType === 'video' ? resolvedPosterUrl : null,
        },
        previous: tenant.collectionShowroom,
      })

      const hasPayload =
        enabled ||
        productIds.length > 0 ||
        Boolean(showroom.teaserImageUrl || showroom.teaserVideoUrl) ||
        Object.keys(fields).length > 0

      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        collectionShowroom: hasPayload ? showroom : deleteField(),
      })

      showSaveSuccess({
        title: enabled ? 'Showroom publicado' : 'Showroom desactivado',
        message: enabled
          ? 'Tus clientes pueden entrar desde el catálogo a /coleccion.'
          : 'El Drop Room y el pasillo ya no aparecen en tu tienda.',
      })
    } catch {
      setMsg('No se pudo guardar. Verificá que tu plan Expert esté activo.')
    } finally {
      setBusy(false)
      setUploadingMedia(false)
      setProcessingPercent(0)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} state={navState} />
        <h1 className="ios-large-title mt-3">Drop Room + Pasillo</h1>
        <p className="ios-subhead mt-2 max-w-2xl leading-relaxed text-[var(--cat-muted)]">
          Experiencia Expert: sala cerrada con cuenta regresiva y un pasillo inmersivo para presentar
          la colección. Pensado para celular.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : (
        <div className="space-y-4">
          <div className="mc-card space-y-5">
            <ProductoFormSection
              title="1. Activar"
              description="Cuando está activo, aparece la entrada en tu catálogo público."
            >
              <McToggleSwitch
                id="showroom-enabled"
                checked={enabled}
                onChange={setEnabled}
                disabled={formDisabled}
                label="Mostrar Drop Room / Pasillo"
                description="Si está apagado, nadie ve la experiencia en el catálogo."
              />
            </ProductoFormSection>

            <ProductoFormSection
              title="2. Banner en el catálogo"
              description="Texto, forma del banner, ancho completo y tipografía. Lo que ven en el home antes de entrar."
            >
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['Etiqueta', homeEyebrow, setHomeEyebrow, SHOWROOM_LIMITS.homeEyebrow],
                      ['Título', homeHeadline, setHomeHeadline, SHOWROOM_LIMITS.homeHeadline],
                      [
                        'Subtítulo',
                        homeSubheadline,
                        setHomeSubheadline,
                        SHOWROOM_LIMITS.homeSubheadline,
                      ],
                      ['Botón', homeCtaLabel, setHomeCtaLabel, SHOWROOM_LIMITS.homeCtaLabel],
                    ] as const
                  ).map(([label, value, setter, max]) => (
                    <div key={label} className={label === 'Subtítulo' ? 'sm:col-span-2' : ''}>
                      <label className="ios-footnote font-medium text-mc-800">{label}</label>
                      <input
                        className="mc-input mt-1"
                        value={value}
                        maxLength={max}
                        disabled={formDisabled}
                        onChange={(e) => setter(e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <p className="ios-footnote mb-2 font-medium text-[var(--cat-text)] opacity-80">
                    Estilo del banner
                  </p>
                  <div
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    role="radiogroup"
                    aria-label="Estilo del banner"
                  >
                    {SHOWROOM_HOME_LAYOUTS.map((opt) => {
                      const selected = homeLayout === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={formDisabled}
                          onClick={() => setHomeLayout(opt.id)}
                          className={clsx(
                            'flex flex-col overflow-hidden rounded-xl border text-left transition',
                            selected
                              ? 'border-[var(--cat-accent)] ring-2 ring-[color-mix(in_srgb,var(--cat-accent)_28%,transparent)]'
                              : 'border-neutral-200/70 hover:border-neutral-300',
                            formDisabled && 'pointer-events-none opacity-60',
                          )}
                        >
                          <span
                            className={clsx(
                              'relative block bg-neutral-800',
                              opt.id === 'center' && 'h-16',
                              opt.id === 'bottom' && 'h-11',
                              (opt.id === 'editorial' || opt.id === 'panel') && 'h-14',
                            )}
                            aria-hidden
                            style={{
                              backgroundImage:
                                'linear-gradient(135deg, #2a241c 0%, #12100d 55%, #1a1612 100%)',
                            }}
                          >
                            <span
                              className={clsx(
                                'absolute bg-[rgba(246,241,232,0.88)]',
                                opt.id === 'editorial' && 'bottom-2 left-2 h-6 w-8 rounded-[2px]',
                                opt.id === 'center' &&
                                  'left-1/2 top-1/2 h-6 w-9 -translate-x-1/2 -translate-y-1/2 rounded-[2px]',
                                opt.id === 'panel' && 'bottom-0 left-0 top-0 w-[38%] rounded-none',
                                opt.id === 'bottom' &&
                                  'bottom-0 left-0 right-0 h-[42%] rounded-none',
                              )}
                            />
                          </span>
                          <span className="px-2.5 py-2">
                            <span className="block text-[13px] font-semibold text-[var(--cat-text)]">
                              {opt.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-[var(--cat-muted)]">
                              {opt.description}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <McToggleSwitch
                  id="showroom-home-full-width"
                  checked={homeFullWidth}
                  onChange={setHomeFullWidth}
                  disabled={formDisabled}
                  label="Ancho completo"
                  description="El banner va de borde a borde, sin márgenes laterales del catálogo."
                />

                <div>
                  <p className="ios-footnote mb-2 font-medium text-[var(--cat-text)] opacity-80">
                    Fuente del showroom
                  </p>
                  <p className="mb-2 text-[12px] leading-relaxed text-[var(--cat-muted)]">
                    Se usa en el banner, el Drop Room y el pasillo.
                  </p>
                  <CatalogFontPickerGrid
                    value={homeFontId}
                    onChange={setHomeFontId}
                    disabled={formDisabled}
                  />
                </div>

                <div>
                  <p className="ios-footnote mb-2 font-medium text-[var(--cat-text)] opacity-80">
                    Vista previa del banner en el home
                  </p>
                  <div className="overflow-hidden bg-neutral-950">
                    <ShowroomEntranceView
                      showroom={entrancePreviewShowroom}
                      locked={isShowroomDropLocked(entrancePreviewShowroom)}
                      preview
                    />
                  </div>
                  <p className="ios-footnote mt-2 text-[var(--cat-muted)]">
                    Usa la misma foto/video del Drop Room (paso 3). Guardá para publicarlo en tu
                    tienda.
                  </p>
                </div>
              </div>
            </ProductoFormSection>

            <ProductoFormSection
              title="3. Drop Room"
              description="Programá la apertura. Antes de esa hora: sala cerrada + lista de espera."
            >
              <div className="space-y-4">
                <div>
                  <label className="ios-footnote font-medium text-mc-800">Apertura del drop</label>
                  <input
                    type="datetime-local"
                    className="mc-input mt-1"
                    value={dropLocal}
                    disabled={formDisabled}
                    onChange={(e) => setDropLocal(e.target.value)}
                  />
                  <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">{dropHint}</p>
                  {dropLocal ? (
                    <button
                      type="button"
                      className="mt-2 text-[13px] font-medium text-[var(--cat-accent)]"
                      disabled={formDisabled}
                      onClick={() => setDropLocal('')}
                    >
                      Quitar fecha (abrir ya)
                    </button>
                  ) : null}
                </div>

                <McToggleSwitch
                  id="showroom-waitlist"
                  checked={waitlistEnabled}
                  onChange={setWaitlistEnabled}
                  disabled={formDisabled}
                  label="Lista de espera"
                  description="Los clientes dejan su correo mientras la puerta está cerrada."
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ['Etiqueta', teaserEyebrow, setTeaserEyebrow, SHOWROOM_LIMITS.teaserEyebrow],
                      ['Título', teaserHeadline, setTeaserHeadline, SHOWROOM_LIMITS.teaserHeadline],
                      [
                        'Subtítulo',
                        teaserSubheadline,
                        setTeaserSubheadline,
                        SHOWROOM_LIMITS.teaserSubheadline,
                      ],
                      ['Botón', teaserCtaLabel, setTeaserCtaLabel, SHOWROOM_LIMITS.teaserCtaLabel],
                    ] as const
                  ).map(([label, value, setter, max]) => (
                    <div key={label} className={label === 'Subtítulo' ? 'sm:col-span-2' : ''}>
                      <label className="ios-footnote font-medium text-mc-800">{label}</label>
                      <input
                        className="mc-input mt-1"
                        value={value}
                        maxLength={max}
                        disabled={formDisabled}
                        onChange={(e) => setter(e.target.value)}
                      />
                    </div>
                  ))}
                </div>

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
                    setVideoError(null)
                  }}
                  onPickImage={onPickImage}
                  onPickVideo={(file) => void onPickVideo(file)}
                  onRemoveImage={() => {
                    setRemoveImagePending(true)
                    setPendingImageFile(null)
                    if (localImagePreviewUrl) {
                      URL.revokeObjectURL(localImagePreviewUrl)
                      setLocalImagePreviewUrl(null)
                    }
                  }}
                  onRemoveVideo={() => {
                    setRemoveVideoPending(true)
                    setPendingVideoFile(null)
                    setPendingPosterFile(null)
                    if (localVideoPreviewUrl) {
                      URL.revokeObjectURL(localVideoPreviewUrl)
                      setLocalVideoPreviewUrl(null)
                    }
                    if (localPosterPreviewUrl) {
                      URL.revokeObjectURL(localPosterPreviewUrl)
                      setLocalPosterPreviewUrl(null)
                    }
                  }}
                />
              </div>
            </ProductoFormSection>

            <ProductoFormSection
              title="4. Pasillo"
              description="Los productos aparecen como vitrinas. El orden es el recorrido."
            >
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="ios-footnote font-medium text-mc-800">Título del pasillo</label>
                    <input
                      className="mc-input mt-1"
                      value={collectionTitle}
                      maxLength={SHOWROOM_LIMITS.collectionTitle}
                      disabled={formDisabled}
                      onChange={(e) => setCollectionTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="ios-footnote font-medium text-mc-800">Atmósfera</label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {SHOWROOM_MOODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          disabled={formDisabled}
                          onClick={() => setMood(m.id)}
                          className={`rounded-xl border px-3 py-2.5 text-left transition ${
                            mood === m.id
                              ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_10%,white)]'
                              : 'border-neutral-200/80 bg-white/80'
                          }`}
                        >
                          <span className="block text-[13px] font-medium text-[var(--cat-text)]">
                            {m.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--cat-muted)]">
                            {m.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="ios-footnote font-medium text-mc-800">Subtítulo</label>
                    <input
                      className="mc-input mt-1"
                      value={collectionSubtitle}
                      maxLength={SHOWROOM_LIMITS.collectionSubtitle}
                      disabled={formDisabled}
                      onChange={(e) => setCollectionSubtitle(e.target.value)}
                    />
                  </div>
                </div>

                <McToggleSwitch
                  id="showroom-stock"
                  checked={showStockLeft}
                  onChange={setShowStockLeft}
                  disabled={formDisabled}
                  label="Mostrar stock limitado"
                  description="Ej. «Quedan 3» en cada vitrina del pasillo."
                />

                <ShowroomProductPicker
                  products={products}
                  selectedIds={productIds}
                  onChange={setProductIds}
                  max={SHOWROOM_LIMITS.maxProducts}
                  loading={productsLoading}
                  label="en el pasillo"
                />
              </div>
            </ProductoFormSection>

            <ProductoFormSection
              title="5. Atelier (final del pasillo)"
              description="Cierre con el look completo. Podés elegir otras piezas o repetir."
            >
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="ios-footnote font-medium text-mc-800">Título atelier</label>
                    <input
                      className="mc-input mt-1"
                      value={atelierHeadline}
                      maxLength={SHOWROOM_LIMITS.atelierHeadline}
                      disabled={formDisabled}
                      onChange={(e) => setAtelierHeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="ios-footnote font-medium text-mc-800">Subtítulo</label>
                    <input
                      className="mc-input mt-1"
                      value={atelierSubheadline}
                      maxLength={SHOWROOM_LIMITS.atelierSubheadline}
                      disabled={formDisabled}
                      onChange={(e) => setAtelierSubheadline(e.target.value)}
                    />
                  </div>
                </div>
                <ShowroomProductPicker
                  products={products}
                  selectedIds={atelierProductIds}
                  onChange={setAtelierProductIds}
                  max={SHOWROOM_LIMITS.maxAtelier}
                  loading={productsLoading}
                  label="en el atelier"
                />
              </div>
            </ProductoFormSection>

            {msg ? <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p> : null}

            <button
              type="button"
              className="mc-btn-primary w-full"
              disabled={formDisabled}
              onClick={() => void guardar()}
            >
              Guardar showroom
            </button>
          </div>

          <div className="rounded-2xl border border-neutral-200/70 bg-[var(--cat-surface)] p-4">
            <p className="ios-footnote font-medium text-[var(--cat-text)]">Probar en tu tienda</p>
            <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
              Abrí la vista previa o tu dominio y andá a <span className="font-medium">/coleccion</span>.
            </p>
            <Link
              to="/app/vista-previa/coleccion"
              className="mc-btn-secondary mt-3 inline-flex"
            >
              Abrir vista previa del pasillo
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
