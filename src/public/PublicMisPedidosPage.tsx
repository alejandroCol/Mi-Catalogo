import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { formatCop } from '@/lib/formatCop'
import { getFirebaseFunctions } from '@/lib/firebase'
import { usePublicStore } from '@/public/PublicStoreContext'

type OrderSummary = {
  orderId: string
  estado: string
  totalCop: number
  createdAt: number
  lineasCount: number
  previewNombres: string[]
}

const ESTADO_LABEL: Record<string, string> = {
  pagado: 'Pagado',
  en_preparacion: 'En preparación',
  listo_envio: 'Listo para envío',
  enviado: 'Enviado',
  entregado: 'Entregado',
}

export function PublicMisPedidosPage() {
  const { slug, to } = usePublicStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)
  const [nombreTienda, setNombreTienda] = useState('')

  if (!slug) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setOrders(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcCatalogOrdersByEmail')
      const res = await fn({ slug, email: email.trim() })
      const data = res.data as { nombreTienda: string; orders: OrderSummary[] }
      setNombreTienda(data.nombreTienda)
      setOrders(data.orders || [])
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'No se pudieron cargar tus pedidos.'
      setError(msg.replace(/^Firebase:\s*/i, '').replace(/\s*\(.*\)$/, ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg py-10 sm:py-14">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] mc-pc-muted" aria-label="Mis pedidos">
        <Link to={to('/')} className="font-medium text-[var(--cat-text)] transition hover:opacity-75">
          Tienda
        </Link>
        <span aria-hidden>/</span>
        <span className="text-[var(--cat-text)]">Mis pedidos</span>
      </nav>

      <h1 className="mc-pc-display mt-4 text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-3xl">
        Mis pedidos
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--cat-muted)]">
        Ingresá el email con el que compraste. No necesitás crear una cuenta.
      </p>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mt-8 space-y-4 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)] p-5 shadow-sm sm:p-6"
      >
        <div>
          <label className="text-[12px] font-medium text-[var(--cat-text)]">Email de la compra</label>
          <input
            type="email"
            className="mc-input mt-1.5 py-2.5 text-[15px]"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full mc-pc-btn bg-[var(--cat-accent)] py-3 text-sm font-semibold text-[var(--cat-accent-text)] transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Buscando…' : 'Ver mis pedidos'}
        </button>
      </form>

      <p className="mt-4 text-center text-[12px] text-[var(--cat-muted)]">
        ¿Tenés el N.º de pedido?{' '}
        <Link to={to('/seguimiento')} className="font-medium text-[var(--cat-text)] underline underline-offset-4">
          Seguir un pedido
        </Link>
      </p>

      {error ? (
        <p className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      {orders ? (
        <div className="mt-10 space-y-4">
          <p className="text-sm text-[var(--cat-muted)]">
            Pedidos en <span className="font-medium text-[var(--cat-text)]">{nombreTienda}</span>
          </p>
          {orders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_28%,transparent)] px-4 py-8 text-center text-sm text-[var(--cat-muted)]">
              No encontramos pedidos con ese email.
            </p>
          ) : (
            <ul className="space-y-3">
              {orders.map((o, i) => (
                <li
                  key={o.orderId}
                  className="mc-pc-related-card rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)] p-4"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[13px] font-semibold text-[var(--cat-text)]">{o.orderId}</p>
                      <p className="mt-1 text-[12px] text-[var(--cat-muted)]">
                        {ESTADO_LABEL[o.estado] ?? o.estado}
                        {o.createdAt
                          ? ` · ${new Date(o.createdAt).toLocaleDateString('es-CO')}`
                          : ''}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-[12px] text-[var(--cat-text)]">
                        {o.previewNombres.join(' · ')}
                        {o.lineasCount > o.previewNombres.length ? '…' : ''}
                      </p>
                    </div>
                    <p className="text-[14px] font-semibold tabular-nums text-[var(--cat-text)]">
                      {formatCop(o.totalCop)}
                    </p>
                  </div>
                  <Link
                    to={to(`/seguimiento?o=${encodeURIComponent(o.orderId)}`)}
                    className="mt-3 inline-flex text-[12px] font-semibold text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_45%,transparent)] underline-offset-4"
                  >
                    Ver seguimiento
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
