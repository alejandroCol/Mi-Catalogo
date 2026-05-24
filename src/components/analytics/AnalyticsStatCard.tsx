import clsx from 'clsx'
import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  hint?: string
  accent?: boolean
  loading?: boolean
}

export function AnalyticsStatCard({ label, value, hint, accent, loading }: StatCardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden border p-5 sm:p-6',
        accent
          ? 'border-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] bg-gradient-to-br from-[var(--cat-surface)] via-[var(--cat-surface)] to-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface))]'
          : 'border-neutral-200/55 bg-[var(--cat-surface)]',
      )}
    >
      {accent ? (
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] blur-2xl"
          aria-hidden
        />
      ) : null}
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">{label}</p>
      {loading ? (
        <div className="mt-3 h-9 w-24 animate-pulse rounded-sm bg-neutral-100 sm:h-10" />
      ) : (
        <p className="mt-2 text-[1.75rem] font-medium tabular-nums leading-none tracking-tighter text-[var(--cat-text)] sm:text-[2.1rem]">
          {value}
        </p>
      )}
      {hint ? <p className="mt-2 text-[12px] leading-relaxed text-[var(--cat-muted)]">{hint}</p> : null}
    </div>
  )
}

type AnalyticsStatGridProps = {
  children: ReactNode
  className?: string
}

export function AnalyticsStatGrid({ children, className }: AnalyticsStatGridProps) {
  return (
    <div className={clsx('grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4', className)}>
      {children}
    </div>
  )
}
