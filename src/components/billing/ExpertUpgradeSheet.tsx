import { useEffect } from 'react'
import { BillingPastDueBanner } from '@/components/billing/BillingPastDueBanner'
import { ExpertPlanOffer } from '@/components/billing/ExpertPlanOffer'
import { ExpertPlanPurchaseFlow } from '@/components/billing/ExpertPlanPurchaseFlow'
import { useExpertPlanPurchase } from '@/components/billing/useExpertPlanPurchase'
import { isBillingPastDueInGrace } from '@/lib/billingAccess'

type Props = {
  open: boolean
  onClose: () => void
  /** Título del panel (contexto desde donde se abrió). */
  title?: string
}

function SheetCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[var(--cat-muted)] transition hover:bg-neutral-100/90 hover:text-[var(--cat-text)]"
      aria-label="Cerrar"
      onClick={onClose}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </button>
  )
}

/**
 * Panel Expert deslizable para flujos fuera de Configuraciones (inventario, carritos, etc.).
 * Incluye beneficios, checkout y cierre con X.
 */
export function ExpertUpgradeSheet({ open, onClose, title = 'Plan Expert' }: Props) {
  const purchase = useExpertPlanPurchase()
  const { tenant, expertAccess, expertName, planConfig, showPurchase, resetCheckout, setMsg } = purchase

  useEffect(() => {
    if (open) return
    resetCheckout()
    setMsg(null)
  }, [open, resetCheckout, setMsg])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expert-upgrade-sheet-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar panel" onClick={onClose} />
      <div className="relative mx-0 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-neutral-200/55 bg-[var(--cat-surface)] shadow-xl sm:mx-4 sm:rounded-2xl">
        <SheetCloseButton onClose={onClose} />
        <div className="overflow-y-auto px-5 pb-6 pt-5">
          <header className="pr-10">
            <h2 id="expert-upgrade-sheet-title" className="ios-headline text-[var(--cat-text)]">
              {title}
            </h2>
            <p className="ios-footnote mt-1.5 leading-relaxed text-[var(--cat-muted)]">
              {expertAccess
                ? 'Ya tenés acceso a las funciones Expert.'
                : `Pasá a ${expertName} y desbloqueá más herramientas para tu tienda.`}
            </p>
          </header>

          {tenant && isBillingPastDueInGrace(tenant) && (
            <div className="mt-4">
              <BillingPastDueBanner tenant={tenant} />
            </div>
          )}

          {!expertAccess && (
            <ExpertPlanOffer
              expertName={expertName}
              planConfig={planConfig}
              titleId="expert-upgrade-sheet-benefits"
              className="mt-4"
            />
          )}

          {showPurchase && (
            <ExpertPlanPurchaseFlow purchase={purchase} stickyCheckout={false} onPurchaseSuccess={onClose} />
          )}

          {expertAccess && !showPurchase && (
            <button type="button" className="mc-btn-secondary mt-6 w-full py-3 text-[15px]" onClick={onClose}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
