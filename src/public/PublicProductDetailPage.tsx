import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import clsx from 'clsx'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { downloadCatalogImage } from '@/catalog-local/downloadCatalogImage'
import { FullscreenImageOverlay } from '@/catalog-local/FullscreenImageOverlay'
import { ProductGalleryActionButton, ProductImageGallery } from '@/public/ProductImageGallery'
import { firebaseConfigured, firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { resolvePublicCatalogTheme } from '@/lib/catalogTheme'
import { mcProductosCollection } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import { buildCatalogProductShareUrl } from '@/lib/catalogShareUrl'
import {
  applyStoreProductSeo,
  clearStoreProductSeo,
} from '@/lib/storePageSeo'
import { CatalogFavoriteButton } from '@/public/CatalogFavoriteButton'
import { CatalogTrustSignals } from '@/public/CatalogTrustSignals'
import { CatalogRelatedProducts } from '@/public/CatalogRelatedProducts'
import { CatalogProductReviews } from '@/public/CatalogProductReviews'
import { CatalogCartShippingEstimator } from '@/public/CatalogCartShippingEstimator'
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
  productoUsaMatrizSku,
  stockDisponibleRopa,
} from '@/lib/productoSkus'
import { tallasParaVarianteZapatos } from '@/lib/productoZapatos'
import {
  stockDisponibleTalla,
  stockTallaUi,
  tallaEnCarrito,
  tallasValidas,
} from '@/lib/productoTallas'
import { buildProductShareData, canUseWebShare, shareSafe } from '@/lib/webShare'
import type { McComboColorSeleccion, McProducto, McProductoTalla, McProductoVariante } from '@/types/mc'
import {
  comboIncluyeResumen,
  comboPrecioSeparado,
  comboStockDisponible,
  comboClienteSlots,
  comboColorSeleccionCompleta,
  comboColorSeleccionResumen,
  esProductoCombo,
  type ProductoLookup,
} from '@/lib/comboProducto'
import { ComboColorPicker } from '@/components/producto/ComboColorPicker'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import { usePublicProductViewTracking } from '@/public/usePublicCatalogAnalytics'
import { useCartAddAnimation } from '@/public/cart-animation/CartAddAnimationContext'
import { CART_FLY_DURATION_MS } from '@/public/cart-animation/flyBezier'
import { McPublicPageLoadingFallback } from '@/components/McPublicPageLoadingFallback'

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

function buildGalleryUrls(
  prod: McProducto,
  opts: {
    hasVariants: boolean
    selected?: McProductoVariante
    esZapatos?: boolean
  },
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (url?: string) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    out.push(url)
  }

  const { hasVariants, selected, esZapatos } = opts

  if (hasVariants && selected) {
    if (selected.imageUrl) add(selected.imageUrl)
    for (const url of selected.galeriaImagenes ?? []) add(url)
    if (out.length > 0) return out
  }

  if (esZapatos && prod.imagenPrincipalColorId) {
    const principal = prod.variantes?.find((v) => v.id === prod.imagenPrincipalColorId)
    if (principal) {
      if (principal.imageUrl) add(principal.imageUrl)
      for (const url of principal.galeriaImagenes ?? []) add(url)
      if (out.length > 0) return out
    }
  }

  if (esZapatos) return out

  add(prod.imageUrl)
  for (const url of prod.galeriaImagenes ?? []) add(url)
  return out
}

export function PublicProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  const { slug, to, storePublicUrl } = usePublicStore()
  const { tenantId, tenant, platformSettings, loading, error } = useCatalogTenant()
  const { add, lines, subtotalCop, totalPiezas } = useCatalogoSimpleCart()
  const { playAddToCartFly } = useCartAddAnimation()
  const [p, setP] = useState<(McProducto & { id: string }) | null>(null)
  const [productResolved, setProductResolved] = useState(false)
  const [fullscreen, setFullscreen] = useState<{ index: number; alt: string } | null>(null)
  const [selectedOption, setSelectedOption] = useState<'none' | 'original' | string>('none')
  const [selectedTid, setSelectedTid] = useState<string | null>(null)
  const [qtyToAdd, setQtyToAdd] = useState(1)
  const [componentLookup, setComponentLookup] = useState<ProductoLookup>(new Map())
  const [comboColorSeleccion, setComboColorSeleccion] = useState<McComboColorSeleccion[]>([])

  const preset = tenant ? resolvePublicCatalogTheme(tenant).preset : 'morning'

  useEffect(() => {
    if (!firebaseConfigured || !tenantId || !productId) {
      setP(null)
      setProductResolved(!productId)
      return
    }
    setProductResolved(false)
    const db = getDb()
    const ref = doc(db, mcProductosCollection(tenantId), productId)
    return onSnapshot(
      ref,
      (snap) => {
        setProductResolved(true)
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
      },
      () => {
        setProductResolved(true)
        setP(null)
      },
    )
  }, [tenantId, productId])

  useEffect(() => {
    if (!tenantId || !p || !esProductoCombo(p)) {
      setComponentLookup(new Map())
      return
    }
    let cancelled = false
    void (async () => {
      const map: ProductoLookup = new Map()
      const db = getDb()
      for (const c of p.comboComponentes ?? []) {
        if (map.has(c.productId)) continue
        const snap = await getDoc(doc(db, mcProductosCollection(tenantId), c.productId))
        if (snap.exists()) map.set(c.productId, { id: snap.id, ...(snap.data() as Omit<McProducto, 'id'>) })
      }
      if (!cancelled) setComponentLookup(map)
    })()
    return () => {
      cancelled = true
    }
  }, [tenantId, p?.id, p?.comboComponentes, p?.updatedAt])

  const prod = p
  const isCombo = prod ? esProductoCombo(prod) : false
  const comboClienteSlotsList = useMemo(
    () => (prod && isCombo ? comboClienteSlots(prod, componentLookup) : []),
    [prod, isCombo, componentLookup],
  )
  const comboPideOpciones = comboClienteSlotsList.length > 0
  const comboOpcionesOk = comboColorSeleccionCompleta(prod ?? { comboComponentes: [] }, componentLookup, comboColorSeleccion)

  useEffect(() => {
    setComboColorSeleccion([])
  }, [prod?.id, prod?.comboPermiteElegirColor, prod?.comboPermiteElegirTalla])
  const vars = prod ? variantesPublicas(prod) : []
  usePublicProductViewTracking(
    productId,
    prod?.nombre,
    prod?.imageUrl ?? prod?.galeriaImagenes?.[0],
  )
  const esZapatos = prod?.tallaModo === 'zapatos'
  const allTallas = prod ? tallasValidas(prod) : []
  const hasVariants = !isCombo && vars.length > 0
  const hasMatrizSku = !isCombo && !!prod && productoUsaMatrizSku(prod)
  const selected =
    hasVariants && typeof selectedOption === 'string' && selectedOption !== 'original' && selectedOption !== 'none'
      ? vars.find((v) => v.id === selectedOption)
      : undefined
  const tallas = useMemo(() => {
    if (!prod || prod.tallaModo !== 'zapatos' || !hasMatrizSku) return allTallas
    if (!selected) return []
    return tallasParaVarianteZapatos(prod, selected.id)
  }, [prod, allTallas, hasMatrizSku, selected?.id])
  const hasTallas = !isCombo && !!(prod?.esRopa && allTallas.length > 0)
  const selectedTalla = hasTallas && selectedTid ? tallas.find((t) => t.id === selectedTid) : undefined
  const isOriginalSelection = hasVariants && selectedOption === 'original'
  const actsAsOriginal = hasVariants && (selectedOption === 'none' || selectedOption === 'original')

  useEffect(() => {
    if (!prod) return
    const vs = variantesPublicas(prod)
    if (vs.length === 0) {
      setSelectedOption('none')
    } else if (prod.tallaModo === 'zapatos') {
      setSelectedOption((prev) => {
        if (prev !== 'none' && prev !== 'original' && vs.some((v) => v.id === prev)) return prev
        const principal = prod.imagenPrincipalColorId
          ? vs.find((v) => v.id === prod.imagenPrincipalColorId)
          : undefined
        if (principal) return principal.id
        if (vs.length === 1) return vs[0]!.id
        return vs[0]!.id
      })
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
  }, [prod?.id, prod?.updatedAt, prod?.esRopa, prod?.tallaModo, prod?.imagenPrincipalColorId])

  useEffect(() => {
    if (prod?.tallaModo !== 'zapatos') return
    setSelectedTid((prev) => (prev && tallas.some((t) => t.id === prev) ? prev : null))
  }, [prod?.tallaModo, selected?.id, tallas])

  const galeriaUrls = useMemo(
    () =>
      prod
        ? buildGalleryUrls(prod, {
            hasVariants,
            selected,
            esZapatos,
          })
        : [],
    [prod, hasVariants, selected, esZapatos],
  )

  const listaPrice =
    selected && prod ? productoPrecioLista(prod, selected) : prod ? productoPrecioLista(prod) : 0
  const effectivePrice =
    selected && prod ? productoPrecioVenta(prod, selected) : prod ? productoPrecioVenta(prod) : 0
  const enOferta = prod ? productoTieneDescuento(prod) : false

  useEffect(() => {
    if (!prod || !tenant || !slug) return
    applyStoreProductSeo({
      nombreTienda: tenant.nombreTienda,
      productName: prod.nombre,
      description: prod.descripcion,
      imageUrl: galeriaUrls[0] || prod.imageUrl,
      priceCop: effectivePrice,
      canonicalUrl: storePublicUrl(`/p/${prod.id}`),
      availability: (prod.stock ?? 0) > 0 ? 'InStock' : 'OutOfStock',
    })
    return () => clearStoreProductSeo()
  }, [
    prod?.id,
    prod?.nombre,
    prod?.descripcion,
    prod?.imageUrl,
    prod?.stock,
    tenant?.nombreTienda,
    slug,
    galeriaUrls[0],
    effectivePrice,
    storePublicUrl,
  ])

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
    if (hasMatrizSku && selectedTalla && selected) {
      d = stockDisponibleRopa(prod, { varianteId: selected.id, tallaId: selectedTalla.id }, lines)
    } else if (hasTallas && selectedTalla) {
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
  if (!productResolved) {
    return <McPublicPageLoadingFallback />
  }
  if (!prod || !slug) {
    return (
      <div className="text-center">
        <p className="mc-pc-text">Artículo no disponible.</p>
        <Link to={to('/')} className="mt-4 inline-block text-sm mc-pc-muted underline">
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const product = prod
  const disp = (() => {
    if (isCombo) {
      const base = comboStockDisponible(prod, componentLookup)
      return Math.max(0, base - totalEnCarritoProducto)
    }
    if (hasMatrizSku && selectedTalla && selected) {
      return stockDisponibleRopa(product, { varianteId: selected.id, tallaId: selectedTalla.id }, lines)
    }
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
    if (!isCombo && hasTallas && !selectedTalla) return
    if (!isCombo && hasMatrizSku && !selected) {
      window.alert('Elegí el color antes de añadir al carrito.')
      return
    }
    if (isCombo && comboPideOpciones && !comboColorSeleccionCompleta(product, componentLookup, comboColorSeleccion)) {
      window.alert('Completá color y talla de cada prenda del combo.')
      return
    }
    if (cant > disp) {
      window.alert(`Máximo ${disp} unidades disponibles.`)
      return
    }
    const partes = [product.nombre]
    if (!isCombo && hasVariants && selected) partes.push(selected.nombre)
    if (!isCombo && hasTallas && selectedTalla) partes.push(selectedTalla.nombre)
    const titulo = partes.join(' · ')
    const incluye = isCombo
      ? comboPideOpciones && comboColorSeleccion.length
        ? comboColorSeleccionResumen(product, componentLookup, comboColorSeleccion)
        : comboIncluyeResumen(product, componentLookup).join(', ')
      : undefined
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
        ...(product.referencia?.trim() ? { referencia: product.referencia.trim() } : {}),
        subtitulo: incluye ?? formatCop(effectivePrice),
        precioUnitarioCop: effectivePrice,
        ...(galeriaUrls[0] ? { imageUrl: galeriaUrls[0] } : {}),
        cantidad: cant,
        ...(isCombo ? { esCombo: true } : {}),
        ...(isCombo && comboColorSeleccion.length ? { comboColorSeleccion } : {}),
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
      <Link to={to('/')} className="font-medium text-[var(--cat-text)] transition hover:opacity-75">
        {tenant.nombreTienda}
      </Link>
      <span aria-hidden className="text-[color-mix(in_srgb,var(--cat-muted)_60%,transparent)]">
        /
      </span>
      <span className="line-clamp-1 text-[var(--cat-text)]">{product.nombre}</span>
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
              {!esZapatos ? <OriginalChip /> : null}
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
                {!esZapatos ? <OriginalChip /> : null}
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
    const dispT = stockTallaUi(product, t, lines, hasMatrizSku ? selected?.id : undefined)
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
        {prod?.tallaModo === 'zapatos' && hasMatrizSku && !selected ? (
          <p className="text-[12px] text-[var(--cat-muted)]">Primero elegí un color para ver las tallas disponibles.</p>
        ) : (
          <div className="flex flex-wrap gap-2">{tallas.map((t) => <TallaChip key={t.id} t={t} />)}</div>
        )}
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
        {disp < 1 ? (
          <span className="text-[10px] mc-pc-muted sm:text-[11px]">Sin stock disponible</span>
        ) : product.mostrarStockCatalogo ? (
          <span className="text-[10px] leading-tight mc-pc-muted sm:text-[11px]">
            Hasta {disp} {disp === 1 ? 'unidad' : 'unidades'}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="mc-pc-add-to-cart-btn min-h-[48px] w-full bg-[#0a0a0a] px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition duration-200 ease-in-out hover:bg-neutral-800 disabled:opacity-40 sm:min-h-[48px] sm:py-3.5 sm:text-base"
        disabled={
          disp < 1 ||
          (hasTallas && !selectedTalla) ||
          (hasMatrizSku && !selected) ||
          (isCombo && comboPideOpciones && !comboOpcionesOk)
        }
        onClick={(e) => sumar(qtyToAdd, e.currentTarget)}
      >
        Añadir al carrito
      </button>
      {product.mostrarBotonDocena && disp >= DOCENA ? (
        <button
          type="button"
          className="mc-pc-add-to-cart-btn min-h-[48px] w-full border border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] bg-[var(--cat-surface)] px-4 py-3 text-[14px] font-semibold text-[var(--cat-text)] transition duration-200 ease-in-out hover:border-[color-mix(in_srgb,var(--cat-text)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--cat-text)_4%,var(--cat-surface))] active:scale-[0.99] disabled:opacity-40"
          disabled={disp < DOCENA || (hasTallas && !selectedTalla) || (hasMatrizSku && !selected)}
          onClick={(e) => sumar(DOCENA, e.currentTarget)}
        >
          Añadir 1 docena
        </button>
      ) : null}
    </div>
  )

  const stockLine = (() => {
    if (!product.mostrarStockCatalogo) {
      if (disp < 1) return 'Sin stock'
      return null
    }
    if (hasTallas && selectedTalla) {
      return disp > 0 ? `${disp} disponibles` : 'Sin stock en esta talla'
    }
    if (hasVariants && selected) {
      if (usaStockPorVariante) return disp > 0 ? `${disp} disponibles` : 'Sin stock en esta opción'
      return `Stock ${product.stock}`
    }
    if (hasVariants && actsAsOriginal) {
      if (usaStockPorVariante) return disp > 0 ? `${disp} disponibles` : 'Sin stock'
      return `Stock ${product.stock}`
    }
    if (enCarrito > 0) return `Stock ${product.stock} · podés sumar hasta ${disp} más`
    return `Stock ${product.stock}`
  })()

  return (
    <div className="pb-[7.5rem] md:pb-0">
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
          <div className="max-md:hidden">
            <Breadcrumb />
          </div>
          <div className="md:mt-4">
            <ProductImageGallery
              urls={galeriaUrls}
              alt={product.nombre}
              isBold={isBold}
              onOpenFullscreen={(index) => setFullscreen({ index, alt: product.nombre })}
              overlayActions={
                <>
                  <CatalogFavoriteButton
                    productId={product.id}
                    size="sm"
                    onMedia={false}
                    className="h-9 w-9 rounded-full bg-white/90 p-0 text-[var(--cat-text)] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.35)] ring-1 ring-black/5 backdrop-blur-md hover:bg-white"
                  />
                  {canUseWebShare() ? (
                    <ProductGalleryActionButton
                      label="Compartir"
                      onClick={() =>
                        void shareSafe(
                          buildProductShareData({
                            nombreTienda: tenant.nombreTienda,
                            productName: product.nombre,
                            productUrl: storePublicUrl(`/p/${product.id}`),
                            sharePreviewUrl: buildCatalogProductShareUrl(slug, product.id),
                            priceLabel: formatCop(effectivePrice),
                          }),
                        )
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[1.05rem] w-[1.05rem]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden
                      >
                        <circle cx="18" cy="5" r="2.4" />
                        <circle cx="6" cy="12" r="2.4" />
                        <circle cx="18" cy="19" r="2.4" />
                        <path strokeLinecap="round" d="M8.3 13.2 15.7 17.3M15.7 6.7 8.3 10.8" />
                      </svg>
                    </ProductGalleryActionButton>
                  ) : null}
                </>
              }
            />
          </div>
        </div>

        <div
          className={clsx(
            'mt-4 min-w-0 sm:mt-6 md:mt-0',
            isBold && 'max-w-2xl text-center',
            isBoutique && 'text-center md:text-left',
          )}
        >
          <p
            className={clsx(
              'mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cat-muted)] sm:mb-2 sm:text-[11px] sm:tracking-[0.2em]',
              (isBold || isBoutique) && 'text-center md:text-left',
            )}
          >
            {tenant.nombreTienda}
          </p>

          <h1
            className={clsx(
              'mc-pc-display text-[var(--cat-text)]',
              isBold && 'text-[1.65rem] font-bold leading-tight tracking-tighter sm:text-3xl',
              isBoutique && 'text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-3xl',
              preset === 'minimal' && 'text-left text-xl font-semibold leading-tight sm:text-2xl',
              (preset === 'ios' || preset === 'morning') &&
                'text-left text-[1.65rem] font-semibold leading-tight sm:text-3xl',
            )}
          >
            {product.nombre}
          </h1>

          <div
            className={clsx(
              'mt-1.5 sm:mt-3',
              isBold && 'text-center',
              isBoutique && 'text-center md:text-left',
              preset === 'minimal' && 'text-left',
              (preset === 'ios' || preset === 'morning') && 'text-left',
            )}
          >
            {enOferta && listaPrice > effectivePrice ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-[1.5rem] font-bold tabular-nums text-[var(--cat-accent)] sm:text-3xl">
                  {formatCop(effectivePrice)}
                </p>
                <p className="text-sm font-medium tabular-nums text-[var(--cat-muted)] line-through sm:text-lg">
                  {formatCop(listaPrice)}
                </p>
                {productoPorcentajeDescuentoDisplay(product, selected ?? undefined) != null && (
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    −{productoPorcentajeDescuentoDisplay(product, selected ?? undefined)}%
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[1.5rem] font-semibold tabular-nums text-[var(--cat-text)] sm:text-3xl">
                {formatCop(effectivePrice)}
              </p>
            )}
            {enOferta && (
              <p className="mt-1.5 inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                Oferta especial
              </p>
            )}
          </div>

          <div
            className={clsx(
              'mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:mt-3',
              (isBold || isBoutique) && 'justify-center md:justify-start',
            )}
          >
            {slug ? (
              <CatalogCartShippingEstimator
                slug={slug}
                tenant={tenant}
                platformSettings={platformSettings}
                subtotalCop={subtotalCop > 0 ? subtotalCop : effectivePrice}
                totalPiezas={totalPiezas > 0 ? totalPiezas : 1}
                className="mt-0"
              />
            ) : null}
            {stockLine ? (
              <p className="text-[11px] tabular-nums text-[var(--cat-muted)] sm:text-[12px]">{stockLine}</p>
            ) : null}
          </div>

          {product.descripcion?.trim() ? (
            <div
              className={clsx(
                'mt-3 sm:mt-5',
                (isBold || isBoutique) && 'text-center md:text-left',
              )}
            >
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--cat-muted)] sm:rounded-2xl sm:border sm:border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] sm:bg-[color-mix(in_srgb,var(--cat-bg)_35%,var(--cat-surface)_65%)] sm:px-5 sm:py-4 sm:text-[15px] sm:text-[var(--cat-text)]">
                <span className="mb-1.5 hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)] sm:mb-2 sm:block">
                  Descripción
                </span>
                {product.descripcion.trim()}
              </p>
            </div>
          ) : null}

          {isCombo ? (
            <div className="mt-3 rounded-xl border border-violet-200/60 bg-violet-50/40 px-3.5 py-3 sm:mt-5 sm:rounded-2xl sm:px-4 sm:py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-violet-800">Incluye</p>
              {!comboPideOpciones ? (
                <ul className="mt-1.5 space-y-1 text-[13px] text-violet-950 sm:mt-2 sm:text-[14px]">
                  {comboIncluyeResumen(product, componentLookup).map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[13px] text-violet-950 sm:mt-2 sm:text-[14px]">
                  Elegí color y/o talla de cada prenda en el selector de abajo.
                </p>
              )}
              {product.comboPrecioSeparadoCop != null &&
              product.comboPrecioSeparadoCop > effectivePrice ? (
                <p className="mt-1.5 text-[12px] font-medium text-emerald-700 sm:mt-2 sm:text-[13px]">
                  Ahorrás {formatCop(product.comboPrecioSeparadoCop - effectivePrice)} vs comprar por separado
                </p>
              ) : comboPrecioSeparado(product, componentLookup) > effectivePrice ? (
                <p className="mt-1.5 text-[12px] font-medium text-emerald-700 sm:mt-2 sm:text-[13px]">
                  Ahorrás {formatCop(comboPrecioSeparado(product, componentLookup) - effectivePrice)} vs comprar por
                  separado
                </p>
              ) : null}
            </div>
          ) : null}

          {isCombo && comboPideOpciones ? (
            <div className="mt-3 sm:mt-5">
              <ComboColorPicker
                slots={comboClienteSlotsList}
                products={componentLookup}
                value={comboColorSeleccion}
                onChange={setComboColorSeleccion}
                variant="catalog"
              />
            </div>
          ) : null}

          <VariantSelectors
            className={clsx('mt-3.5 sm:mt-5', (isBold || isBoutique) && 'md:mx-auto md:max-w-md')}
          />

          <TallaSelectors
            className={clsx('mt-3.5 sm:mt-5', (isBold || isBoutique) && 'md:mx-auto md:max-w-md')}
          />

          <CtaGroup className={clsx('mt-5 max-md:hidden sm:mt-6', isBold && 'mx-auto max-w-xl')} />

          <CatalogTrustSignals
            tenant={tenant}
            className={clsx('mt-3 sm:mt-4', isBold && 'mx-auto max-w-xl')}
          />

          {galeriaUrls.length > 0 && product.mostrarDescargaImagen ? (
            <button
              type="button"
              className="mc-pc-btn mt-3 w-full border mc-pc-border bg-transparent px-4 py-2 text-xs font-medium text-[var(--cat-text)] transition duration-200 ease-in-out hover:opacity-80 sm:mt-5 sm:max-w-xs sm:py-2.5"
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

      {tenantId ? <CatalogRelatedProducts tenantId={tenantId} product={product} /> : null}

      {tenantId ? (
        <CatalogProductReviews
          tenantId={tenantId}
          productId={product.id}
          productName={product.nombre}
          ratingAvg={product.ratingAvg}
          ratingCount={product.ratingCount}
        />
      ) : null}

      <p className="mt-6 md:mt-10">
        <Link
          to={to('/')}
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
