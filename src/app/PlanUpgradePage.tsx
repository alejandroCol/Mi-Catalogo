import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { BillingPastDueBanner } from '@/components/billing/BillingPastDueBanner'
import { BillingSubscriptionManage } from '@/components/billing/BillingSubscriptionManage'
import { ExpertPlanOffer } from '@/components/billing/ExpertPlanOffer'
import { ExpertPlanPurchaseFlow } from '@/components/billing/ExpertPlanPurchaseFlow'
import { useExpertPlanPurchase } from '@/components/billing/useExpertPlanPurchase'
import { PlanEleganceBadge } from '@/components/billing/PlanEleganceBadge'
import { isBillingPastDueInGrace } from '@/lib/billingAccess'

export function PlanUpgradePage() {
  const { tenant } = useMcAuth()
  const { returnTo, returnLabel } = useConfigSubpageNav()
  const purchase = useExpertPlanPurchase()
  const { planConfig, platformSettings, expertAccess, expertName, showPurchase } = purchase

  return (
    <div className="mc-plan-page">
      <ConfiguracionesBackLink to={returnTo} label={returnLabel} />

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
