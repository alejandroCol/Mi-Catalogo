import { useEffect, useMemo, useState } from 'react'
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
import { buildProductShareData, canUseWebShare, shareSafe } from '@/lib/webShare'
import type { McProducto, McProductoVariante } from '@/types/mc'
import { usePublicTenant } from '@/public/usePublicTenant'

const DOCENA = 12

function variantesValidas(prod: McProducto): McProductoVariante[] {
  return (prod.variantes ?? []).filter((v) => v.nombre?.trim())
}

export function PublicProductDetailPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>()
  const { tenantId, tenant, loading, error } = usePublicTenant(slug)
  const { add, lines } = useCatalogoSimpleCart()
  const [p, setP] = useState<(McProducto & { id: string }) | null>(null)
  const [fullscreen, setFullscreen] = useState<{ src: string; alt: string } | null>(null)
  const [selectedVid, setSelectedVid] = useState<string | null>(null)
  const [galleryPick, setGalleryPick] = useState<string | null>(null)
  const [qtyToAdd, setQtyToAdd] = useState(1)

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

  const prod = p
  const vars = prod ? variantesValidas(prod) : []
  const hasVariants = vars.length > 0
  const selected = hasVariants ? vars.find((v) => v.id === selectedVid) ?? vars[0] : undefined

  useEffect(() => {
    if (!prod) return
    const vs = variantesValidas(prod)
    if (vs.length > 0) {
      setSelectedVid((prev) => {
        if (prev && vs.some((v) => v.id === prev)) return prev
        return vs[0]!.id
      })
    } else {
      setSelectedVid(null)
    }
    setGalleryPick(null)
  }, [prod?.id, prod?.updatedAt])

  const mainSrc = useMemo(() => {
    if (!prod) return null
    if (galleryPick) return galleryPick
    if (selected?.imageUrl) return selected.imageUrl
    return prod.imageUrl ?? null
  }, [prod, selected?.imageUrl, galleryPick])

  const effectivePrice = selected?.precioCop ?? prod?.precioCop ?? 0

  const enCarrito = useMemo(() => {
    if (!prod) return 0
    let n = 0
    for (const l of lines) {
      if (l.productId !== prod.id) continue
      if (hasVariants) {
        if (l.varianteId === selected?.id) n += l.cantidad
      } else if (!l.varianteId) {
        n += l.cantidad
      }
    }
    return n
  }, [lines, prod?.id, hasVariants, selected?.id])

  const totalEnCarritoProducto = useMemo(() => {
    if (!prod) return 0
    return lines.filter((l) => l.productId === prod.id).reduce((s, l) => s + l.cantidad, 0)
  }, [lines, prod?.id])

  useEffect(() => {
    setQtyToAdd(1)
  }, [selected?.id, prod?.id])

  useEffect(() => {
    if (!prod) return
    const d = Math.max(0, prod.stock - totalEnCarritoProducto)
    if (d <= 0) {
      setQtyToAdd(1)
      return
    }
    setQtyToAdd((q) => Math.max(1, Math.min(q, d)))
  }, [prod?.id, prod?.stock, totalEnCarritoProducto, selected?.id])

  if (!firebaseConfigured) {
    return <p className="mc-pc-text">Configurá Firebase.</p>
  }
  if (loading) {
    return <p className="text-center mc-pc-muted">Cargando…</p>
  }
  if (error || !tenant) {
    return <p className="text-red-600">{error ?? 'No disponible'}</p>
  }
  if (!prod || !slug) {
    return (
      <div className="text-center">
        <p className="mc-pc-text">Artículo no disponible.</p>
        <Link to={`/c/${slug ?? ''}`} className="mt-4 inline-block text-sm mc-pc-muted underline">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const product = prod
  const disp = Math.max(0, product.stock - totalEnCarritoProducto)

  const galeriaUrls = (() => {
    const u = new Set<string>()
    const out: string[] = []
    for (const x of [product.imageUrl, ...(product.galeriaImagenes ?? [])]) {
      if (!x || u.has(x)) continue
      u.add(x)
      out.push(x)
    }
    return out
  })()

  function sumar(cant: number) {
    if (hasVariants && !selected) return
    if (cant > disp) {
      window.alert(`Máximo ${disp} unidades disponibles.`)
      return
    }
    const titulo = hasVariants ? `${product.nombre} · ${selected!.nombre}` : product.nombre
    add({
      productId: product.id,
      varianteId: hasVariants ? selected!.id : undefined,
      titulo,
      subtitulo: formatCop(effectivePrice),
      precioUnitarioCop: effectivePrice,
      cantidad: cant,
    })
  }

  const isBold = preset === 'bold'
  const isBoutique = preset === 'boutique'

  const Breadcrumb = () => (
    <nav
      className="flex flex-wrap items-center gap-1.5 text-[12px] sm:text-[13px] mc-pc-muted"
      aria-label="Migas de pan"
    >
      <Link to={`/c/${slug}`} className="font-medium text-[var(--cat-text)] transition hover:opacity-75">
        {tenant.nombreTienda}
      </Link>
      <span aria-hidden className="text-[color-mix(in_srgb,var(--cat-muted)_60%,transparent)]">
        /
      </span>
      <span className="line-clamp-1 text-[var(--cat-muted)]">Producto</span>
    </nav>
  )

  const VariantChips = ({ className }: { className?: string }) =>
    hasVariants ? (
      <div className={clsx('space-y-2', className)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
          Elegí opción
        </p>
        <div className="flex flex-wrap gap-2">
          {vars.map((v) => {
            const active = v.id === selected?.id
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setSelectedVid(v.id)
                  setGalleryPick(null)
                }}
                className={clsx(
                  'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 py-2 text-left text-[13px] font-medium transition',
                  active
                    ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)]'
                    : 'mc-pc-border bg-[var(--cat-surface)] text-[var(--cat-text)] hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)]',
                )}
              >
                {v.hex ? (
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_28%,transparent)] shadow-sm"
                    style={{ backgroundColor: v.hex }}
                    aria-hidden
                  />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border mc-pc-border text-[10px] mc-pc-muted">
                    ·
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block leading-tight">{v.nombre}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold tabular-nums text-[var(--cat-muted)]">
                    {formatCop(v.precioCop ?? product.precioCop)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    ) : null

  const CtaGroup = ({ className }: { className?: string }) => (
    <div className={clsx('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-[var(--cat-muted)]">Cantidad</span>
        <div className="flex items-center rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] bg-[var(--cat-surface)] p-0.5">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold leading-none transition hover:bg-[color-mix(in_srgb,var(--cat-text)_6%,transparent)] disabled:opacity-35"
            disabled={disp < 1 || qtyToAdd <= 1}
            onClick={() => setQtyToAdd((q) => Math.max(1, q - 1))}
            aria-label="Menos unidades"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, disp)}
            value={qtyToAdd}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (Number.isNaN(v)) return
              const top = Math.max(1, disp)
              setQtyToAdd(Math.max(1, Math.min(v, top)))
            }}
            className="w-8 border-0 bg-transparent text-center text-[12px] font-semibold tabular-nums text-[var(--cat-text)] outline-none focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label="Cantidad a añadir"
          />
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold leading-none transition hover:bg-[color-mix(in_srgb,var(--cat-text)_6%,transparent)] disabled:opacity-35"
            disabled={disp < 1 || qtyToAdd >= disp}
            onClick={() => setQtyToAdd((q) => Math.min(disp, q + 1))}
            aria-label="Más unidades"
          >
            +
          </button>
        </div>
        {disp >= 1 ? (
          <span className="text-[10px] leading-tight mc-pc-muted sm:text-[11px]">
            Hasta {disp} {disp === 1 ? 'unidad' : 'unidades'}
          </span>
        ) : (
          <span className="text-[10px] mc-pc-muted sm:text-[11px]">Sin stock disponible</span>
        )}
      </div>
      <button
        type="button"
        className="min-h-[52px] w-full rounded-2xl bg-[#0a0a0a] px-4 py-3.5 text-[15px] font-semibold text-white shadow-sm transition duration-200 ease-in-out hover:bg-neutral-800 disabled:opacity-40 sm:min-h-[48px] sm:text-base"
        disabled={disp < 1}
        onClick={() => sumar(qtyToAdd)}
      >
        Añadir al carrito
      </button>
      {disp >= DOCENA ? (
        <button
          type="button"
          className="min-h-[48px] w-full rounded-2xl border border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] bg-[var(--cat-surface)] px-4 py-3 text-[14px] font-semibold text-[var(--cat-text)] transition duration-200 ease-in-out"
          onClick={() => sumar(DOCENA)}
        >
          Añadir 1 docena
        </button>
      ) : null}
    </div>
  )

  return (
    <div className="pb-28 md:pb-0">
      <div
        className={clsx(
          'md:grid md:items-start',
          isBold
            ? 'md:mx-auto md:max-w-3xl md:grid-cols-1 md:justify-items-center'
            : 'md:max-w-6xl md:grid-cols-2 md:gap-8 lg:gap-12',
        )}
      >
        <div
          className={clsx(
            !isBold && 'md:sticky md:top-24',
            isBold && 'w-full',
          )}
        >
          <Breadcrumb />
          <div
            className={clsx(
              'relative mt-4 overflow-hidden mc-pc-surface',
              isBold
                ? 'mc-pc-rey-card aspect-[5/3] w-full min-h-[220px] sm:aspect-[2/1] sm:min-h-0'
                : 'mc-pc-rey-card aspect-square w-full max-w-xl md:max-w-none',
            )}
          >
            {mainSrc ? (
              <button
                type="button"
                className="group/img relative h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-1 focus-visible:ring-inset mc-pc-ring-focus"
                onClick={() => setFullscreen({ src: mainSrc, alt: product.nombre })}
                aria-label={`Ver ${product.nombre} en pantalla completa`}
              >
                <img
                  src={mainSrc}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover/img:brightness-[0.98]"
                />
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/30 bg-[color-mix(in_srgb,var(--cat-text)_40%,transparent)] px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm sm:bottom-4 sm:right-4 sm:text-[11px]">
                  Ampliar
                </span>
              </button>
            ) : (
              <div className="flex h-full items-center justify-center mc-pc-muted">Sin imagen</div>
            )}
          </div>
          {galeriaUrls.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {galeriaUrls.map((url) => {
                const thumbActive = galleryPick != null ? galleryPick === url : url === mainSrc
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setGalleryPick(url)}
                    className={clsx(
                      'relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16',
                      thumbActive
                        ? 'border-[var(--cat-accent)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_30%,transparent)]'
                        : 'border-transparent opacity-85 hover:opacity-100',
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div
          className={clsx(
            'mt-6 min-w-0 md:mt-0',
            isBold && 'max-w-2xl text-center',
            isBoutique && 'text-center md:text-left',
          )}
        >
          <div
            className={clsx(
              'mb-2 flex flex-wrap items-center gap-2',
              (isBold || isBoutique) && 'justify-center md:justify-start',
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cat-muted)] sm:text-[11px]">
              {tenant.nombreTienda}
            </span>
            {canUseWebShare() && (
              <button
                type="button"
                className="text-[11px] font-medium text-[var(--cat-muted)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_40%,transparent)] underline-offset-4 transition hover:text-[var(--cat-text)] sm:text-xs"
                onClick={() =>
                  void shareSafe(
                    buildProductShareData({
                      nombreTienda: tenant.nombreTienda,
                      productName: product.nombre,
                      productUrl: `${window.location.origin}/c/${slug}/p/${product.id}`,
                    }),
                  )
                }
              >
                Compartir
              </button>
            )}
          </div>

          <h1
            className={clsx(
              'mc-pc-display text-[var(--cat-text)]',
              isBold && 'text-2xl font-bold tracking-tighter sm:text-3xl',
              isBoutique && 'text-2xl font-semibold tracking-tight sm:text-3xl',
              preset === 'minimal' && 'text-left text-xl font-semibold sm:text-2xl',
              (preset === 'ios' || preset === 'morning') && 'text-left text-2xl font-semibold sm:text-3xl',
            )}
          >
            {product.nombre}
          </h1>
          <p
            className={clsx(
              'mt-2 font-semibold tabular-nums text-[var(--cat-text)] sm:mt-3',
              isBold && 'text-center text-2xl sm:text-3xl',
              isBoutique && 'text-center text-xl md:text-left',
              preset === 'minimal' && 'text-left text-lg',
              (preset === 'ios' || preset === 'morning') && 'text-left text-lg sm:text-xl',
            )}
          >
            {formatCop(effectivePrice)}
          </p>

          <VariantChips
            className={clsx('mt-5', (isBold || isBoutique) && 'md:mx-auto md:max-w-md')}
          />

          <CtaGroup className={clsx('mt-6 max-md:hidden', isBold && 'mx-auto max-w-xl')} />

          <p
            className={clsx(
              'mt-4 text-sm leading-relaxed text-[var(--cat-muted)]',
              (isBold || isBoutique) && 'text-center md:text-left',
            )}
          >
            Stock bodega {product.stock}
            {enCarrito > 0 ? ` · podés sumar hasta ${disp} más` : ` · podés pedir ${disp}`}
          </p>

          {mainSrc && (
            <button
              type="button"
              className="mt-5 w-full rounded-full border mc-pc-border bg-transparent px-4 py-2.5 text-xs font-medium text-[var(--cat-text)] transition duration-200 ease-in-out hover:opacity-80 sm:mt-6 sm:max-w-xs sm:py-2"
              onClick={() =>
                void downloadCatalogImage(mainSrc, `${product.nombre.replace(/\s+/g, '_')}.jpg`, {
                  getFirebaseStorage: () => (firebaseStorageConfigured ? getStorageApp() : null),
                })
              }
            >
              Descargar imagen
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 md:mt-8">
        <Link
          to={`/c/${slug}`}
          className="text-sm font-medium text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
        >
          ← Todos los productos
        </Link>
      </p>

      <div
        className="mc-pc-rey-cta-mobile fixed bottom-0 left-0 right-0 z-20 border-t border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_94%,transparent)] px-3 pt-3 backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-lg items-end justify-between gap-3 pb-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-[var(--cat-text)]">{product.nombre}</p>
            {hasVariants && selected ? (
              <p className="truncate text-[11px] text-[var(--cat-muted)]">{selected.nombre}</p>
            ) : null}
            <p className="text-[15px] font-semibold tabular-nums text-[var(--cat-text)]">
              {formatCop(effectivePrice)}
            </p>
          </div>
        </div>
        <CtaGroup className="mt-1 pb-1" />
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
