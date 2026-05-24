import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import clsx from 'clsx'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { downloadCatalogImage } from '@/catalog-local/downloadCatalogImage'
import { FullscreenImageOverlay } from '@/catalog-local/FullscreenImageOverlay'
import { ProductImageGallery } from '@/public/ProductImageGallery'
import { firebaseConfigured, firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { resolvePublicCatalogTheme } from '@/lib/catalogTheme'
import { mcProductosCollection } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import {
  productoPorcentajeDescuentoDisplay,
  productoPrecioLista,
  productoPrecioVenta,
  productoTieneDescuento,
} from '@/lib/productoDescuento'
import {
  agruparVariantesPorTipo,
  productoUsaStockPorVariante,
  stockDisponibleVariante,
  variantesValidas,
} from '@/lib/productoVariantes'
import {
  stockDisponibleTalla,
  stockTallaUi,
  tallaEnCarrito,
  tallasValidas,
} from '@/lib/productoTallas'
import { buildProductShareData, canUseWebShare, shareSafe } from '@/lib/webShare'
import type { McProducto, McProductoTalla, McProductoVariante } from '@/types/mc'
import { usePublicTenant } from '@/public/usePublicTenant'
import { usePublicProductViewTracking } from '@/public/usePublicCatalogAnalytics'
import { useCartAddAnimation } from '@/public/cart-animation/CartAddAnimationContext'
import { CART_FLY_DURATION_MS } from '@/public/cart-animation/flyBezier'

const DOCENA = 12

function variantesPublicas(prod: McProducto): McProductoVariante[] {
  return variantesValidas(prod).filter((v) => !prod.esRopa || v.tipo?.trim().toLowerCase() !== 'talla')
}

function varianteEnCarrito(lines: LineaCarritoSimple[], productId: string, varianteId: string): number {
  let n = 0
  for (const l of lines) {
    if (l.productId === productId && l.varianteId === varianteId) n += l.cantidad
  }
  return n
}

function stockVarianteUi(prod: McProducto, v: McProductoVariante, lines: LineaCarritoSimple[]): number {
  const enCart = varianteEnCarrito(lines, prod.id, v.id)
  const totalCart = lines.filter((l) => l.productId === prod.id).reduce((s, l) => s + l.cantidad, 0)
  return stockDisponibleVariante(prod, v, enCart, totalCart)
}

function originalEnCarrito(lines: LineaCarritoSimple[], productId: string): number {
  let n = 0
  for (const l of lines) {
    if (l.productId === productId && !l.varianteId) n += l.cantidad
  }
  return n
}

function stockOriginalUi(prod: McProducto, lines: LineaCarritoSimple[]): number {
  const enCart = originalEnCarrito(lines, prod.id)
  const totalCart = lines.filter((l) => l.productId === prod.id).reduce((s, l) => s + l.cantidad, 0)
  if (productoUsaStockPorVariante(prod)) {
    return Math.max(0, Math.floor(prod.stock ?? 0) - enCart)
  }
  return Math.max(0, Math.floor(prod.stock ?? 0) - totalCart)
}

function buildGalleryUrls(prod: McProducto, variante?: McProductoVariante): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (url?: string) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    out.push(url)
  }
  if (variante?.imageUrl) add(variante.imageUrl)
  add(prod.imageUrl)
  for (const url of prod.galeriaImagenes ?? []) add(url)
  return out
}

export function PublicProductDetailPage() {
  const { slug, productId } = useParams<{ slug: string; productId: string }>()
  const { tenantId, tenant, loading, error } = usePublicTenant(slug)
  const { add, lines } = useCatalogoSimpleCart()
  const { playAddToCartFly } = useCartAddAnimation()
  const [p, setP] = useState<(McProducto & { id: string }) | null>(null)
  const [fullscreen, setFullscreen] = useState<{ index: number; alt: string } | null>(null)
  const [selectedOption, setSelectedOption] = useState<'none' | 'original' | string>('none')
  const [selectedTid, setSelectedTid] = useState<string | null>(null)
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
  const vars = prod ? variantesPublicas(prod) : []
  usePublicProductViewTracking(
    productId,
    prod?.nombre,
    prod?.imageUrl ?? prod?.galeriaImagenes?.[0],
  )
  const tallas = prod ? tallasValidas(prod) : []
  const hasVariants = vars.length > 0
  const hasTallas = !!(prod?.esRopa && tallas.length > 0)
  const selected =
    hasVariants && typeof selectedOption === 'string' && selectedOption !== 'original' && selectedOption !== 'none'
      ? vars.find((v) => v.id === selectedOption)
      : undefined
  const selectedTalla = hasTallas && selectedTid ? tallas.find((t) => t.id === selectedTid) : undefined
  const isOriginalSelection = hasVariants && selectedOption === 'original'
  const actsAsOriginal = hasVariants && (selectedOption === 'none' || selectedOption === 'original')

  useEffect(() => {
    if (!prod) return
    const vs = variantesPublicas(prod)
    if (vs.length === 0) {
      setSelectedOption('none')
    } else {
      setSelectedOption((prev) => {
        if (prev === 'none' || prev === 'original') return prev
        return vs.some((v) => v.id === prev) ? prev : 'none'
      })
    }
    const ts = tallasValidas(prod)
    if (prod.esRopa && ts.length > 0) {
      setSelectedTid((prev) => (prev && ts.some((t) => t.id === prev) ? prev : null))
    } else {
      setSelectedTid(null)
    }
  }, [prod?.id, prod?.updatedAt, prod?.esRopa])

  const galeriaUrls = useMemo(
    () => (prod ? buildGalleryUrls(prod, selected) : []),
    [prod, selected],
  )

  const listaPrice =
    selected && prod ? productoPrecioLista(prod, selected) : prod ? productoPrecioLista(prod) : 0
  const effectivePrice =
    selected && prod ? productoPrecioVenta(prod, selected) : prod ? productoPrecioVenta(prod) : 0
  const enOferta = prod ? productoTieneDescuento(prod) : false

  const enCarrito = useMemo(() => {
    if (!prod) return 0
    let n = 0
    for (const l of lines) {
      if (l.productId !== prod.id) continue
      if (hasTallas && l.tallaId !== selectedTalla?.id) continue
      if (hasVariants) {
        if (actsAsOriginal && !l.varianteId) n += l.cantidad
        else if (selected && l.varianteId === selected.id) n += l.cantidad
      } else if (!l.varianteId) {
        n += l.cantidad
      }
    }
    return n
  }, [lines, prod?.id, hasVariants, hasTallas, actsAsOriginal, selected?.id, selectedTalla?.id])

  const totalEnCarritoProducto = useMemo(() => {
    if (!prod) return 0
    return lines.filter((l) => l.productId === prod.id).reduce((s, l) => s + l.cantidad, 0)
  }, [lines, prod?.id])

  useEffect(() => {
    setQtyToAdd(1)
  }, [selectedOption, selectedTalla?.id, prod?.id])

  useEffect(() => {
    if (!prod) return
    const totalCart = lines.filter((l) => l.productId === prod.id).reduce((s, l) => s + l.cantidad, 0)
    let d = 0
    if (hasTallas && selectedTalla) {
      d = stockDisponibleTalla(prod, selectedTalla, tallaEnCarrito(lines, prod.id, selectedTalla.id))
    } else if (hasVariants && selected) {
      d = stockDisponibleVariante(prod, selected, enCarrito, totalCart)
    } else if (hasVariants && actsAsOriginal) {
      d = stockOriginalUi(prod, lines)
    } else {
      d = Math.max(0, Math.floor(prod.stock ?? 0) - totalCart)
    }
    if (d <= 0) {
      setQtyToAdd(1)
      return
    }
    setQtyToAdd((q) => Math.max(1, Math.min(q, d)))
  }, [prod?.id, prod?.stock, enCarrito, selected?.id, selectedTalla?.id, hasVariants, hasTallas, actsAsOriginal, lines])

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
  const disp = (() => {
    if (hasTallas && selectedTalla) {
      return stockDisponibleTalla(product, selectedTalla, tallaEnCarrito(lines, product.id, selectedTalla.id))
    }
    if (hasVariants && selected) {
      return stockDisponibleVariante(product, selected, enCarrito, totalEnCarritoProducto)
    }
    if (hasVariants && actsAsOriginal) {
      return stockOriginalUi(product, lines)
    }
    return Math.max(0, Math.floor(product.stock ?? 0) - totalEnCarritoProducto)
  })()

  const gruposVariantes = agruparVariantesPorTipo(vars)
  const usaStockPorVariante = productoUsaStockPorVariante(product)

  function pulseAddButton(el: HTMLElement) {
    el.classList.add('mc-pc-add-btn-pulse')
    el.addEventListener(
      'animationend',
      () => el.classList.remove('mc-pc-add-btn-pulse'),
      { once: true },
    )
  }

  function sumar(cant: number, sourceEl?: HTMLElement) {
    if (hasTallas && !selectedTalla) return
    if (cant > disp) {
      window.alert(`Máximo ${disp} unidades disponibles.`)
      return
    }
    const partes = [product.nombre]
    if (hasVariants && selected) partes.push(selected.nombre)
    if (hasTallas && selectedTalla) partes.push(selectedTalla.nombre)
    const titulo = partes.join(' · ')
    if (sourceEl) {
      pulseAddButton(sourceEl)
      playAddToCartFly({ sourceEl, imageUrl: galeriaUrls[0] })
    }
    add(
      {
        productId: product.id,
        varianteId: hasVariants && selected ? selected.id : undefined,
        tallaId: hasTallas ? selectedTalla!.id : undefined,
        titulo,
        subtitulo: formatCop(effectivePrice),
        precioUnitarioCop: effectivePrice,
        cantidad: cant,
      },
      sourceEl ? { deferBadgeMs: Math.round(CART_FLY_DURATION_MS * 0.88) } : undefined,
    )
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

  const OriginalChip = () => {
    const active = isOriginalSelection
    const dispO = stockOriginalUi(product, lines)
    const agotada = dispO < 1
    const precioListaO = productoPrecioLista(product)
    const precioO = productoPrecioVenta(product)
    const pctO = productoPorcentajeDescuentoDisplay(product)

    return (
      <button
        type="button"
        disabled={agotada}
        onClick={() => setSelectedOption('original')}
        className={clsx(
          'inline-flex min-h-[48px] max-w-full items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition',
          agotada && 'cursor-not-allowed opacity-45',
          active && !agotada
            ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] shadow-sm'
            : !agotada &&
                'mc-pc-border bg-[var(--cat-surface)] text-[var(--cat-text)] hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)] hover:shadow-sm',
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border mc-pc-border bg-[color-mix(in_srgb,var(--cat-text)_4%,var(--cat-surface)_96%)] text-[11px] font-bold mc-pc-muted">
          ★
        </span>
        <span className="min-w-0 flex-1">
          <span className="block leading-tight">Original</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold tabular-nums text-[var(--cat-muted)]">
            {precioO < precioListaO ? (
              <>
                <span className="text-[var(--cat-accent)]">{formatCop(precioO)}</span>
                <span className="line-through opacity-70">{formatCop(precioListaO)}</span>
                {pctO != null && <span className="text-red-600">−{pctO}%</span>}
              </>
            ) : (
              <span>{formatCop(precioO)}</span>
            )}
            {usaStockPorVariante ? (
              <span className={clsx('font-medium', agotada ? 'text-red-600/90' : 'text-emerald-700/90')}>
                {agotada ? 'Agotado' : `${dispO} disp.`}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    )
  }

  const VariantChip = ({ v }: { v: McProductoVariante }) => {
    const active = v.id === selectedOption
    const dispV = stockVarianteUi(product, v, lines)
    const agotada = dispV < 1
    const precioListaV = productoPrecioLista(product, v)
    const precioV = productoPrecioVenta(product, v)
    const pctV = productoPorcentajeDescuentoDisplay(product, v)

    return (
      <button
        key={v.id}
        type="button"
        disabled={agotada}
        onClick={() => setSelectedOption(v.id)}
        className={clsx(
          'inline-flex min-h-[48px] max-w-full items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition',
          agotada && 'cursor-not-allowed opacity-45',
          active && !agotada
            ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] shadow-sm'
            : !agotada &&
                'mc-pc-border bg-[var(--cat-surface)] text-[var(--cat-text)] hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)] hover:shadow-sm',
        )}
      >
        {v.hex ? (
          <span
            className="h-7 w-7 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_28%,transparent)] shadow-inner"
            style={{ backgroundColor: v.hex }}
            aria-hidden
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border mc-pc-border bg-[color-mix(in_srgb,var(--cat-text)_4%,var(--cat-surface)_96%)] text-[11px] font-bold mc-pc-muted">
            {v.nombre.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block leading-tight">{v.nombre}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold tabular-nums text-[var(--cat-muted)]">
            {precioV < precioListaV ? (
              <>
                <span className="text-[var(--cat-accent)]">{formatCop(precioV)}</span>
                <span className="line-through opacity-70">{formatCop(precioListaV)}</span>
                {pctV != null && <span className="text-red-600">−{pctV}%</span>}
              </>
            ) : (
              <span>{formatCop(precioV)}</span>
            )}
            {usaStockPorVariante ? (
              <span className={clsx('font-medium', agotada ? 'text-red-600/90' : 'text-emerald-700/90')}>
                {agotada ? 'Agotado' : `${dispV} disp.`}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    )
  }

  const VariantSelectors = ({ className }: { className?: string }) =>
    hasVariants ? (
      <div className={clsx('space-y-4', className)}>
        {gruposVariantes.length === 1 ? (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
              Elegí {gruposVariantes[0]!.tipo.toLowerCase()}
            </p>
            <div className="flex flex-wrap gap-2">
              <OriginalChip />
              {gruposVariantes[0]!.items.map((v) => (
                <VariantChip key={v.id} v={v} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
                Versión
              </p>
              <div className="flex flex-wrap gap-2">
                <OriginalChip />
              </div>
            </div>
            {gruposVariantes.map((g) => (
              <div key={g.tipo} className="space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
                  {g.tipo}
                </p>
                <div className="flex flex-wrap gap-2">{g.items.map((v) => <VariantChip key={v.id} v={v} />)}</div>
              </div>
            ))}
          </>
        )}
      </div>
    ) : null

  const TallaChip = ({ t }: { t: McProductoTalla }) => {
    const active = t.id === selectedTalla?.id
    const dispT = stockTallaUi(product, t, lines)
    const agotada = dispT < 1

    return (
      <button
        key={t.id}
        type="button"
        disabled={agotada}
        onClick={() => setSelectedTid(t.id)}
        className={clsx(
          'inline-flex min-h-[44px] min-w-[3rem] items-center justify-center rounded-xl border px-3.5 py-2 text-[13px] font-bold transition',
          agotada && 'cursor-not-allowed opacity-40',
          active && !agotada
            ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)] ring-1 ring-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] shadow-sm'
            : !agotada &&
                'mc-pc-border bg-[var(--cat-surface)] text-[var(--cat-text)] hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)] hover:shadow-sm',
        )}
      >
        <span className="leading-none">{t.nombre}</span>
      </button>
    )
  }

  const TallaSelectors = ({ className }: { className?: string }) =>
    hasTallas ? (
      <div className={clsx('space-y-2.5', className)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
          Elegí tu talla
        </p>
        <div className="flex flex-wrap gap-2">{tallas.map((t) => <TallaChip key={t.id} t={t} />)}</div>
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
        className="mc-pc-add-to-cart-btn min-h-[52px] w-full rounded-2xl bg-[#0a0a0a] px-4 py-3.5 text-[15px] font-semibold text-white shadow-sm transition duration-200 ease-in-out hover:bg-neutral-800 disabled:opacity-40 sm:min-h-[48px] sm:text-base"
        disabled={disp < 1 || (hasTallas && !selectedTalla)}
        onClick={(e) => sumar(qtyToAdd, e.currentTarget)}
      >
        Añadir al carrito
      </button>
      {disp >= DOCENA ? (
        <button
          type="button"
          className="mc-pc-add-to-cart-btn min-h-[48px] w-full rounded-2xl border border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] bg-[var(--cat-surface)] px-4 py-3 text-[14px] font-semibold text-[var(--cat-text)] transition duration-200 ease-in-out"
          onClick={(e) => sumar(DOCENA, e.currentTarget)}
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
          <div className="mt-4">
            <ProductImageGallery
              urls={galeriaUrls}
              alt={product.nombre}
              isBold={isBold}
              onOpenFullscreen={(index) => setFullscreen({ index, alt: product.nombre })}
            />
          </div>
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
          <div
            className={clsx(
              'mt-2 sm:mt-3',
              isBold && 'text-center',
              isBoutique && 'text-center md:text-left',
              preset === 'minimal' && 'text-left',
              (preset === 'ios' || preset === 'morning') && 'text-left',
            )}
          >
            {enOferta && listaPrice > effectivePrice ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-2xl font-bold tabular-nums text-[var(--cat-accent)] sm:text-3xl">
                  {formatCop(effectivePrice)}
                </p>
                <p className="text-base font-medium tabular-nums text-[var(--cat-muted)] line-through sm:text-lg">
                  {formatCop(listaPrice)}
                </p>
                {productoPorcentajeDescuentoDisplay(product, selected ?? undefined) != null && (
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    −{productoPorcentajeDescuentoDisplay(product, selected ?? undefined)}%
                  </span>
                )}
              </div>
            ) : (
              <p className="text-2xl font-semibold tabular-nums text-[var(--cat-text)] sm:text-3xl">
                {formatCop(effectivePrice)}
              </p>
            )}
            {enOferta && (
              <p className="mt-2 inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                Oferta especial
              </p>
            )}
          </div>

          {product.descripcion?.trim() ? (
            <div
              className={clsx(
                'mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_35%,var(--cat-surface)_65%)] px-4 py-3.5 sm:mt-5 sm:px-5 sm:py-4',
                (isBold || isBoutique) && 'text-center md:text-left',
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
                Descripción
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--cat-text)] sm:text-[15px]">
                {product.descripcion.trim()}
              </p>
            </div>
          ) : null}

          <VariantSelectors
            className={clsx('mt-5', (isBold || isBoutique) && 'md:mx-auto md:max-w-md')}
          />

          <TallaSelectors
            className={clsx('mt-5', (isBold || isBoutique) && 'md:mx-auto md:max-w-md')}
          />

          <CtaGroup className={clsx('mt-6 max-md:hidden', isBold && 'mx-auto max-w-xl')} />

          <p
            className={clsx(
              'mt-4 text-sm leading-relaxed text-[var(--cat-muted)]',
              (isBold || isBoutique) && 'text-center md:text-left',
            )}
          >
            {hasTallas && selectedTalla ? (
              <>
                Talla {selectedTalla.nombre}
                <> · {disp > 0 ? `${disp} disponibles` : 'Sin stock en esta talla'}</>
              </>
            ) : hasVariants && selected ? (
              <>
                {selected.tipo ? `${selected.tipo}: ${selected.nombre}` : selected.nombre}
                {usaStockPorVariante ? (
                  <> · {disp > 0 ? `${disp} disponibles` : 'Sin stock en esta opción'}</>
                ) : (
                  <> · stock general {product.stock}</>
                )}
              </>
            ) : hasVariants && actsAsOriginal ? (
              <>
                {selectedOption === 'original' ? 'Original' : 'Producto base'}
                {usaStockPorVariante ? (
                  <> · {disp > 0 ? `${disp} disponibles` : 'Sin stock'}</>
                ) : (
                  <> · stock general {product.stock}</>
                )}
              </>
            ) : (
              <>Stock {product.stock}{enCarrito > 0 ? ` · podés sumar hasta ${disp} más` : ` · podés pedir ${disp}`}</>
            )}
          </p>

          {galeriaUrls.length > 0 && product.mostrarDescargaImagen ? (
            <button
              type="button"
              className="mt-5 w-full rounded-full border mc-pc-border bg-transparent px-4 py-2.5 text-xs font-medium text-[var(--cat-text)] transition duration-200 ease-in-out hover:opacity-80 sm:mt-6 sm:max-w-xs sm:py-2"
              onClick={() =>
                void downloadCatalogImage(galeriaUrls[0]!, `${product.nombre.replace(/\s+/g, '_')}.jpg`, {
                  getFirebaseStorage: () => (firebaseStorageConfigured ? getStorageApp() : null),
                })
              }
            >
              Descargar imagen
            </button>
          ) : null}
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
            {(hasVariants && (selected || selectedOption === 'original')) || (hasTallas && selectedTalla) ? (
              <p className="truncate text-[11px] text-[var(--cat-muted)]">
                {[
                  hasVariants && selectedOption === 'original' ? 'Original' : null,
                  hasVariants && selected
                    ? selected.tipo
                      ? `${selected.tipo}: ${selected.nombre}`
                      : selected.nombre
                    : null,
                  hasTallas && selectedTalla ? `Talla ${selectedTalla.nombre}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            <p className="text-[15px] font-semibold tabular-nums text-[var(--cat-text)]">
              {enOferta && listaPrice > effectivePrice ? (
                <>
                  <span className="text-[var(--cat-accent)]">{formatCop(effectivePrice)}</span>{' '}
                  <span className="text-[12px] font-medium text-[var(--cat-muted)] line-through">
                    {formatCop(listaPrice)}
                  </span>
                </>
              ) : (
                formatCop(effectivePrice)
              )}
            </p>
          </div>
        </div>
        <CtaGroup className="mt-1 pb-1" />
      </div>

      <FullscreenImageOverlay
        urls={galeriaUrls}
        initialIndex={fullscreen?.index ?? 0}
        alt={fullscreen?.alt ?? ''}
        open={fullscreen != null}
        onClose={() => setFullscreen(null)}
      />
    </div>
  )
}
