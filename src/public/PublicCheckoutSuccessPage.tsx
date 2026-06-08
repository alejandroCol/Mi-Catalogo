import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { formatCop } from '@/lib/formatCop'
import { normalizeOrderIdInput, publicCatalogTrackingPath } from '@/lib/catalogOrderTracking'
import { CatalogOrderTrackingTimeline } from '@/public/CatalogOrderTrackingTimeline'
import { useCatalogOrderTracking } from '@/public/useCatalogOrderTracking'
import { usePublicTenant } from '@/public/usePublicTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import { usePublicCheckoutCompleteTracking } from '@/public/usePublicCatalogAnalytics'

export function PublicCheckoutSuccessPage() {
  const { slug, to, storePublicUrl } = usePublicStore()
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('o') ?? searchParams.get('ref') ?? ''
  const orderId = normalizeOrderIdInput(orderIdParam)
  usePublicCheckoutCompleteTracking(orderId || undefined)
  const { tenant } = usePublicTenant(slug)
  const { clear } = useCatalogoSimpleCart()
  const { order, loading, error, fetchTracking } = useCatalogOrderTracking()
  const [copiedId, setCopiedId] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const trackingUrl = useMemo(() => {
    if (!slug || !orderId) return ''
    const q = new URLSearchParams({ o: orderId })
    return storePublicUrl(`/seguimiento?${q.toString()}`)
  }, [slug, orderId, storePublicUrl])

  useEffect(() => {
    if (!slug || !orderId) return
    void fetchTracking({ slug, orderId })
  }, [slug, orderId, fetchTracking])

  useEffect(() => {
    if (order?.estado === 'pagado' || order?.estado === 'en_preparacion') {
      clear()
    }
  }, [order?.estado, clear])

  if (!slug || !orderId) {
    return <Navigate to={to('/')} replace />
  }

  async function copiarPedido() {
    if (!navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(orderId)
      setCopiedId(true)
      window.setTimeout(() => setCopiedId(false), 2200)
    } catch {
      /* ignore */
    }
  }

  async function copiarEnlace() {
    if (!trackingUrl || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(trackingUrl)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 2200)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-lg py-10 sm:py-14">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] text-[var(--cat-accent)]">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <h1 className="mc-pc-display mt-5 text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-3xl">
          ¡Compra exitosa!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cat-muted)]">
          {tenant?.nombreTienda ? (
            <>
              Gracias por comprar en <span className="font-medium text-[var(--cat-text)]">{tenant.nombreTienda}</span>.
              Guardá tu número de pedido: también lo enviamos a tu correo.
            </>
          ) : (
            'Tu pago fue recibido correctamente.'
          )}
        </p>
      </div>

      <section className="mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)] p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">N.º de pedido</p>
        <p className="mt-1 break-all font-mono text-xl font-semibold tracking-wide text-[var(--cat-text)] sm:text-2xl">
          {orderId}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--cat-muted)]">
          Usá este número en <strong className="font-medium text-[var(--cat-text)]">Seguir mi pedido</strong> para ver el
          estado y la guía cuando la tienda despache el envío. Es el mismo que figura en el email de confirmación.
        </p>
        {order && order.totalCop > 0 ? (
          <p className="mt-3 text-[15px] font-medium tabular-nums text-[var(--cat-text)]">
            Total pagado: {formatCop(order.totalCop)}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void copiarPedido()}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--cat-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)] transition hover:opacity-90"
          >
            {copiedId ? 'Número copiado' : 'Copiar número'}
          </button>
          <button
            type="button"
            onClick={() => void copiarEnlace()}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] px-4 py-2.5 text-sm font-medium text-[var(--cat-text)] transition hover:opacity-80"
          >
            {copiedLink ? 'Enlace copiado' : 'Copiar enlace'}
          </button>
        </div>
        <Link
          to={publicCatalogTrackingPath(slug, orderId)}
          className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] py-2.5 text-sm font-medium text-[var(--cat-text)] transition hover:opacity-80"
        >
          Ver seguimiento ahora
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
          Estado de tu pedido
        </h2>
        <div className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_40%,var(--cat-surface)_60%)] p-5 sm:p-6">
          {loading && !order ? (
            <p className="text-center text-sm text-[var(--cat-muted)]">Cargando estado del pedido…</p>
          ) : null}
          {error && !order ? (
            <p className="text-sm leading-relaxed text-[var(--cat-muted)]">
              Tu pago fue registrado. El estado se actualizará en unos segundos; podés volver a esta página con tu número
              de pedido o revisar el email de confirmación.
            </p>
          ) : null}
          {order ? <CatalogOrderTrackingTimeline estado={order.estado} order={order} /> : null}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          to={to('/')}
          className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] px-5 py-2.5 text-sm font-medium text-[var(--cat-text)] transition hover:opacity-80"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  )
}
