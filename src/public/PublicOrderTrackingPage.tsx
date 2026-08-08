import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatCop } from '@/lib/formatCop'
import { normalizeOrderIdInput } from '@/lib/catalogOrderTracking'
import { CatalogOrderTrackingTimeline } from '@/public/CatalogOrderTrackingTimeline'
import { useCatalogOrderTracking } from '@/public/useCatalogOrderTracking'
import { usePublicStore } from '@/public/PublicStoreContext'

export function PublicOrderTrackingPage() {
  const { slug, to } = usePublicStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const qOrderId = searchParams.get('o') ?? searchParams.get('ref') ?? ''

  const [orderIdInput, setOrderIdInput] = useState(qOrderId)
  const { order, loading, error, fetchTracking, reset } = useCatalogOrderTracking()

  useEffect(() => {
    setOrderIdInput(qOrderId)
  }, [qOrderId])

  useEffect(() => {
    if (!slug || !qOrderId) return
    void fetchTracking({ slug, orderId: qOrderId })
  }, [slug, qOrderId, fetchTracking])

  if (!slug) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const orderId = normalizeOrderIdInput(orderIdInput)
    if (!slug || !orderId) return
    reset()
    setSearchParams({ o: orderId }, { replace: true })
    await fetchTracking({ slug, orderId })
  }

  return (
    <div className="mx-auto max-w-lg py-10 sm:py-14">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] sm:text-[13px] mc-pc-muted" aria-label="Seguimiento">
        <Link to={to('/')} className="font-medium text-[var(--cat-text)] transition hover:opacity-75">
          Tienda
        </Link>
        <span aria-hidden>/</span>
        <span className="text-[var(--cat-text)]">Seguir mi pedido</span>
      </nav>

      <h1 className="mc-pc-display mt-4 text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-3xl">
        Seguimiento de pedido
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--cat-muted)]">
        Ingresá el <strong className="font-medium text-[var(--cat-text)]">número de pedido</strong> que recibiste por
        correo al confirmar tu compra.
      </p>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mt-8 space-y-4 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)] p-5 shadow-sm sm:p-6"
      >
        <div>
          <label className="text-[12px] font-medium text-[var(--cat-text)]">N.º de pedido</label>
          <input
            className="mc-input mt-1.5 py-2.5 font-mono text-[15px] tracking-wide"
            placeholder="Ej. 6ZUrlTHqsLZYCBZtHoX0"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full mc-pc-btn bg-[var(--cat-accent)] py-3 text-sm font-semibold text-[var(--cat-accent-text)] transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Buscando…' : 'Ver estado del pedido'}
        </button>
      </form>

      {error && !order ? (
        <p className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      {order ? (
        <div className="mt-10 space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)] pb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
                N.º de pedido
              </p>
              <p className="break-all font-mono text-base font-semibold text-[var(--cat-text)] sm:text-lg">
                {order.orderId}
              </p>
            </div>
            {order.totalCop > 0 ? (
              <p className="text-[15px] font-medium tabular-nums text-[var(--cat-text)]">{formatCop(order.totalCop)}</p>
            ) : null}
          </div>
          <p className="text-sm text-[var(--cat-muted)]">
            Pedido en <span className="font-medium text-[var(--cat-text)]">{order.nombreTienda}</span>
          </p>
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_40%,var(--cat-surface)_60%)] p-5 sm:p-6">
            <CatalogOrderTrackingTimeline estado={order.estado} order={order} />
          </div>
        </div>
      ) : null}

      <p className="mt-10 text-center text-[12px] text-[var(--cat-muted)]">
        ¿No tenés el N.º?{' '}
        <Link
          to={to('/mis-pedidos')}
          className="font-medium text-[var(--cat-text)] underline underline-offset-4"
        >
          Buscar por email
        </Link>
        {' · '}
        <Link to={to('/')} className="font-medium text-[var(--cat-text)] underline underline-offset-4">
          Volver al catálogo
        </Link>
      </p>
    </div>
  )
}
