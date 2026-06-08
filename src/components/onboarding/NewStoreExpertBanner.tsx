import { useEffect, useState } from 'react'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { useOnboardingRewardWindow } from '@/hooks/useOnboardingRewardWindow'
import type { McTenant } from '@/types/mc'
import { IconChevronRight } from '@/icons/McIcons'

function formatCountdown(deadlineMs: number, nowMs: number): { primary: string; urgent: boolean } {
  const diff = Math.max(0, deadlineMs - nowMs)
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((diff % (60 * 1000)) / 1000)
  const urgent = diff > 0 && diff <= 60 * 60 * 1000

  if (diff <= 0) return { primary: 'Tiempo agotado', urgent: true }
  if (hours >= 1) return { primary: `${hours} h ${minutes} min`, urgent }
  if (minutes >= 1) return { primary: `${minutes} min ${seconds} s`, urgent: true }
  return { primary: `${seconds} s`, urgent: true }
}

export function NewStoreExpertBanner({ tenant }: { tenant: McTenant }) {
  const { nowMs, withinWindow, deadlineMs } = useOnboardingRewardWindow(tenant)
  const countdown = formatCountdown(deadlineMs, nowMs)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!countdown.urgent) return
    const id = window.setInterval(() => setPulse((p) => !p), 1400)
    return () => window.clearInterval(id)
  }, [countdown.urgent])

  if (!withinWindow) return null

  return (
    <a
      href="#new-store-checklist"
      aria-label="Completá tu tienda en menos de 24 horas y obtené funciones Expert por un mes. Ir al checklist."
      className="group relative block w-full border-b border-white/[0.06] bg-[#0a0a0a] text-white transition hover:bg-[#111111] active:bg-[#141414]"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_50%_-40%,rgba(251,191,36,0.07),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-12">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <ExpertStar className="text-amber-300/90 [&_svg]:h-3.5 [&_svg]:w-3.5" />
        </span>

        <p className="min-w-0 flex-1 text-[12px] leading-snug text-white/82 sm:text-[13px]">
          <span className="font-medium">
            Completá tu tienda en menos de 24 horas y obtené funciones Expert por un mes
          </span>
          <span
            className={`mt-0.5 block text-[10px] font-medium tabular-nums sm:hidden ${
              countdown.urgent ? 'text-amber-200/75' : 'text-white/45'
            }`}
          >
            {countdown.primary} restantes
          </span>
        </p>

        <span
          className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums sm:inline-flex ${
            countdown.urgent
              ? pulse
                ? 'border-amber-400/35 bg-amber-400/10 text-amber-200/90'
                : 'border-amber-400/25 bg-amber-400/6 text-amber-200/75'
              : 'border-white/10 bg-white/[0.03] text-white/55'
          }`}
        >
          <span className="relative flex h-1 w-1" aria-hidden>
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                countdown.urgent ? 'animate-ping bg-amber-300/50' : 'bg-emerald-400/60'
              }`}
            />
            <span
              className={`relative inline-flex h-1 w-1 rounded-full ${
                countdown.urgent ? 'bg-amber-300/90' : 'bg-emerald-400/80'
              }`}
            />
          </span>
          {countdown.primary}
        </span>

        <IconChevronRight
          size={15}
          className="shrink-0 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white/55"
          aria-hidden
        />
      </div>
    </a>
  )
}
