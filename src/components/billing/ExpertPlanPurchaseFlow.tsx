import { BillingV2Checkout } from '@/components/billing/BillingV2Checkout'
import type { useExpertPlanPurchase } from '@/components/billing/useExpertPlanPurchase'
import { formatCop } from '@/lib/formatCop'

export type ExpertPlanPurchaseState = ReturnType<typeof useExpertPlanPurchase>

type Props = {
  purchase: ExpertPlanPurchaseState
  /** Si true, el checkout empuja al fondo (página completa). */
  stickyCheckout?: boolean
  onPurchaseSuccess?: () => void
}

export function ExpertPlanPurchaseFlow({ purchase, stickyCheckout = true, onPurchaseSuccess }: Props) {
  const {
    msg,
    setMsg,
    expertName,
    showPurchase,
    discountCode,
    setDiscountCode,
    discountPreview,
    validatingCode,
    period,
    setPeriod,
    checkoutOpen,
    setCheckoutOpen,
    validarCodigo,
    precioMensual,
    precioAnual,
    amountForPeriod,
    resetCheckout,
  } = purchase

  if (!showPurchase) return null

  const checkoutClass = stickyCheckout ? 'mc-plan-checkout' : 'mt-4 flex flex-col gap-3.5'

  return (
    <>
      {!checkoutOpen && (
        <section className={checkoutClass}>
          <div className="mc-card space-y-2.5 !py-3.5">
            <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Código de descuento</label>
            <div className="flex gap-2">
              <input
                className="mc-input !mt-0 flex-1"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                placeholder="EXPERT2026"
              />
              <button
                type="button"
                className="mc-btn-secondary shrink-0 px-4"
                disabled={validatingCode}
                onClick={() => void validarCodigo(period)}
              >
                Aplicar
              </button>
            </div>
            {discountPreview && (
              <p className="ios-footnote text-[var(--cat-muted)]">
                Con código:{' '}
                <span className="font-medium text-[var(--cat-text)]">{formatCop(discountPreview.finalPriceCop)}</span>
              </p>
            )}
          </div>

          <div className="mc-plan-period-grid" role="group" aria-label="Período de facturación">
            <button
              type="button"
              className={`mc-plan-period-option ${period === 'monthly' ? 'mc-plan-period-option-active' : ''}`}
              aria-pressed={period === 'monthly'}
              onClick={() => setPeriod('monthly')}
            >
              <span className="mc-plan-period-label">Mensual</span>
              <span className="mc-plan-period-price">{formatCop(precioMensual)}</span>
              <span className="mc-plan-period-hint">Cada mes</span>
            </button>
            <button
              type="button"
              className={`mc-plan-period-option ${period === 'yearly' ? 'mc-plan-period-option-active' : ''}`}
              aria-pressed={period === 'yearly'}
              onClick={() => setPeriod('yearly')}
            >
              <span className="mc-plan-period-label">Anual</span>
              <span className="mc-plan-period-price">{formatCop(precioAnual)}</span>
              <span className="mc-plan-period-hint">Por año</span>
            </button>
          </div>

          <button
            type="button"
            className="mc-btn-primary w-full py-3.5 text-[16px]"
            onClick={() => setCheckoutOpen(true)}
          >
            Continuar con el pago
          </button>
          <p className="text-center ios-footnote text-[var(--cat-muted)]">Cancelá cuando quieras</p>
        </section>
      )}

      {checkoutOpen && (
        <section className={`${checkoutClass} min-h-0 overflow-y-auto`}>
          <button
            type="button"
            className="text-[13px] font-medium text-[var(--cat-muted)] transition hover:opacity-70"
            onClick={resetCheckout}
          >
            ← Cambiar plan o código
          </button>
          <div className="mc-card overflow-hidden !p-0">
            <BillingV2Checkout
              period={period}
              amountCop={amountForPeriod}
              discountCode={discountCode.trim() || undefined}
              expertName={expertName}
              onSuccess={(m) => {
                setMsg(m)
                setCheckoutOpen(false)
                onPurchaseSuccess?.()
              }}
              onError={(m) => setMsg(m)}
            />
          </div>
        </section>
      )}

      {msg && (
        <p className="shrink-0 rounded-md border border-neutral-200/50 bg-neutral-50/80 px-4 py-2.5 text-[14px] text-[var(--cat-text)]">
          {msg}
        </p>
      )}
    </>
  )
}
