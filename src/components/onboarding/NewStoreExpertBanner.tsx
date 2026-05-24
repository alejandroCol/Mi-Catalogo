import { Link } from 'react-router-dom'
import { ExpertStar } from '@/components/billing/ExpertStar'
import {
  isWithinOnboardingExpertRewardWindow,
  onboardingExpertRewardDeadlineMs,
} from '@/lib/newStoreOnboarding'
import type { McTenant } from '@/types/mc'
import { IconChevronRight } from '@/icons/McIcons'

function formatCountdown(deadlineMs: number, nowMs: number): string {
  const diff = Math.max(0, deadlineMs - nowMs)
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
  if (hours <= 0 && minutes <= 0) return 'Últimos minutos'
  if (hours >= 1) return `${hours} h ${minutes} min restantes`
  return `${minutes} min restantes`
}

export function NewStoreExpertBanner({ tenant }: { tenant: McTenant }) {
  const now = Date.now()
  const withinWindow = isWithinOnboardingExpertRewardWindow(tenant, now)
  const deadlineMs = onboardingExpertRewardDeadlineMs(tenant)

  return (
    <section
      aria-label="Promoción Expert para tiendas nuevas"
      className="group relative overflow-hidden border border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] bg-gradient-to-br from-[#0a0a0a] via-[#171717] to-[#262626] px-5 py-6 text-white shadow-[0_18px_50px_-30px_rgba(0,0,0,0.55)] sm:px-7 sm:py-7"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-amber-400/20 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
              <ExpertStar className="text-amber-300 [&_svg]:h-3 [&_svg]:w-3" />
              Tienda nueva
            </span>
            {withinWindow && (
              <span className="text-[11px] font-medium tabular-nums text-amber-200/90">
                {formatCountdown(deadlineMs, now)}
              </span>
            )}
          </div>
          <p className="mt-3 text-[1.15rem] font-medium leading-snug tracking-tight sm:text-[1.35rem]">
            Obtené Mi Catálogo Expert gratis completando tu tienda en menos de 24 horas
          </p>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/70">
            Terminá el checklist de abajo y recibí un código exclusivo para tu tienda: primer mes Expert a $0 con tu
            método de pago, y desde el segundo mes el precio normal.
          </p>
        </div>

        <Link
          to="/app/plan"
          className="inline-flex shrink-0 items-center justify-center gap-2 border border-white/25 bg-white px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-neutral-900 transition hover:bg-white/90"
        >
          Conocer Expert
          <IconChevronRight size={16} className="opacity-70" />
        </Link>
      </div>
    </section>
  )
}
