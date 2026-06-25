import { Link } from 'react-router-dom'
import { isPaidBillingPlan } from '@/lib/billingPlan'
import type { McTenant } from '@/types/mc'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { IconChevronRight } from '@/icons/McIcons'

/** Muestra el código Expert emitido tras completar la tienda (cuando ya no va el checklist). */
export function OnboardingExpertRewardCard({ tenant }: { tenant: McTenant }) {
  const code = tenant.onboardingExpertRewardCode?.trim()
  if (!code || isPaidBillingPlan(tenant.billingPlan)) return null

  return (
    <section
      aria-label="Código Expert de bienvenida"
      className="relative overflow-hidden border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 via-[var(--cat-surface)] to-[var(--cat-surface)] px-5 py-6 sm:px-7"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-300/20 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
            <ExpertStar className="text-emerald-700" />
            Tu regalo Expert
          </p>
          <p className="mt-2 text-[16px] font-medium tracking-tight text-emerald-950">
            Primer mes a $0 con tu método de pago
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-emerald-900/75">
            Usá este código exclusivo antes de activar Expert. Desde el segundo mes aplica el precio normal.
          </p>
          <p className="mt-3 inline-flex border border-emerald-300/50 bg-white/60 px-3 py-2 font-mono text-[14px] font-semibold tracking-wide text-emerald-900">
            {code}
          </p>
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
