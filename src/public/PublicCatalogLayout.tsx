import { Link, Outlet, useParams } from 'react-router-dom'
import { useState } from 'react'
import {
  CatalogoSimpleCartProvider,
  useCatalogoSimpleCart,
} from '@/catalog-local/CatalogoSimpleCartContext'
import { buildPedidoWhatsappTextSimple, whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'
import {
  publicCatalogCssVars,
  publicCatalogPresetClass,
  resolvePublicCatalogTheme,
} from '@/lib/catalogTheme'
import { usePublicTenant } from '@/public/usePublicTenant'
import { McCatalogModal } from '@/public/McCatalogModal'

function CartChrome() {
  const { slug } = useParams<{ slug: string }>()
  const { tenant } = usePublicTenant(slug)
  const { lines, totalPiezas, updateQty, clear } = useCatalogoSimpleCart()
  const [cartOpen, setCartOpen] = useState(false)

  const waUrl =
    tenant?.whatsappNumero &&
    whatsappUrlFromNumber(
      tenant.whatsappNumero,
      buildPedidoWhatsappTextSimple(lines, tenant.mensajeIntro),
    )

  return (
    <>
      <header className="sticky top-0 z-20 border-b mc-pc-border mc-pc-surface shadow-sm">
        <div className="mc-public-catalog-inset flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3">
          <Link
            to={`/c/${slug}`}
            className="mc-pc-display text-lg font-semibold mc-pc-text transition hover:opacity-80"
          >
            {tenant?.nombreTienda ?? 'Catálogo'}
          </Link>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={totalPiezas > 0 ? `Abrir carrito, ${totalPiezas} unidades` : 'Abrir carrito'}
            className="mc-pc-cart-button group relative flex w-full items-center justify-center gap-2.5 overflow-visible rounded-2xl border px-5 py-3 text-sm font-semibold transition duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 mc-pc-ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cat-surface)] sm:w-auto"
          >
            <span className="mc-pc-cart-icon-wrap relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 transition">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l3.383 12.75a1.125 1.125 0 001.085.83h8.218a1.125 1.125 0 001.085-.83l2.17-8.175a.75.75 0 00-.57-.88H6.375M16.5 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM8.25 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                />
              </svg>
              {totalPiezas > 0 && (
                <span className="mc-pc-cart-badge absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none shadow-sm ring-2 ring-[var(--cat-surface)]">
                  {totalPiezas > 99 ? '99+' : totalPiezas}
                </span>
              )}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span>Carrito</span>
              <span className="text-[11px] font-normal mc-pc-muted opacity-90 group-hover:opacity-100">
                {totalPiezas > 0 ? 'Ver o editar pedido' : 'Armá tu pedido'}
              </span>
            </span>
          </button>
        </div>
        <p className="mc-public-catalog-inset pb-3 text-center text-xs leading-relaxed mc-pc-muted">
          Catálogo de tu tienda · Descargá fotos y pedí por WhatsApp
        </p>
      </header>

      <main className="mc-public-catalog-main pb-12 sm:pb-16">
        <Outlet />
      </main>

      <McCatalogModal
        open={cartOpen}
        title="Tu pedido"
        onClose={() => setCartOpen(false)}
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium mc-pc-text transition mc-pc-line-softer hover:opacity-90"
              onClick={() => clear()}
            >
              Vaciar
            </button>
            {lines.length > 0 && slug && (
              <Link
                to={`/c/${slug}/checkout`}
                onClick={() => setCartOpen(false)}
                className="inline-flex items-center justify-center rounded-xl bg-[var(--cat-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)] shadow-sm transition hover:opacity-95"
              >
                Comprar en línea
              </Link>
            )}
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
              >
                Pedir por WhatsApp
              </a>
            ) : (
              <span className="text-xs mc-pc-muted">La tienda aún no configuró WhatsApp.</span>
            )}
          </div>
        }
      >
        {lines.length === 0 ? (
          <p className="text-sm mc-pc-muted">Aún no agregaste productos.</p>
        ) : (
          <ul className="space-y-3">
            {lines.map((l) => (
              <li
                key={l.productId}
                className="flex flex-col gap-2 rounded-xl border mc-pc-border mc-pc-line-softer p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium mc-pc-text">{l.titulo}</p>
                  {l.subtitulo && <p className="text-xs mc-pc-muted">{l.subtitulo}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border mc-pc-border mc-pc-surface px-2 py-1"
                    onClick={() => updateQty(l.productId, l.cantidad - 1)}
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-medium mc-pc-text">{l.cantidad}</span>
                  <button
                    type="button"
                    className="rounded-lg border mc-pc-border mc-pc-surface px-2 py-1"
                    onClick={() => updateQty(l.productId, l.cantidad + 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {lines.length > 0 && (
          <p className="mt-4 text-sm font-medium mc-pc-text">Total piezas: {totalPiezas}</p>
        )}
      </McCatalogModal>
    </>
  )
}

function Chrome() {
  return <CartChrome />
}

export function PublicCatalogLayout() {
  const { slug } = useParams<{ slug: string }>()
  const key = slug ? `mc_cart_${slug}` : 'mc_cart'
  const { tenant } = usePublicTenant(slug)
  const { preset } = resolvePublicCatalogTheme(tenant)

  return (
    <div
      className={`mc-public-catalog-page ${publicCatalogPresetClass(preset)}`}
      style={publicCatalogCssVars(tenant)}
    >
      <CatalogoSimpleCartProvider storageKey={key}>
        <Chrome />
      </CatalogoSimpleCartProvider>
    </div>
  )
}
