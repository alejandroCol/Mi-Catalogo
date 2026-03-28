import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import clsx from 'clsx'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { downloadCatalogImage } from '@/catalog-local/downloadCatalogImage'
import { FullscreenImageOverlay } from '@/catalog-local/FullscreenImageOverlay'
import { firebaseConfigured, firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { resolvePublicCatalogTheme } from '@/lib/catalogTheme'
import { mcProductosCollection } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import type { McProducto } from '@/types/mc'
import { usePublicTenant } from '@/public/usePublicTenant'

const DOCENA = 12

export function PublicProductDetailPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>()
  const { tenantId, tenant, loading, error } = usePublicTenant(slug)
  const { add, lines } = useCatalogoSimpleCart()
  const [p, setP] = useState<(McProducto & { id: string }) | null>(null)
  const [fullscreen, setFullscreen] = useState<{ src: string; alt: string } | null>(null)

  const preset = tenant ? resolvePublicCatalogTheme(tenant).preset : 'morning'

  useEffect(() => {
    if (!firebaseConfigured || !tenantId || !productId) return
    const db = getDb()
    const ref = doc(db, mcProductosCollection(tenantId), productId)
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setP(null)
        return
      }
      const d = { id: snap.id, ...(snap.data() as Omit<McProducto, 'id'>) }
      if (!d.activo || !d.enCatalogo) {
        setP(null)
        return
      }
      setP(d)
    })
  }, [tenantId, productId])

  if (!firebaseConfigured) {
    return <p className="mc-pc-text">Configurá Firebase.</p>
  }
  if (loading) {
    return <p className="text-center mc-pc-muted">Cargando…</p>
  }
  if (error || !tenant) {
    return <p className="text-red-600">{error ?? 'No disponible'}</p>
  }
  if (!p || !slug) {
    return (
      <div className="text-center">
        <p className="mc-pc-text">Artículo no disponible.</p>
        <Link to={`/c/${slug ?? ''}`} className="mt-4 inline-block text-sm mc-pc-muted underline">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const prod = p

  let enCarrito = 0
  for (const l of lines) {
    if (l.productId === prod.id) enCarrito += l.cantidad
  }
  const disp = Math.max(0, prod.stock - enCarrito)

  function sumar(cant: number) {
    if (cant > disp) {
      window.alert(`Máximo ${disp} unidades disponibles.`)
      return
    }
    add({
      productId: prod.id,
      titulo: prod.nombre,
      subtitulo: formatCop(prod.precioCop),
      precioUnitarioCop: prod.precioCop,
      cantidad: cant,
    })
  }

  const shellMax =
    preset === 'bold'
      ? 'max-w-lg'
      : preset === 'minimal'
        ? 'max-w-xl'
        : preset === 'boutique'
          ? 'max-w-md'
          : 'max-w-sm'

  const cardRounded =
    preset === 'bold'
      ? 'rounded-3xl'
      : preset === 'minimal'
        ? 'rounded-lg'
        : preset === 'boutique'
          ? 'rounded-md'
          : 'rounded-2xl'

  const titleClass = clsx(
    'mc-pc-display mc-pc-text',
    preset === 'bold' && 'text-center text-2xl font-black sm:text-3xl',
    preset === 'minimal' && 'text-left text-xl font-semibold sm:text-2xl',
    preset === 'boutique' && 'text-center text-xl font-semibold italic sm:text-2xl',
    (preset === 'ios' || preset === 'morning') && 'text-left text-xl font-semibold sm:text-2xl',
  )

  const priceClass = clsx(
    'font-semibold tabular-nums mc-pc-text',
    preset === 'bold' && 'text-center text-2xl sm:text-3xl',
    preset === 'boutique' && 'text-center text-lg italic',
    preset === 'minimal' && 'text-left text-lg',
    (preset === 'ios' || preset === 'morning') && 'text-left text-base',
  )

  const backClass = clsx(
    'mb-4 inline-block text-sm mc-pc-muted hover:underline',
    preset === 'bold' && 'w-full text-center',
    preset === 'boutique' && 'w-full text-center',
  )

  const imgRing =
    preset === 'bold'
      ? 'ring-2 ring-[color-mix(in_srgb,var(--cat-text)_12%,transparent)]'
      : preset === 'boutique'
        ? 'border border-[color-mix(in_srgb,var(--cat-text)_15%,var(--cat-surface)_85%)]'
        : ''

  const btnWrap = clsx('flex flex-wrap gap-2', preset === 'bold' && 'flex-col sm:flex-row')

  return (
    <div className={clsx('mx-auto w-full', shellMax)}>
      <Link to={`/c/${slug}`} className={backClass}>
        ← Catálogo
      </Link>

      <h1 className={titleClass}>{prod.nombre}</h1>
      <p className={clsx('mt-1', priceClass)}>{formatCop(prod.precioCop)}</p>

      <div
        className={clsx(
          'mc-pc-card relative mx-auto mt-4 overflow-hidden border mc-pc-border mc-pc-surface shadow-sm',
          cardRounded,
          preset === 'bold' && 'shadow-xl shadow-black/20',
        )}
      >
        <div className={clsx('relative aspect-square mc-pc-image-placeholder', imgRing)}>
          {prod.imageUrl ? (
            <button
              type="button"
              className="group/img relative h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset mc-pc-ring-focus"
              onClick={() => setFullscreen({ src: prod.imageUrl!, alt: prod.nombre })}
              aria-label={`Ver ${prod.nombre} en pantalla completa`}
            >
              <img
                src={prod.imageUrl}
                alt=""
                className="pointer-events-none h-full w-full object-cover transition group-hover/img:brightness-[0.97]"
              />
              <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-[color-mix(in_srgb,var(--cat-text)_58%,transparent)] px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm sm:text-xs">
                Pantalla completa
              </span>
            </button>
          ) : (
            <div className="flex h-full items-center justify-center mc-pc-muted">Sin imagen</div>
          )}
        </div>
        <div
          className={clsx(
            'space-y-3',
            preset === 'bold' ? 'p-5 sm:p-6' : preset === 'minimal' ? 'p-4' : 'p-4',
          )}
        >
          <p
            className={clsx(
              'text-sm mc-pc-muted',
              (preset === 'bold' || preset === 'boutique') && 'text-center',
            )}
          >
            Stock bodega {prod.stock}
            {enCarrito > 0 && ` · en carrito ${enCarrito}`} · podés pedir {disp}
          </p>
          {prod.imageUrl && (
            <button
              type="button"
              className={clsx(
                'w-full rounded-xl border mc-pc-border mc-pc-surface px-4 py-2.5 text-xs font-medium mc-pc-text shadow-sm transition mc-pc-line-softer hover:opacity-95',
                preset === 'bold' && 'py-3 text-sm',
              )}
              onClick={() =>
                void downloadCatalogImage(prod.imageUrl!, `${prod.nombre.replace(/\s+/g, '_')}.jpg`, {
                  getFirebaseStorage: () => (firebaseStorageConfigured ? getStorageApp() : null),
                })
              }
            >
              Descargar foto
            </button>
          )}
          <div className={btnWrap}>
            <button
              type="button"
              className={clsx(
                'mc-pc-accent-soft flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-45',
                preset === 'bold' && 'py-3.5 text-sm',
              )}
              disabled={disp < 1}
              onClick={() => sumar(1)}
            >
              +1 unidad
            </button>
            <button
              type="button"
              className={clsx(
                'mc-pc-accent-soft flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-45',
                preset === 'bold' && 'py-3.5 text-sm',
              )}
              disabled={disp < DOCENA}
              onClick={() => sumar(DOCENA)}
            >
              +1 docena
            </button>
          </div>
        </div>
      </div>

      <FullscreenImageOverlay
        src={fullscreen?.src ?? null}
        alt={fullscreen?.alt ?? ''}
        open={fullscreen != null}
        onClose={() => setFullscreen(null)}
      />
    </div>
  )
}
