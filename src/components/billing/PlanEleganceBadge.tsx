import { ownerPlanEleganceLabel } from '@/lib/billingAccess'
import type { McPlatformSettings, McTenant } from '@/types/mc'

/** «Eres Expert» — sans limpio, alineado con la UI de la app. */
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
    <p className={`mc-plan-elegance ${className}`.trim()}>
      <span className="mc-plan-elegance__lead">Eres</span>{' '}
      <span className="mc-plan-elegance__name">{label}</span>
    </p>
  )
}
