import type { McCheckoutVentasModo, OnepayPasarelaGateUi } from '@/lib/checkoutVentasModo'
import { CHECKOUT_VENTAS_MODOS } from '@/lib/checkoutVentasModoDisplay'
import { IconBankCard, IconChevronRight, IconCoins, IconWhatsApp } from '@/icons/McIcons'

function PaymentMethodChips({ methods }: { methods: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {methods.map((label) => (
        <span
          key={label}
          className="rounded-md border border-neutral-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--cat-text)]"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function ModoIcon({ modo, selected }: { modo: McCheckoutVentasModo; selected: boolean }) {
  const className = selected ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)]'
  const size = 20
  if (modo === 'whatsapp') return <IconWhatsApp size={size} className={className} />
  if (modo === 'pasarela_micatalogo') return <IconCoins size={size} className={className} />
  return <IconBankCard size={size} className={className} />
}

function RadioIndicator({ selected, locked }: { selected: boolean; locked?: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition ${
        selected
          ? 'border-[var(--cat-text)] bg-[var(--cat-text)]'
          : locked
            ? 'border-neutral-200 bg-neutral-50'
            : 'border-neutral-300 bg-white group-hover:border-neutral-400'
      }`}
      aria-hidden
    >
      {selected ? (
        <span className="h-2 w-2 rounded-full bg-white" />
      ) : locked ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2.2" />
          <path
            d="M8 11V8a4 4 0 0 1 8 0v3"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <span className="h-2 w-2 rounded-full bg-transparent" />
      )}
    </span>
  )
}

function GateStatusBanner({ gate }: { gate: OnepayPasarelaGateUi }) {
  const toneClasses =
    gate.tone === 'ok'
      ? 'border-emerald-200/80 bg-emerald-50/70 text-emerald-950'
      : gate.tone === 'info'
        ? 'border-sky-200/80 bg-sky-50/60 text-sky-950'
        : gate.tone === 'error'
          ? 'border-red-200/80 bg-red-50/60 text-red-950'
          : 'border-amber-200/80 bg-amber-50/70 text-amber-950'

  const dotClass =
    gate.tone === 'ok'
      ? 'bg-emerald-500'
      : gate.tone === 'info'
        ? 'bg-sky-500'
        : gate.tone === 'error'
          ? 'bg-red-500'
          : 'bg-amber-500'

  return (
    <div className={`rounded-xl border px-3.5 py-3 ${toneClasses}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-tight">{gate.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed opacity-90">{gate.message}</p>
          {gate.ctaLabel ? (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-80">
              Tocá esta opción para {gate.ctaLabel.toLowerCase()}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CheckoutVentasModoOptions({
  value,
  onSelect,
  disabled = false,
  onepayPasarelaGate,
  pasarelaMicatalogoOk,
  variant = 'compact',
}: {
  value: McCheckoutVentasModo | null
  onSelect: (modo: McCheckoutVentasModo) => void
  disabled?: boolean
  onepayPasarelaGate: OnepayPasarelaGateUi
  pasarelaMicatalogoOk: boolean
  variant?: 'compact' | 'detailed'
}) {
  function statusFor(modo: McCheckoutVentasModo): { text: string; tone: 'ok' | 'warn' } | null {
    if (modo === 'pasarela') {
      if (onepayPasarelaGate.canSelect) {
        return { text: 'Pasarela lista para tu tienda.', tone: 'ok' }
      }
      return { text: onepayPasarelaGate.message, tone: 'warn' }
    }
    if (modo === 'pasarela_micatalogo') {
      return pasarelaMicatalogoOk
        ? { text: 'Disponible para tu checkout.', tone: 'ok' }
        : { text: 'El equipo de Mi Catálogo aún no activó esta pasarela.', tone: 'warn' }
    }
    return null
  }

  function isEffectivelySelected(modo: McCheckoutVentasModo): boolean {
    if (value !== modo) return false
    if (modo === 'pasarela' && !onepayPasarelaGate.canSelect) return false
    return true
  }

  function isPasarelaLocked(modo: McCheckoutVentasModo): boolean {
    return modo === 'pasarela' && !onepayPasarelaGate.canSelect
  }

  if (variant === 'detailed') {
    return (
      <div className="grid gap-3 sm:gap-3.5" role="radiogroup" aria-label="Método de pago">
        {CHECKOUT_VENTAS_MODOS.map((modo) => {
          const selected = isEffectivelySelected(modo.id)
          const locked = isPasarelaLocked(modo.id)
          const status = statusFor(modo.id)
          return (
            <button
              key={modo.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={locked || undefined}
              disabled={disabled}
              onClick={() => onSelect(modo.id)}
              className={`group w-full overflow-hidden rounded-2xl border-2 bg-[var(--cat-surface)] text-left shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_4%,transparent)] transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? 'border-[var(--cat-text)] shadow-[0_8px_28px_-16px_rgba(0,0,0,0.35)]'
                  : locked
                    ? 'border-neutral-200/70 hover:border-neutral-300/90'
                    : 'border-neutral-200/80 hover:border-neutral-300 hover:shadow-[0_6px_20px_-14px_rgba(0,0,0,0.18)] active:scale-[0.995]'
              }`}
            >
              <div className="flex items-start gap-3.5 px-4 py-4 sm:px-5 sm:py-4">
                <RadioIndicator selected={selected} locked={locked} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                        selected
                          ? 'border-neutral-200 bg-neutral-50'
                          : locked
                            ? 'border-neutral-200/60 bg-neutral-50/40 opacity-80'
                            : 'border-neutral-200/70 bg-neutral-50/60 group-hover:bg-neutral-50'
                      }`}
                    >
                      <ModoIcon modo={modo.id} selected={selected} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-[15px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-[16px]">
                          {modo.title}
                        </p>
                        {selected ? (
                          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-800">
                            Activo
                          </span>
                        ) : locked ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-neutral-200/80 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-muted)]">
                            Requiere OnePay
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-[var(--cat-muted)] opacity-0 transition group-hover:opacity-100">
                            Elegir
                            <IconChevronRight size={14} />
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">{modo.summary}</p>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
                    {modo.highlights.map((line) => (
                      <li key={line} className="flex gap-2 text-[12px] leading-snug text-[var(--cat-text)]">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {(modo.paymentMethods || modo.id === 'pasarela_micatalogo' || modo.id === 'pasarela' || status) && (
                <div className="space-y-3 border-t border-neutral-100 bg-neutral-50/45 px-4 py-3.5 sm:px-5 sm:py-4">
                  {modo.paymentMethods ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--cat-muted)]">
                        Medios de pago
                      </p>
                      <div className="mt-2">
                        <PaymentMethodChips methods={modo.paymentMethods} />
                      </div>
                    </div>
                  ) : null}

                  {modo.id === 'pasarela_micatalogo' ? (
                    <p className="rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-[11px] leading-snug text-amber-950">
                      <span className="font-semibold">Costo al retirar fondos:</span> si no creás tu cuenta comercio en
                      OnePay, al desembolsar se descuenta <strong className="font-medium">0,02%</strong> más{' '}
                      <strong className="font-medium">$900 COP</strong>.
                    </p>
                  ) : null}

                  {modo.id === 'pasarela' && !onepayPasarelaGate.canSelect ? (
                    <GateStatusBanner gate={onepayPasarelaGate} />
                  ) : status ? (
                    <p
                      className={`text-[11px] font-medium ${status.tone === 'ok' ? 'text-emerald-800' : 'text-amber-800'}`}
                    >
                      {status.text}
                    </p>
                  ) : null}
                </div>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-3 grid gap-2.5 sm:grid-cols-1 lg:grid-cols-3" role="radiogroup" aria-label="Método de pago">
      {CHECKOUT_VENTAS_MODOS.map((modo) => {
        const selected = isEffectivelySelected(modo.id)
        const locked = isPasarelaLocked(modo.id)
        const status = statusFor(modo.id)
        return (
          <button
            key={modo.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={locked || undefined}
            disabled={disabled}
            onClick={() => onSelect(modo.id)}
            className={`group w-full overflow-hidden rounded-xl border-2 bg-[var(--cat-surface)] text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? 'border-[var(--cat-text)] shadow-sm'
                : locked
                  ? 'border-neutral-200/70 hover:border-neutral-300/90'
                  : 'border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50/40'
            }`}
          >
            <div className="flex items-start gap-3 px-4 py-3.5">
              <RadioIndicator selected={selected} locked={locked} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-semibold text-[var(--cat-text)]">{modo.title}</p>
                  {locked ? (
                    <span className="rounded-full border border-neutral-200/80 bg-neutral-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-muted)]">
                      Requiere OnePay
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)]">{modo.summary}</p>
                {modo.id === 'pasarela_micatalogo' ? (
                  <p className="mt-2 rounded-md border border-amber-200/80 bg-amber-50/50 px-2 py-1.5 text-[11px] leading-snug text-amber-950">
                    <span className="font-semibold">Costo al retirar fondos:</span> si no creás tu cuenta comercio en
                    OnePay, al desembolsar el dinero se descontará <strong className="font-medium">0,02%</strong> más{' '}
                    <strong className="font-medium">$900 COP</strong> sobre el monto a retirar.
                  </p>
                ) : null}
                {modo.id === 'pasarela' && !onepayPasarelaGate.canSelect ? (
                  <div className="mt-2">
                    <GateStatusBanner gate={onepayPasarelaGate} />
                  </div>
                ) : status ? (
                  <p
                    className={`mt-2 text-[11px] font-medium ${status.tone === 'ok' ? 'text-emerald-800' : 'text-amber-800'}`}
                  >
                    {status.text}
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
