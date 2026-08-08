import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import { productoPrecioVenta } from '@/lib/productoDescuento'
import type { McProducto } from '@/types/mc'
import { useCatalogFavorites } from '@/public/CatalogFavoritesContext'
import { CatalogFavoriteButton } from '@/public/CatalogFavoriteButton'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import { CreateWishlistPanel } from '@/public/wishlist/CreateWishlistPanel'
import { MyWishlistFollowUpCard } from '@/public/wishlist/MyWishlistFollowUpCard'
import { productsToWishlistItems } from '@/lib/wishlist'

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V8M3.5 12h17" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.6-2.4-3.8-3.2-5.2-2.4S4.8 8.4 7 9.5C8.4 10.2 10.4 9.6 12 8zm0 0c1.6-2.4 3.8-3.2 5.2-2.4s1.8 2.8-.4 4C15.6 10.2 13.6 9.6 12 8z"
      />
    </svg>
  )
}

export function PublicFavoritesPage() {
  const { to } = usePublicStore()
  const { tenantId, loading, error } = useCatalogTenant()
  const { favoriteIds } = useCatalogFavorites()
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const [showWishlist, setShowWishlist] = useState(false)
  const [wishlistRefreshKey, setWishlistRefreshKey] = useState(0)

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

  const favorites = useMemo(() => {
    const map = new Map(rows.map((p) => [p.id, p]))
    return favoriteIds.map((id) => map.get(id)).filter((p): p is McProducto & { id: string } => Boolean(p))
  }, [favoriteIds, rows])

  if (loading) return <p className="py-12 text-center text-sm mc-pc-muted">Cargando…</p>
  if (error) return <p className="py-12 text-center text-sm text-red-600">{error}</p>

  return (
    <div className="mx-auto max-w-3xl py-8 sm:py-12">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] mc-pc-muted" aria-label="Favoritos">
        <Link to={to('/')} className="font-medium text-[var(--cat-text)] transition hover:opacity-75">
          Tienda
        </Link>
        <span aria-hidden>/</span>
        <span className="text-[var(--cat-text)]">Favoritos</span>
      </nav>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="mc-pc-display text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-3xl">
          Tus favoritos
        </h1>
        {favorites.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowWishlist((v) => !v)}
            className="mc-pc-btn group inline-flex items-center gap-2 bg-[var(--cat-accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--cat-accent-text)] shadow-[0_8px_20px_-12px_color-mix(in_srgb,var(--cat-accent)_70%,transparent)] transition hover:opacity-95 active:scale-[0.98]"
          >
            <GiftIcon className="h-4 w-4 opacity-90 transition group-hover:scale-110" />
            {showWishlist ? 'Ocultar lista' : 'Lista para regalar'}
          </button>
        ) : null}
      </div>

      <MyWishlistFollowUpCard refreshKey={wishlistRefreshKey} />

      {showWishlist && favorites.length > 0 ? (
        <div className="mt-6">
          <CreateWishlistPanel
            items={productsToWishlistItems(favorites)}
            onClose={() => setShowWishlist(false)}
            onCreated={() => {
              setWishlistRefreshKey((k) => k + 1)
              setShowWishlist(false)
            }}
          />
        </div>
      ) : null}

      {favoriteIds.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_28%,transparent)] px-6 py-12 text-center">
          <p className="font-medium text-[var(--cat-text)]">Todavía no guardaste nada</p>
          <p className="mt-1.5 text-sm text-[var(--cat-muted)]">Tocá el corazón en un producto para guardarlo aquí.</p>
          <Link
            to={to('/')}
            className="mc-pc-btn mt-5 inline-flex bg-[var(--cat-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
          >
            Ir al catálogo
          </Link>
        </div>
      ) : favorites.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--cat-muted)]">
          Tenés {favoriteIds.length} guardados, pero ya no están disponibles en el catálogo.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {favorites.map((p) => {
            const img = p.imageUrl || p.galeriaImagenes?.[0]
            return (
              <li key={p.id} className="relative">
                <div className="absolute right-2 top-2 z-10">
                  <CatalogFavoriteButton productId={p.id} size="sm" />
                </div>
                <Link
                  to={to(`/p/${p.id}`)}
                  className="block overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)]"
                >
                  <div className="aspect-[4/5] bg-[color-mix(in_srgb,var(--cat-muted)_8%,var(--cat-surface)_92%)]">
                    {img ? (
                      <img src={img} alt={p.nombre} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] text-[var(--cat-muted)]">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <h2 className="line-clamp-2 text-[13px] font-medium text-[var(--cat-text)]">{p.nombre}</h2>
                    <p className="mt-1 text-[13px] font-semibold tabular-nums text-[var(--cat-text)]">
                      {formatCop(productoPrecioVenta(p))}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
