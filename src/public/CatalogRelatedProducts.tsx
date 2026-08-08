import { Link } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { useEffect, useMemo, useRef, useState } from 'react'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import { pickRelatedProducts } from '@/lib/catalogRelatedProducts'
import { formatCop } from '@/lib/formatCop'
import { productoPrecioVenta, productoTieneDescuento } from '@/lib/productoDescuento'
import type { McProducto } from '@/types/mc'
import { usePublicStore } from '@/public/PublicStoreContext'
import { CatalogFavoriteButton } from '@/public/CatalogFavoriteButton'

type Props = {
  tenantId: string
  product: McProducto & { id: string }
}

export function CatalogRelatedProducts({ tenantId, product }: Props) {
  const { to } = usePublicStore()
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) return
    const db = getDb()
    const q = query(
      collection(db, mcProductosCollection(tenantId)),
      where('activo', '==', true),
      where('enCatalogo', '==', true),
      orderBy('orden', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [tenantId])

  const related = useMemo(() => pickRelatedProducts(product, rows, 8), [product, rows])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const sync = () => {
      const max = el.scrollWidth - el.clientWidth
      setCanPrev(el.scrollLeft > 4)
      setCanNext(max > 4 && el.scrollLeft < max - 4)
    }

    const onWheel = (e: WheelEvent) => {
      const dominantX = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      const delta = dominantX ? e.deltaX : e.deltaY
      if (Math.abs(delta) < 1) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const atStart = el.scrollLeft <= 0 && delta < 0
      const atEnd = el.scrollLeft >= max - 1 && delta > 0
      if (atStart || atEnd) return
      e.preventDefault()
      el.scrollLeft += delta
    }

    sync()
    el.addEventListener('scroll', sync, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(el)
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      el.removeEventListener('wheel', onWheel)
      ro?.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [related.length])

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current
    if (!el) return
    const step = Math.max(180, Math.round(el.clientWidth * 0.72))
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  if (related.length === 0) return null

  return (
    <section className="mt-8 min-w-0 border-t border-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)] pt-6 sm:mt-12 sm:pt-10">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="mc-pc-display text-base font-semibold tracking-tight text-[var(--cat-text)] sm:text-xl">
            También te puede gustar
          </h2>
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            disabled={!canPrev}
            aria-label="Ver anteriores"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] text-[var(--cat-text)] transition hover:bg-[color-mix(in_srgb,var(--cat-muted)_8%,transparent)] disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            disabled={!canNext}
            aria-label="Ver siguientes"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] text-[var(--cat-text)] transition hover:bg-[color-mix(in_srgb,var(--cat-muted)_8%,transparent)] disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      <div className="relative -mx-4 mt-5 min-w-0 px-4 sm:-mx-6 sm:mt-6 sm:px-6 lg:-mx-8 lg:px-8">
        <ul
          ref={scrollerRef}
          className="mc-pc-related-scroller flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 touch-pan-x sm:gap-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {related.map((p, i) => {
            const img = p.imageUrl || p.galeriaImagenes?.[0]
            const price = productoPrecioVenta(p)
            return (
              <li
                key={p.id}
                className="mc-pc-related-card w-[9.5rem] shrink-0 snap-start sm:w-[11rem]"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <article className="group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)]">
                  <div className="absolute right-2 top-2 z-10">
                    <CatalogFavoriteButton productId={p.id} size="sm" />
                  </div>
                  <Link to={to(`/p/${p.id}`)} className="block">
                    <div className="aspect-[4/5] overflow-hidden bg-[color-mix(in_srgb,var(--cat-muted)_8%,var(--cat-surface)_92%)]">
                      {img ? (
                        <img
                          src={img}
                          alt={p.nombre}
                          loading="lazy"
                          draggable={false}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] text-[var(--cat-muted)]">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-2.5 sm:px-3 sm:py-3">
                      <h3 className="line-clamp-2 text-[12px] font-medium leading-snug text-[var(--cat-text)] sm:text-[13px]">
                        {p.nombre}
                      </h3>
                      <p className="mt-1 text-[13px] font-semibold tabular-nums text-[var(--cat-text)]">
                        {formatCop(price)}
                        {productoTieneDescuento(p) ? (
                          <span className="ml-1 text-[10px] font-bold uppercase text-red-600">Oferta</span>
                        ) : null}
                      </p>
                    </div>
                  </Link>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
