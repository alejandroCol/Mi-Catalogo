import clsx from 'clsx'
import { mcAnalyticsShortDayLabel } from '@/lib/mcAnalyticsDates'
import type { McAnalyticsDaily } from '@/types/mc'

type VisitsBarChartProps = {
  daily: McAnalyticsDaily[]
  metric?: keyof Pick<McAnalyticsDaily, 'visits' | 'pageViews' | 'productViews' | 'checkoutStarts'>
  className?: string
  highlightLast?: boolean
}

export function VisitsBarChart({
  daily,
  metric = 'visits',
  className,
  highlightLast = true,
}: VisitsBarChartProps) {
  const values = daily.map((d) => Number(d[metric] ?? 0))
  const max = Math.max(1, ...values)
  const lastIndex = daily.length - 1

  return (
    <div className={clsx('space-y-3', className)}>
      <div
        className="flex h-44 items-end gap-1.5 sm:h-52 sm:gap-2"
        role="img"
        aria-label="Gráfico de visitas por día"
      >
        {daily.map((row, i) => {
          const value = values[i] ?? 0
          const heightPct = Math.max(value > 0 ? 8 : 2, Math.round((value / max) * 100))
          const isLast = highlightLast && i === lastIndex
          return (
            <div key={row.dateKey} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-[10px] font-medium tabular-nums text-[var(--cat-muted)] opacity-0 transition group-hover:opacity-100 sm:text-[11px]">
                {value}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={clsx(
                    'w-full rounded-t-sm transition-all duration-500',
                    isLast
                      ? 'bg-[var(--cat-accent)] shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--cat-accent)_55%,transparent)]'
                      : 'bg-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--cat-text)_20%,transparent)]',
                  )}
                  style={{ height: `${heightPct}%` }}
                  title={`${mcAnalyticsShortDayLabel(row.dateKey)}: ${value}`}
                />
              </div>
              <span
                className={clsx(
                  'truncate text-[9px] uppercase tracking-wide sm:text-[10px]',
                  isLast ? 'font-semibold text-[var(--cat-text)]' : 'text-[var(--cat-muted)]',
                )}
              >
                {mcAnalyticsShortDayLabel(row.dateKey)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
