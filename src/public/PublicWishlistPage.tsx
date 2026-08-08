import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { formatCop } from '@/lib/formatCop'
import { mcProductosCollection } from '@/lib/mcCollections'
import { productoPrecioVenta } from '@/lib/productoDescuento'
import type { McProducto } from '@/types/mc'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import {
  buildWishlistCheckoutPath,
  getCatalogWishlist,
  productoRequiereOpcionCompra,
  wishlistCallableErrorMessage,
  wishlistItemPendingQty,
  wishlistItemToCartLine,
  type WishlistPublicView,
} from '@/lib/wishlist'

function formatoCiudad(ciudad: string, depto?: string): string {
  const c = ciudad.trim()
  const d = (depto || '').trim()
  if (!c) return d
  if (!d) return c
  const same = c.toLocaleLowerCase('es') === d.toLocaleLowerCase('es')
  return same ? c : `${c}, ${d}`
}

export function PublicWishlistPage() {
  const { wishlistId: wishlistIdParam } = useParams()
  const wishlistId = wishlistIdParam?.trim() || ''
  const { slug, to } = usePublicStore()
  const navigate = useNavigate()
  const { tenantId, tenant, loading: tenantLoading, error: tenantError } = useCatalogTenant()
  const { add, restoreLines } = useCatalogoSimpleCart()

  const [list, setList] = useState<WishlistPublicView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const [busyProductId, setBusyProductId] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || !wishlistId || !firebaseConfigured) {
      setLoading(false)
      setError('Lista no disponible.')
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const data = await getCatalogWishlist(slug, wishlistId)
        if (!cancelled) {
          setList(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setList(null)
          setError(wishlistCallableErrorMessage(e, 'No encontramos esta lista de regalos.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, wishlistId])

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) return
    const q = query(
      collection(getDb(), mcProductosCollection(tenantId)),
      where('activo', '==', true),
      where('enCatalogo', '==', true),
      orderBy('orden', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [tenantId])

  const productsById = useMemo(() => new Map(rows.map((p) => [p.id, p])), [rows])

  const pendingItems = useMemo(() => {
    if (!list) return []
    return list.items.filter((i) => wishlistItemPendingQty(i) > 0)
  }, [list])

  const heroImage = useMemo(() => {
    if (!list) return null
    for (const item of list.items) {
      const product = productsById.get(item.productId)
      const img = item.imageUrl || product?.imageUrl || product?.galeriaImagenes?.[0]
      if (img) return img
    }
    return null
  }, [list, productsById])

  const comprarItem = useCallback(
    (productId: string, varianteId?: string, tallaId?: string) => {
      if (!list) return
      const item = list.items.find(
        (i) =>
          i.productId === productId &&
          (i.varianteId || '') === (varianteId || '') &&
          (i.tallaId || '') === (tallaId || ''),
      )
      if (!item) return
      const product = productsById.get(productId)
      if (product && productoRequiereOpcionCompra(product) && !item.varianteId && !item.tallaId) {
        navigate(to(`/p/${productId}`))
        return
      }
      setBusyProductId(productId)
      const line = wishlistItemToCartLine(item, product)
      if (line) {
        add(line)
        navigate(to(buildWishlistCheckoutPath(list.id)))
      } else {
        navigate(to(`/p/${productId}`))
      }
      setBusyProductId(null)
    },
    [list, productsById, add, navigate, to],
  )

  function comprarTodosDisponibles() {
    if (!list) return
    const lines = []
    for (const item of pendingItems) {
      const product = productsById.get(item.productId)
      if (product && productoRequiereOpcionCompra(product) && !item.varianteId && !item.tallaId) {
        continue
      }
      const line = wishlistItemToCartLine(item, product)
      if (line) lines.push(line)
    }
    if (lines.length === 0) {
      const firstNeed = pendingItems.find((i) => {
        const p = productsById.get(i.productId)
        return p && productoRequiereOpcionCompra(p) && !i.varianteId && !i.tallaId
      })
      if (firstNeed) navigate(to(`/p/${firstNeed.productId}`))
      return
    }
    restoreLines(lines)
    navigate(to(buildWishlistCheckoutPath(list.id)))
  }

  if (tenantLoading || loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center px-4">
        <p className="text-sm tracking-wide text-[var(--cat-muted)]">Preparando la lista…</p>
      </div>
    )
  }
  if (tenantError) {
    return <p className="py-12 text-center text-sm text-red-600">{tenantError}</p>
  }
  if (error || !list) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mc-pc-display text-xl font-semibold text-[var(--cat-text)]">Lista no encontrada</p>
        <p className="mt-2 text-sm text-[var(--cat-muted)]">{error ?? 'Puede que el link esté incompleto.'}</p>
        <Link
          to={to('/')}
          className="mc-pc-btn mt-6 inline-flex bg-[var(--cat-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
        >
          Ir a la tienda
        </Link>
      </div>
    )
  }

  const closed = list.estado === 'cerrada' || pendingItems.length === 0
  const storeName = tenant?.nombreTienda?.trim() || 'Tienda'
  const destino = formatoCiudad(list.envioCiudad, list.envioDepartamento)
  const firstName = list.destinatarioNombre.trim().split(/\s+/)[0] || list.destinatarioNombre

  return (
    <div className="relative pb-24 sm:pb-16">
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(28vh,220px)] overflow-hidden sm:h-[min(48vh,380px)]"
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            className="h-full w-full scale-105 object-cover opacity-[0.12] blur-2xl sm:opacity-[0.14]"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--cat-bg)_55%,transparent)_0%,var(--cat-bg)_78%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-3 sm:px-6 sm:pt-10">
        <nav className="flex items-center gap-2 text-[11px] text-[var(--cat-muted)] sm:text-[12px]" aria-label="Lista de regalos">
          <Link to={to('/')} className="font-medium text-[var(--cat-text)] transition hover:opacity-70">
            {storeName}
          </Link>
          <span aria-hidden className="opacity-40">
            /
          </span>
          <span>Lista de regalos</span>
        </nav>

        {/* Hero — compact on mobile, airy on desktop */}
        <header className="mx-auto mt-4 max-w-2xl text-center sm:mt-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--cat-muted)] sm:text-[11px] sm:tracking-[0.22em]">
            Para {list.destinatarioNombre}
          </p>
          <h1 className="mc-pc-display mt-1.5 text-[1.65rem] font-semibold leading-[1.15] tracking-tight text-[var(--cat-text)] sm:mt-3 sm:text-5xl">
            {list.titulo}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-snug text-[var(--cat-muted)] sm:mt-4 sm:text-base sm:leading-relaxed">
            {list.mensaje?.trim() ||
              `Elegí un regalo. Vos pagás y lo enviamos a ${firstName}.`}
          </p>
          {destino ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--cat-muted)] sm:mt-4 sm:gap-2 sm:text-[12px]">
              <svg className="h-3.5 w-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Envío a {destino}
            </p>
          ) : null}
        </header>

        {closed ? (
          <div className="mx-auto mt-10 max-w-md text-center sm:mt-16">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-text)_8%,transparent)] text-[var(--cat-text)]">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mc-pc-display mt-5 text-xl font-semibold text-[var(--cat-text)]">
              Esta lista ya está completa
            </p>
            <p className="mt-2 text-sm text-[var(--cat-muted)]">
              Gracias por la buena onda. Podés seguir mirando la tienda.
            </p>
            <Link
              to={to('/')}
              className="mc-pc-btn mt-6 inline-flex bg-[var(--cat-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-end justify-between gap-3 sm:mt-14 sm:gap-4">
              <div>
                <h2 className="mc-pc-display text-[15px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-xl">
                  Elegí un regalo
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--cat-muted)] sm:mt-1 sm:text-[13px]">
                  {pendingItems.length} disponible{pendingItems.length === 1 ? '' : 's'}
                  {list.items.length !== pendingItems.length
                    ? ` · ${list.items.length - pendingItems.length} ya regalado${list.items.length - pendingItems.length === 1 ? '' : 's'}`
                    : ''}
                </p>
              </div>
              {pendingItems.length > 1 ? (
                <button
                  type="button"
                  onClick={comprarTodosDisponibles}
                  className="hidden text-[13px] font-semibold text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_45%,transparent)] underline-offset-4 transition hover:opacity-70 sm:inline"
                >
                  Regalar varios
                </button>
              ) : null}
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-x-2.5 gap-y-5 sm:mt-10 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4">
              {list.items.map((item, index) => {
                const product = productsById.get(item.productId)
                const pending = wishlistItemPendingQty(item)
                const bought = item.compradoCantidad ?? 0
                const img = item.imageUrl || product?.imageUrl || product?.galeriaImagenes?.[0]
                const price =
                  item.precioUnitarioCop && item.precioUnitarioCop > 0
                    ? item.precioUnitarioCop
                    : product
                      ? productoPrecioVenta(product)
                      : 0
                const needsOptions =
                  !!product && productoRequiereOpcionCompra(product) && !item.varianteId && !item.tallaId
                const gifted = pending <= 0
                const unavailable = !product || gifted

                return (
                  <li
                    key={`${item.productId}:${item.varianteId || ''}:${item.tallaId || ''}`}
                    className="group"
                    style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                  >
                    <div className="relative overflow-hidden rounded-[1.15rem] bg-[color-mix(in_srgb,var(--cat-muted)_8%,var(--cat-surface)_92%)]">
                      <Link
                        to={to(`/p/${item.productId}`)}
                        className="block aspect-[3/4] overflow-hidden"
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={item.titulo}
                            className={clsx(
                              'h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]',
                              gifted && 'opacity-55 grayscale-[0.35]',
                            )}
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-[var(--cat-muted)]">
                            Sin foto
                          </div>
                        )}
                      </Link>

                      {gifted ? (
                        <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-[color-mix(in_srgb,var(--cat-text)_55%,transparent)] via-transparent to-transparent p-3">
                          <span className="rounded-full bg-[var(--cat-surface)]/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[var(--cat-text)]">
                            Ya regalado
                          </span>
                        </div>
                      ) : (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[color-mix(in_srgb,var(--cat-text)_45%,transparent)] via-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] to-transparent p-2.5 pt-10">
                          <button
                            type="button"
                            disabled={busyProductId === item.productId || unavailable}
                            onClick={() => comprarItem(item.productId, item.varianteId, item.tallaId)}
                            className="mc-pc-btn w-full bg-[var(--cat-accent)] py-2.5 text-[12px] font-semibold text-[var(--cat-accent-text)] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] disabled:opacity-40"
                          >
                            {needsOptions ? 'Elegir y regalar' : 'Regalar'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 px-0.5">
                      <Link
                        to={to(`/p/${item.productId}`)}
                        className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--cat-text)] transition hover:opacity-70 sm:text-[14px]"
                      >
                        {item.titulo}
                      </Link>
                      {item.subtitulo ? (
                        <p className="mt-0.5 line-clamp-1 text-[12px] text-[var(--cat-muted)]">{item.subtitulo}</p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="text-[13px] font-semibold tabular-nums text-[var(--cat-text)]">
                          {price > 0 ? formatCop(price) : '—'}
                        </p>
                        {!gifted && bought > 0 ? (
                          <p className="text-[11px] text-[var(--cat-muted)]">Quedan {pending}</p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        <p className="mx-auto mt-8 max-w-sm text-center text-[11px] leading-relaxed text-[var(--cat-muted)] sm:mt-14 sm:text-[12px]">
          El envío va a la dirección de {firstName}. Vos solo elegís y pagás.
        </p>
      </div>

      {/* Mobile sticky bar */}
      {!closed && pendingItems.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_92%,transparent)] px-4 py-3 backdrop-blur-md sm:hidden">
          <button
            type="button"
            onClick={comprarTodosDisponibles}
            className="mc-pc-btn w-full bg-[var(--cat-accent)] py-3.5 text-sm font-semibold text-[var(--cat-accent-text)]"
          >
            {pendingItems.length === 1 ? 'Regalar ahora' : `Regalar · ${pendingItems.length} disponibles`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
