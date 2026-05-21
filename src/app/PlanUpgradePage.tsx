import { useLocation, useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { BillingPastDueBanner } from '@/components/billing/BillingPastDueBanner'
import { BillingSubscriptionManage } from '@/components/billing/BillingSubscriptionManage'
import { ExpertPlanOffer } from '@/components/billing/ExpertPlanOffer'
import { ExpertPlanPurchaseFlow } from '@/components/billing/ExpertPlanPurchaseFlow'
import { useExpertPlanPurchase } from '@/components/billing/useExpertPlanPurchase'
import { PlanEleganceBadge } from '@/components/billing/PlanEleganceBadge'
import { isBillingPastDueInGrace } from '@/lib/billingAccess'

type PlanLocationState = {
  fromOutsideSettings?: boolean
}

export function PlanUpgradePage() {
  const { tenant } = useMcAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const purchase = useExpertPlanPurchase()
  const { planConfig, platformSettings, expertAccess, expertName, showPurchase } = purchase

  const fromOutsideSettings = Boolean((location.state as PlanLocationState | null)?.fromOutsideSettings)

  return (
    <div className="mc-plan-page">
      {fromOutsideSettings ? (
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center self-start rounded-full text-[var(--cat-muted)] transition hover:bg-neutral-100/90 hover:text-[var(--cat-text)]"
          aria-label="Cerrar"
          onClick={() => navigate(-1)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <ConfiguracionesBackLink />
      )}

      <header className="shrink-0 space-y-1">
        <h1 className="ios-large-title">Tu plan</h1>
        {expertAccess && tenant ? (
          <PlanEleganceBadge tenant={tenant} settings={platformSettings} className="!text-[20px] sm:!text-[22px]" />
        ) : (
          <p className="ios-footnote text-[var(--cat-muted)]">
            Plan <span className="font-medium text-[var(--cat-text)]">{expertName}</span>
          </p>
        )}
      </header>

      {tenant && isBillingPastDueInGrace(tenant) && <BillingPastDueBanner tenant={tenant} />}

      {expertAccess && <BillingSubscriptionManage expertName={expertName} onMessage={purchase.setMsg} />}

      {!expertAccess && (
        <ExpertPlanOffer expertName={expertName} planConfig={planConfig} titleId="plan-benefits-title" />
      )}

      {showPurchase && <ExpertPlanPurchaseFlow purchase={purchase} />}
    </div>
  )
}
