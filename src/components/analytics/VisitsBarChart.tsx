import clsx from 'clsx'
import { useEffect, useMemo, useRef } from 'react'
import { mcAnalyticsDayLabelParts } from '@/lib/mcAnalyticsDates'
import type { McAnalyticsDaily } from '@/types/mc'

type VisitsBarChartProps = {
  daily: McAnalyticsDaily[]
  metric?: keyof Pick<McAnalyticsDaily, 'visits' | 'pageViews' | 'productViews' | 'checkoutStarts'>
  className?: string
  highlightLast?: boolean
}

const BAR_WIDTH_PX = 36
const BAR_GAP_PX = 8
const SCROLL_THRESHOLD = 8

function shouldShowValueLabel(
  value: number,
  index: number,
  lastIndex: number,
  maxValue: number,
): boolean {
  if (value <= 0) return false
  if (index === lastIndex) return true
  if (value === maxValue && maxValue > 0) return true
  return false
}

export function VisitsBarChart({
  daily,
  metric = 'visits',
  className,
  highlightLast = true,
}: VisitsBarChartProps) {
  const values = daily.map((d) => Number(d[metric] ?? 0))
  const max = Math.max(1, ...values)
  const maxValue = Math.max(0, ...values)
  const lastIndex = daily.length - 1
  const useScrollLayout = daily.length >= SCROLL_THRESHOLD
  const scrollRef = useRef<HTMLDivElement>(null)

  const chartMinWidth = useMemo(
    () => daily.length * BAR_WIDTH_PX + Math.max(0, daily.length - 1) * BAR_GAP_PX,
    [daily.length],
  )

  useEffect(() => {
    if (!useScrollLayout) return
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = el.scrollWidth - el.clientWidth
  }, [useScrollLayout, chartMinWidth])

  return (
    <div className={clsx('relative', className)}>
      {useScrollLayout ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--cat-surface)] to-transparent sm:hidden"
          aria-hidden
        />
      ) : null}

      <div
        ref={scrollRef}
        className={clsx(
          'overflow-x-auto overscroll-x-contain pb-1',
          useScrollLayout && '-mx-1 px-1 [scrollbar-width:thin]',
        )}
      >
        <div
          className={clsx('flex items-end', useScrollLayout ? 'gap-2' : 'w-full gap-1.5 sm:gap-2')}
          style={useScrollLayout ? { minWidth: chartMinWidth } : undefined}
          role="img"
          aria-label="Gráfico de visitas por día"
        >
          {daily.map((row, i) => {
            const value = values[i] ?? 0
            const heightPct = Math.max(value > 0 ? 10 : 3, Math.round((value / max) * 100))
            const isLast = highlightLast && i === lastIndex
            const showValue = shouldShowValueLabel(value, i, lastIndex, maxValue)
            const { weekday, day } = mcAnalyticsDayLabelParts(row.dateKey)

            return (
              <div
                key={row.dateKey}
                className={clsx(
                  'group flex shrink-0 flex-col items-center',
                  useScrollLayout ? 'w-9' : 'min-w-0 flex-1',
                )}
              >
                <div className="flex h-[168px] w-full flex-col items-center justify-end gap-1.5 sm:h-[196px]">
                  <span
                    className={clsx(
                      'text-[10px] font-semibold tabular-nums leading-none sm:text-[11px]',
                      showValue ? 'text-[var(--cat-text)]' : 'text-transparent',
                      !showValue && 'group-hover:text-[var(--cat-muted)]',
                    )}
                    aria-hidden={!showValue}
                  >
                    {value}
                  </span>
                  <div className="flex w-full flex-1 items-end border-b border-neutral-200/70 pb-px">
                    <div
                      className={clsx(
                        'mx-auto w-[72%] max-w-[28px] rounded-t-[3px] transition-all duration-500 sm:max-w-[32px]',
                        isLast
                          ? 'bg-[var(--cat-accent)] shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--cat-accent)_55%,transparent)]'
                          : 'bg-[color-mix(in_srgb,var(--cat-text)_14%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--cat-text)_22%,transparent)]',
                      )}
                      style={{ height: `${heightPct}%` }}
                      title={`${weekday} ${day}: ${value}`}
                    />
                  </div>
                </div>

                <div
                  className={clsx(
                    'mt-2 flex w-full flex-col items-center gap-0.5 leading-none',
                    isLast ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)]',
                  )}
                >
                  <span
                    className={clsx(
                      'text-[9px] font-medium uppercase tracking-wide sm:text-[10px]',
                      isLast && 'font-semibold',
                    )}
                  >
                    {weekday}
                  </span>
                  <span
                    className={clsx(
                      'text-[10px] tabular-nums sm:text-[11px]',
                      isLast ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {day}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {useScrollLayout ? (
        <p className="mt-2 text-center text-[11px] text-[var(--cat-muted)] sm:hidden">
          Deslizá para ver todos los días
        </p>
      ) : null}
    </div>
  )
}
