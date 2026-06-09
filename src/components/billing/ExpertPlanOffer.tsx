import { ExpertStar } from '@/components/billing/ExpertStar'
import { PlanFeatureCheck } from '@/components/billing/PlanFeatureCheck'
import { expertPlanFeatureList } from '@/components/billing/expertPlanFeatures'
import type { McPlanConfig } from '@/lib/billingPlans'

type Props = {
  expertName: string
  planConfig: McPlanConfig
  titleId?: string
  className?: string
}

export function ExpertPlanOffer({ expertName, planConfig, titleId = 'plan-benefits-title', className = '' }: Props) {
  const features = expertPlanFeatureList(planConfig)

  return (
    <section className={`mc-plan-offer space-y-3 ${className}`} aria-labelledby={titleId}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <ExpertStar className="!h-3.5 !w-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
            {expertName}
          </span>
        </div>
        <h2
          id={titleId}
          className="text-[18px] font-semibold leading-snug tracking-tight text-[var(--cat-text)] sm:text-[19px]"
        >
          Con Expert publicás tu tienda online:
        </h2>
      </div>
      <ul className="flex flex-col gap-2">
        {features.map((f) => (
          <li key={f} className="mc-plan-feature">
            <PlanFeatureCheck />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
