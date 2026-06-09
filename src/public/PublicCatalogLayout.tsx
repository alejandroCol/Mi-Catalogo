import { Link, Outlet, useLocation } from 'react-router-dom'
import { useCallback, useState } from 'react'
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
import {
  publicCatalogCssVars,
  publicCatalogPresetClass,
  resolvePublicCatalogTheme,
} from '@/lib/catalogTheme'
import { tenantHasPoliticas } from '@/lib/tenantPoliticas'
import { CatalogPreviewBanner } from '@/public/CatalogPreviewBanner'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicCatalogVisitTracking } from '@/public/usePublicCatalogAnalytics'
import { usePublicStore } from '@/public/PublicStoreContext'
import { McCatalogModal } from '@/public/McCatalogModal'
import { McOutletBoundary } from '@/components/McOutletBoundary'

function CartChrome() {
  const { slug, pathBase, to } = usePublicStore()
  usePublicCatalogVisitTracking()
  const { pathname } = useLocation()
  const { tenant, isPreview } = useCatalogTenant()
  const { lines, totalPiezas, updateQty, clear, highlightProductId, cartBumpGeneration } =
    useCatalogoSimpleCart()
  const { registerCartTarget, cartReceiving } = useCartAddAnimation()
  const [cartOpen, setCartOpen] = useState(false)
  const cartItemCount = lines.length

  const cartTargetRef = useCallback(
    (el: HTMLButtonElement | null) => {
      registerCartTarget(el)
    },
    [registerCartTarget],
  )

  const enCheckout = pathname.startsWith(`${to('/checkout')}`)
  const isCatalogListHome = pathname === pathBase || pathname === '/'
  const navLink = (active: boolean) =>
    clsx(
      'rounded-full px-3 py-1.5 text-[13px] font-medium transition',
      active
        ? 'bg-[color-mix(in_srgb,var(--cat-text)_8%,transparent)] text-[var(--cat-text)]'
        : 'mc-pc-muted hover:text-[var(--cat-text)]',
    )

  const waUrl =
    tenant?.whatsappNumero &&
    whatsappUrlFromNumber(
      tenant.whatsappNumero,
      buildPedidoWhatsappTextSimple(lines, tenant.mensajeIntro),
    )

  return (
    <>
      <header className="mc-pc-elev-header sticky top-0 z-30">
        <div className="mc-public-catalog-inset flex h-[3.25rem] items-center justify-between gap-2 sm:h-[3.75rem] sm:gap-4">
          <Link
            to={pathBase || '/'}
            className="flex min-w-0 items-center gap-2.5 transition hover:opacity-80 sm:gap-3"
          >
            {tenant?.storeLogoUrl ? (
              <img
                src={tenant.storeLogoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:h-9 sm:w-9"
              />
            ) : null}
            <span className="mc-pc-display min-w-0 truncate text-[15px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-base">
              {tenant?.nombreTienda ?? 'Catálogo'}
            </span>
          </Link>

          <nav
            className="hidden min-w-0 items-center justify-center gap-0.5 sm:flex md:gap-1"
            aria-label="Tienda pública"
          >
            {slug ? (
              <Link
                to={to('/seguimiento')}
                className={navLink(pathname === to('/seguimiento'))}
                onClick={() => setCartOpen(false)}
              >
                Seguir mi pedido
              </Link>
            ) : null}
            {slug && tenant && tenantHasPoliticas(tenant) && (
              <Link
                to={to('/politicas')}
                className={navLink(pathname === to('/politicas'))}
                onClick={() => setCartOpen(false)}
              >
                Ayuda
              </Link>
            )}
            {lines.length > 0 && slug && (
              <Link
                to={to('/checkout')}
                className={navLink(enCheckout)}
                onClick={() => setCartOpen(false)}
              >
                Pagar
              </Link>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {slug && tenant && tenantHasPoliticas(tenant) && (
              <Link
                to={to('/politicas')}
                className="rounded-full p-2 sm:hidden"
                aria-label="Políticas de la tienda"
              >
                <span className="text-lg leading-none mc-pc-muted" aria-hidden>
                  ⓘ
                </span>
              </Link>
            )}
            <button
              ref={cartTargetRef}
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={
                cartItemCount > 0
                  ? `Carrito, ${cartItemCount} ${cartItemCount === 1 ? 'artículo' : 'artículos'} · ${totalPiezas} uds.`
                  : 'Abrir carrito'
              }
              className={clsx(
                'group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] bg-[var(--cat-surface)] text-[var(--cat-text)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--cat-text)_16%,transparent)]',
                cartReceiving && 'mc-pc-cart-btn-receiving',
              )}
            >
              <span
                className={clsx(
                  'mc-pc-cart-icon-wrap relative flex h-8 w-8 items-center justify-center rounded-full border-0 !shadow-none',
                  cartReceiving && 'mc-pc-cart-icon-receiving',
                )}
              >
                <svg
                  className="h-[1.1rem] w-[1.1rem]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l3.383 12.75a1.125 1.125 0 001.085.83h8.218a1.125 1.125 0 001.085-.83l2.17-8.175a.75.75 0 00-.57-.88H6.375M16.5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM8.25 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                  />
                </svg>
                {cartItemCount > 0 && (
                  <span
                    key={cartBumpGeneration}
                    className={clsx(
                      'mc-pc-cart-badge absolute -right-0.5 -top-0.5 flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none ring-2 ring-[var(--cat-surface)]',
                      cartBumpGeneration > 0 && 'mc-pc-cart-badge-bump',
                    )}
                  >
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main
        className={clsx('mc-public-catalog-main', isCatalogListHome && 'mc-public-catalog-main--list-home')}
      >
        <McOutletBoundary variant="public">
          <Outlet />
        </McOutletBoundary>
      </main>

      <footer className="mt-auto border-t mc-pc-border py-6 sm:py-8">
        <div className="mc-public-catalog-inset flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
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
                to={to('/seguimiento')}
                className="text-[11px] font-medium sm:text-xs text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_50%,transparent)] underline-offset-4 transition hover:opacity-80"
              >
                Seguir mi pedido
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
      </footer>

      <McCatalogModal
        open={cartOpen}
        title="Tu pedido"
        onClose={() => setCartOpen(false)}
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-stretch sm:gap-3">
            <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-full border border-transparent px-4 py-2.5 text-sm font-medium mc-pc-text transition duration-200 ease-in-out hover:opacity-65 sm:w-auto"
                onClick={() => clear()}
              >
                Vaciar
              </button>
            </div>
            {lines.length > 0 && slug && !isPreview ? (
              <Link
                to={to('/checkout')}
                onClick={() => setCartOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--cat-accent)] px-4 py-3 text-sm font-semibold text-[var(--cat-accent-text)] transition duration-200 ease-in-out hover:opacity-90 sm:w-auto sm:shrink-0 sm:py-2.5"
              >
                Comprar en línea
              </Link>
            ) : null}
            {isPreview && lines.length > 0 ? (
              <p className="text-center text-xs leading-relaxed text-amber-800 sm:text-left">
                El checkout se habilita cuando publiques tu tienda.
              </p>
            ) : null}
            {!isPreview && waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-full border mc-pc-border bg-transparent px-4 py-3 text-sm font-medium mc-pc-text transition duration-200 ease-in-out hover:border-[color-mix(in_srgb,var(--cat-text)_22%,transparent)] sm:w-auto sm:py-2.5"
              >
                WhatsApp
              </a>
            ) : !isPreview ? (
              <span className="text-center text-xs leading-relaxed mc-pc-muted sm:text-left">La tienda aún no configuró WhatsApp.</span>
            ) : null}
          </div>
        }
      >
        {lines.length === 0 ? (
          <p className="text-sm leading-relaxed mc-pc-muted">Aún no agregaste productos.</p>
        ) : (
          <ul className="divide-y mc-pc-border border-y mc-pc-border">
            {lines.map((l) => (
              <li
                key={cartLineKey(l)}
                className={clsx(
                  'flex flex-col gap-3 py-4 text-sm sm:flex-row sm:items-center sm:justify-between',
                  highlightProductId === l.productId && 'mc-pc-cart-line-enter',
                )}
              >
                <div>
                  <p className="font-medium tracking-tight mc-pc-text">{l.titulo}</p>
                  {l.subtitulo && <p className="mt-0.5 text-xs leading-relaxed mc-pc-muted">{l.subtitulo}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border mc-pc-border mc-pc-surface px-2.5 py-1 text-sm transition duration-200 ease-in-out hover:opacity-75"
                    onClick={() => updateQty(l.productId, l.cantidad - 1, l.varianteId, l.tallaId)}
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-medium tabular-nums mc-pc-text">{l.cantidad}</span>
                  <button
                    type="button"
                    className="rounded-md border mc-pc-border mc-pc-surface px-2.5 py-1 text-sm transition duration-200 ease-in-out hover:opacity-75"
                    onClick={() => updateQty(l.productId, l.cantidad + 1, l.varianteId, l.tallaId)}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {lines.length > 0 && (
          <p className="mt-6 text-sm font-medium tracking-tight mc-pc-text">Total piezas: {totalPiezas}</p>
        )}
      </McCatalogModal>
    </>
  )
}

function Chrome() {
  return <CartChrome />
}

export function PublicCatalogLayout() {
  const { slug } = usePublicStore()
  const key = slug ? `mc_cart_${slug}` : 'mc_cart'
  const { tenant, isPreview } = useCatalogTenant()
  const { preset } = resolvePublicCatalogTheme(tenant)

  return (
    <div
      className={`mc-public-catalog-page flex min-h-svh flex-col ${publicCatalogPresetClass(preset)}`}
      style={publicCatalogCssVars(tenant)}
    >
      {isPreview ? <CatalogPreviewBanner /> : null}
      <CatalogoSimpleCartProvider storageKey={key}>
        <CartAddAnimationProvider>
          <Chrome />
        </CartAddAnimationProvider>
      </CatalogoSimpleCartProvider>
    </div>
  )
}
