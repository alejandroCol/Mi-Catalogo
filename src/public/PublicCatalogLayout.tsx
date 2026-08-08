import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCallback, useState, type CSSProperties } from 'react'
import clsx from 'clsx'
import {
  CatalogoSimpleCartProvider,
  useCatalogoSimpleCart,
} from '@/catalog-local/CatalogoSimpleCartContext'
import {
  CartAddAnimationProvider,
  useCartAddAnimation,
} from '@/public/cart-animation/CartAddAnimationContext'
import { buildPedidoWhatsappTextSimple, whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'
import { cartLineKey } from '@/catalog-local/cartLineKey'
import { formatCop } from '@/lib/formatCop'
import {
  publicCatalogCssVars,
  publicCatalogPresetClass,
  resolvePublicCatalogTheme,
} from '@/lib/catalogTheme'
import { resolveAnnouncementBar } from '@/lib/announcementBar'
import { resolveCatalogHeaderLayout } from '@/lib/catalogHeaderLayout'
import { storeAboutVisible, storeSocialFooterVisible } from '@/lib/storeBrandFooter'
import { tenantHasPoliticas } from '@/lib/tenantPoliticas'
import { CatalogAnnouncementBar } from '@/public/CatalogAnnouncementBar'
import { CatalogPreviewBanner } from '@/public/CatalogPreviewBanner'
import { PublicCatalogHeader } from '@/public/PublicCatalogHeader'
import { StoreBrandAboutSection } from '@/public/StoreBrandAboutSection'
import { StoreBrandSocialLinks } from '@/public/StoreBrandSocialLinks'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicCatalogVisitTracking } from '@/public/usePublicCatalogAnalytics'
import { usePublicStore } from '@/public/PublicStoreContext'
import { McCatalogModal } from '@/public/McCatalogModal'
import { McOutletBoundary } from '@/components/McOutletBoundary'
import { CatalogFavoritesProvider, useCatalogFavorites } from '@/public/CatalogFavoritesContext'
import { CatalogCartShippingEstimator } from '@/public/CatalogCartShippingEstimator'
import { CatalogLiveNowBadge } from '@/public/CatalogLiveNowBadge'
import { CreateWishlistPanel } from '@/public/wishlist/CreateWishlistPanel'
import { cartLinesToWishlistItems } from '@/lib/wishlist'

function CartChrome() {
  const { slug, pathBase, to } = usePublicStore()
  usePublicCatalogVisitTracking()
  const { pathname } = useLocation()
  const isLiveRoute = pathname.includes('/live/')
  const isShowroomRoute = pathname.includes('/coleccion')
  const isImmersiveRoute = isLiveRoute || isShowroomRoute
  const { tenant, platformSettings, isPreview } = useCatalogTenant()
  const {
    lines,
    totalPiezas,
    subtotalCop,
    updateQty,
    removeLine,
    clear,
    highlightProductId,
    cartBumpGeneration,
  } = useCatalogoSimpleCart()
  const { count: favCount } = useCatalogFavorites()
  const { registerCartTarget, cartReceiving } = useCartAddAnimation()
  const [cartOpen, setCartOpen] = useState(false)
  const [cartTab, setCartTab] = useState<'comprar' | 'wishlist'>('comprar')
  const cartItemCount = lines.length
  const wishlistItemsFromCart = cartLinesToWishlistItems(lines)

  const cartTargetRef = useCallback(
    (el: HTMLButtonElement | null) => {
      registerCartTarget(el)
    },
    [registerCartTarget],
  )

  const enCheckout = pathname.startsWith(`${to('/checkout')}`)
  const isCatalogListHome = pathname === pathBase || pathname === '/'
  const announcementBar = resolveAnnouncementBar(tenant)
  const headerLayout = resolveCatalogHeaderLayout(tenant)

  const waUrl =
    tenant?.whatsappNumero &&
    whatsappUrlFromNumber(
      tenant.whatsappNumero,
      buildPedidoWhatsappTextSimple(lines, tenant.mensajeIntro),
    )

  return (
    <>
      {isImmersiveRoute ? (
        <McOutletBoundary variant="public">
          <Outlet />
        </McOutletBoundary>
      ) : (
        <>
      <div className="mc-pc-header-stack sticky top-0 z-30">
      {announcementBar ? <CatalogAnnouncementBar bar={announcementBar} /> : null}
      <PublicCatalogHeader
        layout={headerLayout}
        tenant={tenant}
        slug={slug}
        pathBase={pathBase}
        to={to}
        pathname={pathname}
        favCount={favCount}
        cartItemCount={cartItemCount}
        subtotalCop={subtotalCop}
        cartBumpGeneration={cartBumpGeneration}
        cartReceiving={cartReceiving}
        enCheckout={enCheckout}
        hasCartLines={lines.length > 0}
        cartTargetRef={cartTargetRef}
        onOpenCart={() => setCartOpen(true)}
        onNavClick={() => setCartOpen(false)}
      />
      </div>

      <main
        className={clsx('mc-public-catalog-main', isCatalogListHome && 'mc-public-catalog-main--list-home')}
      >
        {isCatalogListHome ? (
          <div className="mc-public-catalog-inset mb-3 flex justify-center sm:mb-4 sm:justify-start">
            <CatalogLiveNowBadge />
          </div>
        ) : null}
        <McOutletBoundary variant="public">
          <Outlet />
        </McOutletBoundary>
      </main>

      {tenant && storeAboutVisible(tenant) ? <StoreBrandAboutSection tenant={tenant} /> : null}

      <footer className="mt-auto border-t mc-pc-border py-6 sm:py-8">
        <div className="mc-public-catalog-inset flex flex-col items-center gap-5">
          {tenant && storeSocialFooterVisible(tenant) ? (
            <StoreBrandSocialLinks tenant={tenant} />
          ) : null}
          <div className="flex w-full flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="max-w-md text-[11px] leading-relaxed sm:text-xs mc-pc-muted">
            {tenant?.nombreTienda ? (
              <>
                <span className="font-medium text-[var(--cat-text)]">{tenant.nombreTienda}</span>
                <span> · Compras seguras y atención directa con la tienda</span>
              </>
            ) : (
              'Catálogo'
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end">
            {slug ? (
              <Link
                to={to('/mis-pedidos')}
                className="text-[11px] font-medium sm:text-xs text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_50%,transparent)] underline-offset-4 transition hover:opacity-80"
              >
                Mis pedidos
              </Link>
            ) : null}
            {slug ? (
              <Link
                to={to('/seguimiento')}
                className="text-[11px] font-medium sm:text-xs text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_50%,transparent)] underline-offset-4 transition hover:opacity-80"
              >
                Seguir pedido
              </Link>
            ) : null}
            {slug && tenant && tenantHasPoliticas(tenant) && (
              <Link
                to={to('/politicas')}
                className="text-[11px] font-medium sm:text-xs text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_50%,transparent)] underline-offset-4 transition hover:opacity-80"
              >
                Envíos, pagos y cambios
              </Link>
            )}
          </div>
          </div>
        </div>
      </footer>

      <McCatalogModal
        open={cartOpen}
        title={cartTab === 'wishlist' ? 'Lista de regalos' : 'Tu pedido'}
        onClose={() => {
          setCartOpen(false)
          setCartTab('comprar')
        }}
        footer={
          cartTab === 'wishlist' ? (
            <button
              type="button"
              className="mc-pc-btn w-full border border-transparent px-4 py-2.5 text-sm font-medium mc-pc-muted"
              onClick={() => {
                setCartOpen(false)
                setCartTab('comprar')
              }}
            >
              Cerrar
            </button>
          ) : (
            <div className="flex w-full flex-col gap-2">
              {lines.length > 0 && slug && !isPreview ? (
                <div className="flex w-full items-stretch gap-2">
                  <button
                    type="button"
                    className="mc-pc-btn inline-flex shrink-0 items-center justify-center border border-transparent px-3 py-2.5 text-sm font-medium mc-pc-text transition duration-200 ease-in-out hover:opacity-65"
                    onClick={() => clear()}
                  >
                    Vaciar
                  </button>
                  <Link
                    to={to('/checkout')}
                    onClick={() => setCartOpen(false)}
                    className="mc-pc-btn inline-flex min-w-0 flex-1 items-center justify-center bg-[var(--cat-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)] transition duration-200 ease-in-out hover:opacity-90"
                  >
                    Comprar en línea · {formatCop(subtotalCop)}
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  className="mc-pc-btn inline-flex w-full items-center justify-center border border-transparent px-4 py-2.5 text-sm font-medium mc-pc-text transition duration-200 ease-in-out hover:opacity-65"
                  onClick={() => clear()}
                >
                  Vaciar
                </button>
              )}
              {isPreview && lines.length > 0 ? (
                <p className="text-center text-xs leading-relaxed text-amber-800">
                  El checkout se habilita cuando publiques tu tienda.
                </p>
              ) : null}
              {!isPreview && waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mc-pc-btn inline-flex w-full items-center justify-center border mc-pc-border bg-transparent px-4 py-2.5 text-sm font-medium mc-pc-text transition duration-200 ease-in-out hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)]"
                >
                  WhatsApp
                </a>
              ) : !isPreview ? (
                <span className="text-center text-xs leading-relaxed mc-pc-muted">
                  La tienda aún no configuró WhatsApp.
                </span>
              ) : null}
            </div>
          )
        }
      >
        {lines.length > 0 ? (
          <div
            className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-[color-mix(in_srgb,var(--cat-muted)_10%,var(--cat-surface)_90%)] p-1"
            role="tablist"
            aria-label="Acción del carrito"
          >
            <button
              type="button"
              role="tab"
              aria-selected={cartTab === 'comprar'}
              onClick={() => setCartTab('comprar')}
              className={clsx(
                'rounded-full px-3 py-2 text-sm font-semibold transition',
                cartTab === 'comprar'
                  ? 'bg-[var(--cat-surface)] text-[var(--cat-text)] shadow-sm'
                  : 'text-[var(--cat-muted)]',
              )}
            >
              Comprar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={cartTab === 'wishlist'}
              onClick={() => setCartTab('wishlist')}
              className={clsx(
                'rounded-full px-3 py-2 text-sm font-semibold transition',
                cartTab === 'wishlist'
                  ? 'bg-[var(--cat-surface)] text-[var(--cat-text)] shadow-sm'
                  : 'text-[var(--cat-muted)]',
              )}
            >
              Wishlist
            </button>
          </div>
        ) : null}

        {cartTab === 'wishlist' && lines.length > 0 ? (
          isPreview ? (
            <p className="py-6 text-center text-sm text-amber-800">
              La wishlist se habilita cuando publiques tu tienda.
            </p>
          ) : (
            <CreateWishlistPanel
              key={lines.map((l) => cartLineKey(l)).join('|')}
              items={wishlistItemsFromCart}
              embedded
              onClose={() => {
                setCartOpen(false)
                setCartTab('comprar')
              }}
            />
          )
        ) : lines.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-medium text-[var(--cat-text)]">Aún no agregaste productos</p>
            <p className="mt-1.5 text-[13px] leading-relaxed mc-pc-muted">
              Explorá el catálogo y sumá lo que te guste.
            </p>
            <button
              type="button"
              className="mt-4 mc-pc-btn bg-[var(--cat-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
              onClick={() => setCartOpen(false)}
            >
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <ul className="divide-y mc-pc-border border-y mc-pc-border">
              {lines.map((l) => {
                const unit = typeof l.precioUnitarioCop === 'number' ? l.precioUnitarioCop : 0
                const lineTotal = unit * l.cantidad
                return (
                  <li
                    key={cartLineKey(l)}
                    className={clsx(
                      'flex gap-3 py-4 text-sm',
                      highlightProductId === l.productId && 'mc-pc-cart-line-enter',
                    )}
                  >
                    <Link
                      to={to(`/p/${l.productId}`)}
                      onClick={() => setCartOpen(false)}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[color-mix(in_srgb,var(--cat-muted)_8%,var(--cat-surface)_92%)]"
                    >
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] mc-pc-muted">
                          Sin foto
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium tracking-tight mc-pc-text">{l.titulo}</p>
                          {l.subtitulo && (
                            <p className="mt-0.5 text-xs leading-relaxed mc-pc-muted">{l.subtitulo}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="shrink-0 text-[11px] font-medium text-[var(--cat-muted)] underline-offset-2 hover:text-[var(--cat-text)] hover:underline"
                          onClick={() => removeLine(l.productId, l.varianteId, l.tallaId)}
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border mc-pc-border mc-pc-surface px-2.5 py-1 text-sm transition duration-200 ease-in-out hover:opacity-75"
                            onClick={() =>
                              updateQty(l.productId, l.cantidad - 1, l.varianteId, l.tallaId)
                            }
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums mc-pc-text">
                            {l.cantidad}
                          </span>
                          <button
                            type="button"
                            className="rounded-md border mc-pc-border mc-pc-surface px-2.5 py-1 text-sm transition duration-200 ease-in-out hover:opacity-75"
                            onClick={() =>
                              updateQty(l.productId, l.cantidad + 1, l.varianteId, l.tallaId)
                            }
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-semibold tabular-nums text-[var(--cat-text)]">
                            {formatCop(lineTotal)}
                          </p>
                          {l.cantidad > 1 && unit > 0 ? (
                            <p className="text-[10px] tabular-nums mc-pc-muted">
                              {formatCop(unit)} c/u
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-5 space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium tracking-tight mc-pc-text">Subtotal</p>
                <p className="text-base font-semibold tabular-nums text-[var(--cat-text)]">
                  {formatCop(subtotalCop)}
                </p>
              </div>
              <p className="text-[11px] mc-pc-muted">
                {totalPiezas} {totalPiezas === 1 ? 'pieza' : 'piezas'} · El envío se calcula según tu
                ciudad
              </p>
            </div>
            {slug && tenant ? (
              <CatalogCartShippingEstimator
                slug={slug}
                tenant={tenant}
                platformSettings={platformSettings}
                subtotalCop={subtotalCop}
                totalPiezas={totalPiezas}
              />
            ) : null}
          </>
        )}
      </McCatalogModal>
        </>
      )}
    </>
  )
}

export function PublicCatalogLayout() {
  const { slug } = usePublicStore()
  const key = slug ? `mc_cart_${slug}` : 'mc_cart'
  const { tenant, isPreview } = useCatalogTenant()
  const { preset } = resolvePublicCatalogTheme(tenant)
  const hasAnnouncementBar = resolveAnnouncementBar(tenant) != null
  const headerLayout = resolveCatalogHeaderLayout(tenant)
  const pageStyle = {
    ...publicCatalogCssVars(tenant),
    ...(hasAnnouncementBar ? { ['--mc-pc-announcement-h']: '2rem' } : {}),
    ['--mc-pc-header-h']: headerLayout === 'logo-center' ? '4rem' : '3.75rem',
  } as CSSProperties

  return (
    <div
      className={`mc-public-catalog-page flex min-h-svh flex-col ${publicCatalogPresetClass(preset)}`}
      data-announcement={hasAnnouncementBar ? 'on' : undefined}
      data-header-layout={headerLayout}
      style={pageStyle}
    >
      {isPreview ? <CatalogPreviewBanner /> : null}
      <CatalogFavoritesProvider key={slug ?? 'noslug'} slug={slug}>
        <CatalogoSimpleCartProvider storageKey={key}>
          <CartAddAnimationProvider>
            <CartChrome />
          </CartAddAnimationProvider>
        </CatalogoSimpleCartProvider>
      </CatalogFavoritesProvider>
    </div>
  )
}
