import { Link } from 'react-router-dom'
import type { McTenant } from '@/types/mc'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { IconChevronRight } from '@/icons/McIcons'

/** Muestra el código Expert emitido tras completar la tienda (cuando ya no va el checklist). */
export function OnboardingExpertRewardCard({ tenant }: { tenant: McTenant }) {
  const code = tenant.onboardingExpertRewardCode?.trim()
  if (!code || tenant.billingPlan === 'expert') return null

  return (
    <section
      aria-label="Código Expert de bienvenida"
      className="border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 via-[var(--cat-surface)] to-[var(--cat-surface)] px-5 py-5 sm:px-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
            <ExpertStar className="text-emerald-700" />
            Tu regalo Expert
          </p>
          <p className="mt-2 text-[15px] font-medium tracking-tight text-emerald-950">
            Primer mes a $0 con tu método de pago
          </p>
          <p className="mt-1 font-mono text-[14px] font-semibold tracking-wide text-emerald-900">{code}</p>
        </div>
        <Link
          to={`/app/plan?code=${encodeURIComponent(code)}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 border border-emerald-300/70 bg-emerald-600 px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
        >
          Activar Expert
          <IconChevronRight size={16} className="opacity-80" />
        </Link>
      </div>
    </section>
  )
}
