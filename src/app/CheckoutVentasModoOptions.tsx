import type { McCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { CHECKOUT_VENTAS_MODOS } from '@/lib/checkoutVentasModoDisplay'

function PaymentMethodChips({ methods }: { methods: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {methods.map((label) => (
        <span
          key={label}
          className="border border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] bg-[var(--cat-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-text)]"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function SelectedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mc-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-mc-700">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Seleccionado
    </span>
  )
}

export function CheckoutVentasModoOptions({
  value,
  onSelect,
  disabled = false,
  pasarelaLista,
  pasarelaMicatalogoOk,
  variant = 'compact',
}: {
  value: McCheckoutVentasModo | null
  onSelect: (modo: McCheckoutVentasModo) => void
  disabled?: boolean
  pasarelaLista: boolean
  pasarelaMicatalogoOk: boolean
  variant?: 'compact' | 'detailed'
}) {
  const cardBase =
    'rounded-xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60'
  const cardSelected =
    'border-mc-500 bg-gradient-to-br from-mc-50/80 to-mc-50/30 shadow-[0_0_0_1px_rgba(var(--mc-500-rgb,99,102,241),0.25)]'
  const cardIdle = 'border-neutral-200/70 bg-neutral-50/30 hover:border-neutral-300/90 hover:bg-neutral-50/50'

  function statusFor(modo: McCheckoutVentasModo): { text: string; tone: 'ok' | 'warn' } | null {
    if (modo === 'pasarela') {
      return pasarelaLista
        ? { text: 'Pasarela lista para tu tienda.', tone: 'ok' }
        : { text: 'Creá tu empresa en OnePay para activar cobros.', tone: 'warn' }
    }
    if (modo === 'pasarela_micatalogo') {
      return pasarelaMicatalogoOk
        ? { text: 'Disponible para tu checkout.', tone: 'ok' }
        : { text: 'El equipo de Mi Catálogo aún no activó esta pasarela.', tone: 'warn' }
    }
    return null
  }

  if (variant === 'detailed') {
    return (
      <div className="grid gap-3">
        {CHECKOUT_VENTAS_MODOS.map((modo) => {
          const selected = value === modo.id
          const status = statusFor(modo.id)
          return (
            <button
              key={modo.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(modo.id)}
              className={`${cardBase} ${selected ? cardSelected : cardIdle}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[15px] font-semibold text-[var(--cat-text)]">{modo.title}</p>
                {selected ? <SelectedBadge /> : null}
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--cat-muted)]">{modo.summary}</p>
              <ul className="mt-3 space-y-1.5">
                {modo.highlights.map((line) => (
                  <li key={line} className="flex gap-2 text-[12px] leading-snug text-[var(--cat-text)]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mc-500" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {modo.paymentMethods ? (
                <div>
                  <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--cat-muted)]">
                    Medios de pago
                  </p>
                  <PaymentMethodChips methods={modo.paymentMethods} />
                </div>
              ) : null}
              {modo.id === 'pasarela_micatalogo' ? (
                <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[11px] leading-snug text-amber-950">
                  <span className="font-semibold">Costo al retirar fondos:</span> si no creás tu cuenta comercio en
                  OnePay, al desembolsar se descuenta <strong className="font-medium">0,02%</strong> más{' '}
                  <strong className="font-medium">$900 COP</strong>.
                </p>
              ) : null}
              {status ? (
                <p
                  className={`mt-3 text-[11px] font-medium ${status.tone === 'ok' ? 'text-emerald-800' : 'text-amber-800'}`}
                >
                  {status.text}
                </p>
              ) : null}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-3 grid gap-2 lg:grid-cols-3">
      {CHECKOUT_VENTAS_MODOS.map((modo) => {
        const selected = value === modo.id
        const status = statusFor(modo.id)
        return (
          <button
            key={modo.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(modo.id)}
            className={`${cardBase} rounded-lg px-4 py-3.5 ${selected ? cardSelected : cardIdle}`}
          >
            <p className="text-[14px] font-semibold text-[var(--cat-text)]">{modo.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)]">{modo.summary}</p>
            {modo.id === 'pasarela_micatalogo' ? (
              <p className="mt-2 rounded-md border border-amber-200/80 bg-amber-50/50 px-2 py-1.5 text-[11px] leading-snug text-amber-950">
                <span className="font-semibold">Costo al retirar fondos:</span> si no creás tu cuenta comercio en
                OnePay, al desembolsar el dinero se descontará <strong className="font-medium">0,02%</strong> más{' '}
                <strong className="font-medium">$900 COP</strong> sobre el monto a retirar.
              </p>
            ) : null}
            {status ? (
              <p
                className={`mt-2 text-[11px] font-medium ${status.tone === 'ok' ? 'text-emerald-800' : 'text-amber-800'}`}
              >
                {status.text}
              </p>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
