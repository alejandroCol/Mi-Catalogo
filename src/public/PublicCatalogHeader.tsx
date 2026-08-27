import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import {
  catalogHeaderCenterLogoClassName,
  catalogHeaderClassicLogoClassName,
  catalogHeaderShowsStoreName,
  catalogHeaderStoreLabel,
  resolveCatalogHeaderLogoShape,
} from '@/lib/catalogHeaderLayout'
import type { McCatalogHeaderLayoutId } from '@/types/mc'
import type { McTenant } from '@/types/mc'
import { tenantHasPoliticas } from '@/lib/tenantPoliticas'
import { CatalogHeartGlyph } from '@/public/CatalogFavoriteButton'

export type PublicCatalogHeaderProps = {
  layout: McCatalogHeaderLayoutId
  tenant: McTenant | null | undefined
  slug: string | null | undefined
  pathBase: string
  to: (suffix: string) => string
  pathname: string
  favCount: number
  cartItemCount: number
  subtotalCop: number
  cartBumpGeneration: number
  cartReceiving: boolean
  enCheckout: boolean
  hasCartLines: boolean
  cartTargetRef: (el: HTMLButtonElement | null) => void
  onOpenCart: () => void
  onNavClick: () => void
}

function FavHeartIcon({ filled }: { filled: boolean }) {
  return <CatalogHeartGlyph filled={filled} size={22} className="text-[var(--cat-text)]" />
}

function CartIconButton({
  cartTargetRef,
  cartReceiving,
  cartItemCount,
  subtotalCop,
  cartBumpGeneration,
  onOpenCart,
  variant,
}: {
  cartTargetRef: (el: HTMLButtonElement | null) => void
  cartReceiving: boolean
  cartItemCount: number
  subtotalCop: number
  cartBumpGeneration: number
  onOpenCart: () => void
  variant: 'pill' | 'ghost'
}) {
  return (
    <button
      ref={cartTargetRef}
      type="button"
      onClick={onOpenCart}
      aria-label={
        cartItemCount > 0
          ? `Carrito, ${cartItemCount} ${cartItemCount === 1 ? 'artículo' : 'artículos'} · ${formatCop(subtotalCop)}`
          : 'Abrir carrito'
      }
      className={clsx(
        'group relative inline-flex h-10 w-10 shrink-0 items-center justify-center text-[var(--cat-text)] transition',
        variant === 'pill'
          ? 'rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] bg-[var(--cat-surface)] shadow-sm hover:border-[color-mix(in_srgb,var(--cat-text)_16%,transparent)]'
          : 'rounded-full hover:bg-[color-mix(in_srgb,var(--cat-text)_6%,transparent)]',
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
        {cartItemCount > 0 ? (
          <span
            key={cartBumpGeneration}
            className={clsx(
              'mc-pc-cart-badge absolute -right-0.5 -top-0.5 flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none ring-2 ring-[var(--cat-surface)]',
              cartBumpGeneration > 0 && 'mc-pc-cart-badge-bump',
            )}
          >
            {cartItemCount > 99 ? '99+' : cartItemCount}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function BrandLeftHeader(props: PublicCatalogHeaderProps) {
  const {
    tenant,
    slug,
    pathBase,
    to,
    pathname,
    favCount,
    cartItemCount,
    subtotalCop,
    cartBumpGeneration,
    cartReceiving,
    enCheckout,
    hasCartLines,
    cartTargetRef,
    onOpenCart,
    onNavClick,
  } = props

  const showName = catalogHeaderShowsStoreName(tenant)
  const storeLabel = catalogHeaderStoreLabel(tenant)
  const logoOnly = Boolean(tenant?.storeLogoUrl) && !showName

  const navLink = (active: boolean) =>
    clsx(
      'rounded-full px-3 py-1.5 text-[13px] font-medium transition',
      active
        ? 'bg-[color-mix(in_srgb,var(--cat-text)_8%,transparent)] text-[var(--cat-text)]'
        : 'mc-pc-muted hover:text-[var(--cat-text)]',
    )

  return (
    <div
      className={clsx(
        'mc-public-catalog-inset flex items-center justify-between gap-2 sm:gap-4',
        logoOnly ? 'h-[3.5rem] sm:h-[4rem]' : 'h-[3.25rem] sm:h-[3.75rem]',
      )}
    >
      <Link
        to={pathBase || '/'}
        className="flex min-w-0 items-center gap-2.5 transition hover:opacity-80 sm:gap-3"
        aria-label={showName ? undefined : storeLabel}
      >
        {tenant?.storeLogoUrl ? (
          <img
            src={tenant.storeLogoUrl}
            alt={showName ? '' : storeLabel}
            className={catalogHeaderClassicLogoClassName(logoOnly)}
          />
        ) : null}
        {showName ? (
          <span className="mc-pc-display min-w-0 truncate text-[15px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-base">
            {storeLabel}
          </span>
        ) : null}
      </Link>

      <nav
        className="hidden min-w-0 items-center justify-center gap-0.5 sm:flex md:gap-1"
        aria-label="Tienda pública"
      >
        {slug ? (
          <Link
            to={to('/seguimiento')}
            className={navLink(pathname === to('/seguimiento') || pathname === to('/mis-pedidos'))}
            onClick={onNavClick}
          >
            Mis pedidos
          </Link>
        ) : null}
        {slug ? (
          <Link
            to={to('/favoritos')}
            className={navLink(pathname === to('/favoritos'))}
            onClick={onNavClick}
          >
            Favoritos{favCount > 0 ? ` (${favCount})` : ''}
          </Link>
        ) : null}
        {slug && tenant && tenantHasPoliticas(tenant) ? (
          <Link
            to={to('/politicas')}
            className={navLink(pathname === to('/politicas'))}
            onClick={onNavClick}
          >
            Ayuda
          </Link>
        ) : null}
        {hasCartLines && slug ? (
          <Link to={to('/checkout')} className={navLink(enCheckout)} onClick={onNavClick}>
            Pagar
          </Link>
        ) : null}
      </nav>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {slug ? (
          <Link
            to={to('/favoritos')}
            className="relative rounded-full p-2 sm:hidden"
            aria-label={favCount > 0 ? `Favoritos, ${favCount}` : 'Favoritos'}
            onClick={onNavClick}
          >
            <FavHeartIcon filled={favCount > 0} />
            {favCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--cat-accent)] px-1 text-[9px] font-semibold text-[var(--cat-accent-text)]">
                {favCount > 9 ? '9+' : favCount}
              </span>
            ) : null}
          </Link>
        ) : null}
        {slug && tenant && tenantHasPoliticas(tenant) ? (
          <Link
            to={to('/politicas')}
            className="rounded-full p-2 sm:hidden"
            aria-label="Políticas de la tienda"
          >
            <span className="text-lg leading-none mc-pc-muted" aria-hidden>
              ⓘ
            </span>
          </Link>
        ) : null}
        <CartIconButton
          cartTargetRef={cartTargetRef}
          cartReceiving={cartReceiving}
          cartItemCount={cartItemCount}
          subtotalCop={subtotalCop}
          cartBumpGeneration={cartBumpGeneration}
          onOpenCart={onOpenCart}
          variant="pill"
        />
      </div>
    </div>
  )
}

function LogoCenterHeader(props: PublicCatalogHeaderProps) {
  const {
    tenant,
    slug,
    pathBase,
    to,
    pathname,
    favCount,
    cartItemCount,
    subtotalCop,
    cartBumpGeneration,
    cartReceiving,
    cartTargetRef,
    onOpenCart,
    onNavClick,
  } = props

  const sectionLink = (active: boolean) =>
    clsx(
      'px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition sm:px-2.5',
      active ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)] hover:text-[var(--cat-text)]',
    )

  const isHome = pathname === pathBase || pathname === '/' || pathname === `${pathBase}/`
  const showName = catalogHeaderShowsStoreName(tenant)
  const storeLabel = catalogHeaderStoreLabel(tenant)
  const logoOnly = Boolean(tenant?.storeLogoUrl) && !showName

  return (
    <div className="mc-public-catalog-inset grid h-[3.5rem] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-[4rem] sm:gap-3">
      <nav
        className="hidden min-w-0 items-center justify-self-start gap-0.5 sm:flex sm:gap-1"
        aria-label="Secciones de la tienda"
      >
        <Link to={pathBase || '/'} className={sectionLink(isHome)} onClick={onNavClick}>
          Inicio
        </Link>
        <Link
          to={pathBase || '/'}
          className={sectionLink(isHome)}
          onClick={onNavClick}
        >
          Tienda
        </Link>
        {slug && tenant && tenantHasPoliticas(tenant) ? (
          <Link
            to={to('/politicas')}
            className={sectionLink(pathname === to('/politicas'))}
            onClick={onNavClick}
          >
            Contacto
          </Link>
        ) : slug ? (
          <Link
            to={to('/seguimiento')}
            className={sectionLink(
              pathname === to('/seguimiento') || pathname === to('/mis-pedidos'),
            )}
            onClick={onNavClick}
          >
            Pedidos
          </Link>
        ) : null}
      </nav>

      <Link
        to={pathBase || '/'}
        className={clsx(
          'mc-pc-header-brand-center col-start-2 flex min-w-0 max-w-[min(100%,14rem)] items-center justify-center justify-self-center px-1 text-center transition hover:opacity-80 sm:max-w-[18rem]',
          showName ? 'flex-col gap-0.5' : 'flex-row',
        )}
        aria-label={showName ? undefined : storeLabel}
      >
        {tenant?.storeLogoUrl ? (
          <img
            src={tenant.storeLogoUrl}
            alt={showName ? '' : storeLabel}
            className={catalogHeaderCenterLogoClassName(
              resolveCatalogHeaderLogoShape(tenant),
              logoOnly,
            )}
          />
        ) : null}
        {showName ? (
          <span
            className={clsx(
              'mc-pc-display min-w-0 truncate font-semibold tracking-[0.12em] text-[var(--cat-text)]',
              tenant?.storeLogoUrl
                ? 'text-[10px] uppercase opacity-80 sm:text-[11px]'
                : 'text-[14px] uppercase sm:text-[15px]',
            )}
          >
            {storeLabel}
          </span>
        ) : null}
      </Link>

      <div className="flex shrink-0 items-center justify-self-end gap-0.5 sm:gap-1">
        {slug ? (
          <Link
            to={to('/favoritos')}
            className="relative rounded-full p-2 transition hover:bg-[color-mix(in_srgb,var(--cat-text)_6%,transparent)]"
            aria-label={favCount > 0 ? `Favoritos, ${favCount}` : 'Favoritos'}
            onClick={onNavClick}
          >
            <FavHeartIcon filled={favCount > 0} />
            {favCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--cat-accent)] px-1 text-[9px] font-semibold text-[var(--cat-accent-text)]">
                {favCount > 9 ? '9+' : favCount}
              </span>
            ) : null}
          </Link>
        ) : null}
        {slug ? (
          <Link
            to={to('/seguimiento')}
            className="hidden rounded-full p-2 transition hover:bg-[color-mix(in_srgb,var(--cat-text)_6%,transparent)] sm:inline-flex"
            aria-label="Seguir mi pedido"
            title="Seguir mi pedido"
            onClick={onNavClick}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[var(--cat-muted)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18A2.25 2.25 0 0 0 20.25 16.5V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
              />
            </svg>
          </Link>
        ) : null}
        <CartIconButton
          cartTargetRef={cartTargetRef}
          cartReceiving={cartReceiving}
          cartItemCount={cartItemCount}
          subtotalCop={subtotalCop}
          cartBumpGeneration={cartBumpGeneration}
          onOpenCart={onOpenCart}
          variant="ghost"
        />
      </div>
    </div>
  )
}

export function PublicCatalogHeader(props: PublicCatalogHeaderProps) {
  return (
    <header
      className={clsx(
        'mc-pc-elev-header',
        props.layout === 'logo-center' && 'mc-pc-elev-header--logo-center',
      )}
      data-header-layout={props.layout}
    >
      {props.layout === 'logo-center' ? (
        <LogoCenterHeader {...props} />
      ) : (
        <BrandLeftHeader {...props} />
      )}
    </header>
  )
}
