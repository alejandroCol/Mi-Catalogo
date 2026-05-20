import { ownerPlanEleganceLabel } from '@/lib/billingAccess'
import type { McPlatformSettings, McTenant } from '@/types/mc'

/** «Eres Expert» — tipografía editorial para sensación exclusiva. */
export function PlanEleganceBadge({
  tenant,
  settings,
  className = '',
}: {
  tenant: McTenant | null | undefined
  settings?: McPlatformSettings | null
  className?: string
}) {
  const label = ownerPlanEleganceLabel(tenant, settings)
  return (
    <p
      className={`font-serif text-[22px] font-light italic tracking-wide text-[var(--cat-text)] sm:text-[26px] ${className}`}
    >
      Eres <span className="not-italic font-normal">{label}</span>
    </p>
  )
}
