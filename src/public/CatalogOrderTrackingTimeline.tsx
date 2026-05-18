import clsx from 'clsx'
import {
  CATALOG_TRACKING_STEPS,
  catalogTrackingStepIndex,
  type CatalogOrderTrackingPublic,
} from '@/lib/catalogOrderTracking'
import type { McOrdenCatalogoEstado } from '@/types/mc'

type Props = {
  estado: McOrdenCatalogoEstado
  order?: Pick<
    CatalogOrderTrackingPublic,
    | 'trackingImageUrl'
    | 'trackingNumber'
    | 'seguimientoCompraAt'
    | 'seguimientoPreparacionAt'
    | 'seguimientoDespachoAt'
    | 'seguimientoEntregaAt'
    | 'createdAt'
  >
}

function stepTimestamp(
  stepEstado: (typeof CATALOG_TRACKING_STEPS)[number]['estado'],
  order: Props['order'],
): number | undefined {
  if (!order) return undefined
  switch (stepEstado) {
    case 'pagado':
      return order.seguimientoCompraAt ?? order.createdAt
    case 'en_preparacion':
      return order.seguimientoPreparacionAt
    case 'enviado':
      return order.seguimientoDespachoAt
    case 'entregado':
      return order.seguimientoEntregaAt
    default:
      return undefined
  }
}

export function CatalogOrderTrackingTimeline({ estado, order }: Props) {
  const activeIdx = catalogTrackingStepIndex(estado)
  const cancelled = estado === 'cancelado' || estado === 'esperando_pago'

  if (cancelled) {
    return (
      <p className="rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_20%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_60%,var(--cat-surface)_40%)] px-4 py-3 text-sm leading-relaxed text-[var(--cat-muted)]">
        {estado === 'esperando_pago'
          ? 'Este pedido aún no tiene el pago confirmado.'
          : 'Este pedido fue cancelado.'}
      </p>
    )
  }

  return (
    <ol className="relative" aria-label="Estado del pedido">
      {CATALOG_TRACKING_STEPS.map((step, i) => {
        const done = activeIdx >= i
        const current = activeIdx === i
        const ts = stepTimestamp(step.estado, order)
        const showGuide =
          step.estado === 'enviado' && done && (order?.trackingImageUrl || order?.trackingNumber)

        return (
          <li key={step.estado} className="relative flex gap-4 pb-8 last:pb-0">
            {i < CATALOG_TRACKING_STEPS.length - 1 ? (
              <span
                className={clsx(
                  'absolute left-[15px] top-8 bottom-0 w-px',
                  done && activeIdx > i
                    ? 'bg-[var(--cat-accent)]'
                    : 'bg-[color-mix(in_srgb,var(--cat-muted)_25%,transparent)]',
                )}
                aria-hidden
              />
            ) : null}
            <div className="relative z-[1] flex shrink-0 flex-col items-center">
              <span
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-[13px] font-semibold transition',
                  done
                    ? 'border-[var(--cat-accent)] bg-[var(--cat-accent)] text-[var(--cat-accent-text)]'
                    : 'border-[color-mix(in_srgb,var(--cat-muted)_30%,transparent)] bg-[var(--cat-surface)] text-[var(--cat-muted)]',
                  current && 'ring-4 ring-[color-mix(in_srgb,var(--cat-accent)_22%,transparent)]',
                )}
              >
                {done ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={clsx(
                  'text-[15px] font-semibold tracking-tight',
                  done ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)]',
                )}
              >
                {step.label}
                {current ? (
                  <span className="ml-2 inline-flex rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cat-accent)]">
                    Actual
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">{step.description}</p>
              {ts ? (
                <time
                  className="mt-1 block text-[11px] tabular-nums text-[color-mix(in_srgb,var(--cat-muted)_85%,transparent)]"
                  dateTime={new Date(ts).toISOString()}
                >
                  {new Date(ts).toLocaleString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              ) : null}
              {showGuide ? (
                <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--cat-muted)_16%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_50%,var(--cat-surface)_50%)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
                    Guía de rastreo
                  </p>
                  {order?.trackingNumber ? (
                    <p className="mt-1 font-mono text-[13px] text-[var(--cat-text)]">{order.trackingNumber}</p>
                  ) : null}
                  {order?.trackingImageUrl ? (
                    <a
                      href={order.trackingImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)]"
                    >
                      <img
                        src={order.trackingImageUrl}
                        alt="Guía de rastreo del envío"
                        className="max-h-48 w-full object-contain bg-white"
                      />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
