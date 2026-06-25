import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { formatCop } from '@/lib/formatCop'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import {
  productoPrecioVenta,
  productoPrecioLista,
  productoTieneDescuento,
} from '@/lib/productoDescuento'
import {
  agruparVariantesPorTipo,
  stockDisponibleVariante,
  variantesPublicas,
  varianteEtiqueta,
} from '@/lib/productoVariantes'
import {
  stockDisponibleTalla,
  tallaEnCarrito,
  tallasValidas,
} from '@/lib/productoTallas'
import { liveRecordPurchase } from '@/live/lib/liveApi'
import { usePublicStore } from '@/public/PublicStoreContext'
import type { McLiveSessionProduct } from '@/types/mc'
import type { McProducto, McProductoVariante, McProductoTalla } from '@/types/mc'

type Props = {
  open: boolean
  sessionProduct: McLiveSessionProduct
  sessionId: string
  displayName: string
  onClose: () => void
}

export function LiveQuickBuySheet({ open, sessionProduct, sessionId, displayName, onClose }: Props) {
  const { slug, to } = usePublicStore()
  const navigate = useNavigate()
  const { add, lines } = useCatalogoSimpleCart()
  const [product, setProduct] = useState<McProducto | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<McProductoVariante | null>(null)
  const [selectedTalla, setSelectedTalla] = useState<McProductoTalla | null>(null)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!open) return
    setQty(1)
    setSelectedVariant(null)
    setSelectedTalla(null)

    const unsubscribers: (() => void)[] = []

    async function loadProduct() {
      if (!slug) return
      const slugSnap = await getDoc(doc(getDb(), 'mc_slugs', slug))
      const tid = slugSnap.data()?.tenantId as string | undefined
      if (!tid) return

      const ref = doc(getDb(), mcProductosCollection(tid), sessionProduct.productId)
      const unsub = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          setProduct(null)
          return
        }
        setProduct({ id: snap.id, ...(snap.data() as Omit<McProducto, 'id'>) })
      })
      unsubscribers.push(unsub)
    }

    void loadProduct()
    return () => unsubscribers.forEach((u) => u())
  }, [open, slug, sessionProduct.productId])

  const vars = product ? variantesPublicas(product) : []
  const hasVariants = vars.length > 0
  const tallas = product ? tallasValidas(product) : []
  const hasTallas = !!(product?.esRopa && tallas.length > 0)
  const gruposVariantes = useMemo(() => agruparVariantesPorTipo(vars), [vars])

  useEffect(() => {
    if (!product || !open) return
    const nextVars = variantesPublicas(product)
    if (nextVars.length === 1) {
      setSelectedVariant(nextVars[0]!)
    } else {
      setSelectedVariant((prev) => (prev && nextVars.some((v) => v.id === prev.id) ? prev : null))
    }
    const nextTallas = tallasValidas(product)
    if (product.esRopa && nextTallas.length === 1) {
      setSelectedTalla(nextTallas[0]!)
    } else {
      setSelectedTalla((prev) => (prev && nextTallas.some((t) => t.id === prev.id) ? prev : null))
    }
  }, [product?.id, product?.updatedAt, open])

  const effectivePrice = product
    ? productoPrecioVenta(product, selectedVariant ?? undefined)
    : sessionProduct.snapshot.precioCop

  const totalEnCarritoProducto = useMemo(() => {
    if (!product) return 0
    return lines.filter((l) => l.productId === product.id).reduce((s, l) => s + l.cantidad, 0)
  }, [lines, product?.id])

  const enCarritoVariante = useMemo(() => {
    if (!product || !selectedVariant) return 0
    return lines
      .filter((l) => l.productId === product.id && l.varianteId === selectedVariant.id)
      .reduce((s, l) => s + l.cantidad, 0)
  }, [lines, product?.id, selectedVariant?.id])

  const disp = useMemo(() => {
    if (!product) return 0
    if (hasTallas && selectedTalla) {
      return stockDisponibleTalla(
        product,
        selectedTalla,
        tallaEnCarrito(lines, product.id, selectedTalla.id),
      )
    }
    if (hasVariants && selectedVariant) {
      return stockDisponibleVariante(
        product,
        selectedVariant,
        enCarritoVariante,
        totalEnCarritoProducto,
      )
    }
    return Math.max(0, Math.floor(product.stock ?? 0) - totalEnCarritoProducto)
  }, [
    product,
    hasTallas,
    selectedTalla,
    hasVariants,
    selectedVariant,
    lines,
    enCarritoVariante,
    totalEnCarritoProducto,
  ])

  const needsVariant = hasVariants && !selectedVariant
  const needsTalla = hasTallas && !selectedTalla
  const canAdd = product && !needsVariant && !needsTalla && disp > 0

  async function handleAddAndCheckout() {
    if (!product || !slug || !canAdd) return
    setAdding(true)
    try {
      const tituloParts = [product.nombre]
      if (selectedVariant) tituloParts.push(varianteEtiqueta(selectedVariant))
      if (selectedTalla?.nombre) tituloParts.push(selectedTalla.nombre)

      add({
        productId: product.id,
        varianteId: selectedVariant?.id,
        tallaId: selectedTalla?.id,
        titulo: tituloParts.join(' · '),
        subtitulo: formatCop(effectivePrice),
        precioUnitarioCop: effectivePrice,
        cantidad: qty,
      })

      void liveRecordPurchase(slug, sessionId, product.nombre, displayName).catch(() => {})

      onClose()
      navigate(to('/checkout'))
    } finally {
      setAdding(false)
    }
  }

  function VariantChip({ v }: { v: McProductoVariante }) {
    const active = selectedVariant?.id === v.id
    const label = varianteEtiqueta(v)
    let dispV = disp
    if (product) {
      const enCart = lines
        .filter((l) => l.productId === product.id && l.varianteId === v.id)
        .reduce((s, l) => s + l.cantidad, 0)
      dispV = stockDisponibleVariante(product, v, enCart, totalEnCarritoProducto)
    }
    const agotada = dispV < 1

    return (
      <button
        type="button"
        disabled={agotada}
        onClick={() => setSelectedVariant(v)}
        className={clsx(
          'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-2 text-sm transition',
          agotada && 'cursor-not-allowed opacity-40',
          active && !agotada
            ? 'border-[var(--cat-accent)] bg-[var(--cat-accent)] text-[var(--cat-accent-text)]'
            : 'border-[var(--cat-muted)]/30 text-[var(--cat-text)]',
        )}
      >
        {v.hex ? (
          <span
            className="h-5 w-5 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: v.hex }}
            aria-hidden
          />
        ) : null}
        <span>{label}</span>
      </button>
    )
  }

  function TallaChip({ t }: { t: McProductoTalla }) {
    const active = selectedTalla?.id === t.id
    const dispT = product
      ? stockDisponibleTalla(product, t, tallaEnCarrito(lines, product.id, t.id))
      : 0
    const agotada = dispT < 1

    return (
      <button
        type="button"
        disabled={agotada}
        onClick={() => setSelectedTalla(t)}
        className={clsx(
          'inline-flex min-h-[44px] min-w-[2.75rem] items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition',
          agotada && 'cursor-not-allowed opacity-40',
          active && !agotada
            ? 'border-[var(--cat-accent)] bg-[var(--cat-accent)] text-[var(--cat-accent-text)]'
            : 'border-[var(--cat-muted)]/30 text-[var(--cat-text)]',
        )}
      >
        {t.nombre}
      </button>
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Cerrar" />
      <div
        className="mc-live-buy-sheet relative z-10 max-h-[min(92dvh,640px)] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--cat-surface,#fff)] p-5 shadow-2xl"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--cat-muted)]/30" />

        <div className="flex gap-4">
          {sessionProduct.snapshot.imageUrl && (
            <img
              src={sessionProduct.snapshot.imageUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
            />
          )}
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-[var(--cat-text)] sm:text-lg">
              {sessionProduct.snapshot.nombre}
            </h3>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--cat-text)] sm:text-xl">
              {formatCop(effectivePrice)}
            </p>
            {product && productoTieneDescuento(product) && (
              <p className="text-xs text-[var(--cat-muted)] line-through">
                {formatCop(productoPrecioLista(product, selectedVariant ?? undefined))}
              </p>
            )}
          </div>
        </div>

        {hasVariants && (
          <div className="mt-5 space-y-4">
            {gruposVariantes.map((g) => (
              <div key={g.tipo}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cat-muted)]">
                  {g.tipo}
                </p>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((v) => (
                    <VariantChip key={v.id} v={v} />
                  ))}
                </div>
              </div>
            ))}
            {needsVariant && (
              <p className="text-xs text-amber-700">Elegí {gruposVariantes[0]?.tipo.toLowerCase() ?? 'una opción'}.</p>
            )}
          </div>
        )}

        {hasTallas && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cat-muted)]">Talla</p>
            <div className="flex flex-wrap gap-2">
              {tallas.map((t) => (
                <TallaChip key={t.id} t={t} />
              ))}
            </div>
            {needsTalla && <p className="mt-2 text-xs text-amber-700">Elegí tu talla.</p>}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--cat-muted)]/30 text-base"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="w-6 text-center text-base font-semibold tabular-nums">{qty}</span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--cat-muted)]/30 text-base"
              onClick={() => setQty((q) => Math.min(disp || 1, q + 1))}
              disabled={disp < 1}
            >
              +
            </button>
          </div>
          <Link to={to('/')} className="text-xs text-[var(--cat-muted)] underline" onClick={onClose}>
            Ver catálogo
          </Link>
        </div>

        {!canAdd && !needsVariant && !needsTalla && product && (
          <p className="mt-3 text-center text-xs text-red-600">Sin stock para esta combinación.</p>
        )}

        <button
          type="button"
          disabled={!canAdd || adding}
          onClick={() => void handleAddAndCheckout()}
          className="mc-live-buy-sheet-cta mt-4 flex w-full items-center justify-center rounded-full bg-[var(--cat-accent)] py-3.5 text-base font-bold text-[var(--cat-accent-text)] transition hover:opacity-90 disabled:opacity-40"
        >
          {adding ? 'Agregando…' : 'Comprar ahora'}
        </button>
      </div>
    </div>
  )
}
