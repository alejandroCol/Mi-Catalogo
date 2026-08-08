import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import clsx from 'clsx'
import { firebaseConfigured, getDb, getFirebaseFunctions } from '@/lib/firebase'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { loadLocalOrderIds } from '@/lib/catalogLocalOrders'
import { mcProductReviewsCollection } from '@/lib/mcCollections'
import type { McProductReview } from '@/types/mc'
import { usePublicStore } from '@/public/PublicStoreContext'

type Props = {
  tenantId: string
  productId: string
  productName: string
  ratingAvg?: number
  ratingCount?: number
}

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={clsx(
        'transition-colors',
        filled ? 'fill-amber-400 text-amber-400' : 'fill-none text-[color-mix(in_srgb,var(--cat-muted)_40%,transparent)]',
      )}
    >
      <path
        d="M12 3.6l2.35 5.48 5.95.52-4.52 3.95 1.36 5.82L12 16.7l-5.14 2.67 1.36-5.82-4.52-3.95 5.95-.52L12 3.6z"
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.4}
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const full = Math.round(value)
  const px = size === 'md' ? 15 : 13
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} filled={i < full} size={px} />
      ))}
    </span>
  )
}

function PhotoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <circle cx="9" cy="11" r="1.6" />
      <path d="M12.2 15.2 14.1 12.8a1 1 0 0 1 1.5-.05L20 16.5" strokeLinecap="round" />
    </svg>
  )
}

function initialOf(name: string) {
  return (name.trim().charAt(0) || '?').toUpperCase()
}

async function fileToJpegBase64(file: File): Promise<string> {
  const compressed = await compressImageForUpload(file, { maxEdgePx: 1200, jpegQuality: 0.78 })
  const buf = await compressed.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function CatalogProductReviews({
  tenantId,
  productId,
  productName,
  ratingAvg,
  ratingCount,
}: Props) {
  const { slug } = usePublicStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [reviews, setReviews] = useState<(McProductReview & { id: string })[]>([])
  const [openForm, setOpenForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [nombre, setNombre] = useState('')
  const [orderId, setOrderId] = useState('')
  const [comentario, setComentario] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedOrders, setSavedOrders] = useState<string[]>([])

  useEffect(() => {
    if (!firebaseConfigured || !tenantId || !productId) return
    const db = getDb()
    const q = query(
      collection(db, mcProductReviewsCollection(tenantId)),
      where('productId', '==', productId),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(30),
    )
    return onSnapshot(
      q,
      (snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProductReview, 'id'>) })))
      },
      () => setReviews([]),
    )
  }, [tenantId, productId])

  useEffect(() => {
    if (!slug || !openForm) return
    setSavedOrders(loadLocalOrderIds(slug))
  }, [slug, openForm])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const avg = useMemo(() => {
    if (typeof ratingAvg === 'number' && ratingAvg > 0) return ratingAvg
    if (reviews.length === 0) return 0
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  }, [ratingAvg, reviews])

  const count = typeof ratingCount === 'number' ? ratingCount : reviews.length
  const orderListId = `mc-review-orders-${productId}`

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function onPickPhoto(file: File | null) {
    if (!file) {
      clearPhoto()
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('La foto debe ser una imagen.')
      return
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!slug) return
    setSubmitting(true)
    setError(null)
    setFeedback(null)
    try {
      let imageBase64: string | undefined
      if (photoFile) {
        imageBase64 = await fileToJpegBase64(photoFile)
      }
      const fn = httpsCallable(getFirebaseFunctions(), 'mcCatalogSubmitProductReview')
      await fn({
        slug,
        productId,
        orderId: orderId.trim(),
        rating,
        comentario: comentario.trim(),
        clienteNombre: nombre.trim(),
        ...(imageBase64 ? { imageBase64 } : {}),
      })
      setFeedback('¡Gracias! Tu reseña quedó publicada como compra verificada.')
      setOpenForm(false)
      setComentario('')
      setOrderId('')
      clearPhoto()
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'No se pudo enviar la reseña.'
      setError(msg.replace(/^Firebase:\s*/i, '').replace(/\s*\(.*\)$/, ''))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-8 border-t border-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)] pt-6 sm:mt-12 sm:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="mc-pc-display text-lg font-semibold tracking-tight text-[var(--cat-text)] sm:text-xl">
            Opiniones
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {count > 0 ? (
              <>
                <Stars value={avg} size="md" />
                <span className="text-[13px] font-semibold tabular-nums text-[var(--cat-text)]">
                  {avg.toFixed(1)}
                </span>
                <span className="text-[12px] text-[var(--cat-muted)]">
                  · {count} {count === 1 ? 'reseña' : 'reseñas'}
                </span>
              </>
            ) : (
              <p className="text-[12px] text-[var(--cat-muted)]">Sé el primero en opinar sobre {productName}.</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpenForm((v) => !v)}
          className={clsx(
            'mc-pc-btn px-3.5 py-2 text-[12px] font-semibold transition',
            openForm
              ? 'border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] bg-transparent text-[var(--cat-text)]'
              : 'bg-[var(--cat-accent)] text-[var(--cat-accent-text)] hover:opacity-90',
          )}
        >
          {openForm ? 'Cerrar' : 'Escribir reseña'}
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-[12px] text-emerald-900">
          {feedback}
        </p>
      ) : null}

      {openForm ? (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-0.5" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="p-1 transition hover:scale-110"
                aria-checked={rating === n}
                role="radio"
                aria-label={`${n} estrellas`}
              >
                <StarIcon filled={rating >= n} size={24} />
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              className="mc-input py-2 text-[13px]"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              maxLength={80}
              placeholder="Tu nombre"
              aria-label="Nombre"
            />
            <div>
              <input
                className="mc-input py-2 font-mono text-[13px]"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
                maxLength={128}
                placeholder="N.º de pedido"
                aria-label="N.º de pedido"
                list={savedOrders.length > 0 ? orderListId : undefined}
                autoComplete="off"
              />
              {savedOrders.length > 0 ? (
                <>
                  <datalist id={orderListId}>
                    {savedOrders.map((id) => (
                      <option key={id} value={id} />
                    ))}
                  </datalist>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {savedOrders.slice(0, 4).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setOrderId(id)}
                        className={clsx(
                          'max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                          orderId === id
                            ? 'bg-[var(--cat-text)] text-[var(--cat-bg)]'
                            : 'bg-[color-mix(in_srgb,var(--cat-muted)_10%,var(--cat-surface)_90%)] text-[var(--cat-muted)] hover:text-[var(--cat-text)]',
                        )}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <textarea
            className="mc-input min-h-[72px] py-2 text-[13px]"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            required
            maxLength={800}
            placeholder="Contá cómo te quedó"
            aria-label="Comentario"
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
          />
          {photoPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_35%,transparent)]">
              <img src={photoPreview} alt="" className="h-28 w-full object-cover sm:h-32" />
              <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/55 to-transparent px-2.5 pb-2 pt-6">
                <button
                  type="button"
                  className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-neutral-800"
                  onClick={() => fileRef.current?.click()}
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-neutral-700"
                  onClick={clearPhoto}
                >
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_40%,transparent)] bg-[color-mix(in_srgb,var(--cat-muted)_5%,var(--cat-surface)_95%)] px-3 py-5 text-[var(--cat-muted)] transition hover:border-[color-mix(in_srgb,var(--cat-muted)_55%,transparent)] hover:text-[var(--cat-text)]"
            >
              <PhotoGlyph className="h-6 w-6" />
              <span className="text-[12px] font-medium">Agregar foto (opcional)</span>
            </button>
          )}

          {error ? <p className="text-[12px] text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="mc-pc-btn mt-1 w-full bg-[var(--cat-accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--cat-accent-text)] transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Publicando…' : 'Publicar reseña'}
          </button>
        </form>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="mt-5 space-y-2.5">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)] bg-[var(--cat-surface)] px-3 py-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-muted)_12%,var(--cat-surface)_88%)] text-[11px] font-semibold text-[var(--cat-text)]"
                  aria-hidden
                >
                  {initialOf(r.clienteNombre)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-[var(--cat-text)]">{r.clienteNombre}</span>
                    {r.verifiedPurchase ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                        Verificada
                      </span>
                    ) : null}
                    {r.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(r.imageUrl!)}
                        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
                        aria-label="Ver foto"
                      >
                        <PhotoGlyph className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-0.5">
                    <Stars value={r.rating} />
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-[var(--cat-text)]">{r.comentario}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Foto de la opinión"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-neutral-800"
            onClick={() => setLightboxUrl(null)}
          >
            Cerrar
          </button>
          <img
            src={lightboxUrl}
            alt="Foto de la reseña"
            className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  )
}
