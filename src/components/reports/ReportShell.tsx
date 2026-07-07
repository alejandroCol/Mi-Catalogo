import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronLeft } from '@/icons/McIcons'
import {
  REPORT_PERIOD_OPTIONS,
  reportFormatRangeLabel,
  reportPresetToRange,
  type ReportPeriodPreset,
} from '@/lib/reports/reportDateRange'

type Props = {
  backTo: string
  backLabel?: string
  eyebrow: string
  title: string
  subtitle?: string
  preset: ReportPeriodPreset
  onPresetChange: (preset: ReportPeriodPreset) => void
  customDesde?: string
  customHasta?: string
  onCustomDesdeChange?: (v: string) => void
  onCustomHastaChange?: (v: string) => void
  children: React.ReactNode
  toolbar?: React.ReactNode
}

export function ReportShell({
  backTo,
  backLabel = 'Volver',
  eyebrow,
  title,
  subtitle,
  preset,
  onPresetChange,
  customDesde,
  customHasta,
  onCustomDesdeChange,
  onCustomHastaChange,
  children,
  toolbar,
}: Props) {
  const range = reportPresetToRange(
    preset,
    preset === 'personalizado' ? { desde: customDesde ?? '', hasta: customHasta ?? '' } : undefined,
  )

  return (
    <div className="mc-shell mc-reports space-y-6 pb-28 sm:space-y-8">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        {backLabel}
      </Link>

      <section className="mc-reports-hero relative overflow-hidden border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-7 sm:px-8 sm:py-9">
        <div
          className="pointer-events-none absolute -right-10 top-0 h-44 w-44 rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">{eyebrow}</p>
            <h1 className="mt-2 text-[1.65rem] font-medium leading-[1.12] tracking-tighter text-[var(--cat-text)] sm:text-[2rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--cat-muted)]">{subtitle}</p>
            ) : null}
            <p className="mt-3 text-[12px] font-medium tabular-nums text-[var(--cat-muted)]">
              {reportFormatRangeLabel(range.desde, range.hasta)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REPORT_PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPresetChange(opt.id)}
                className={`border px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition ${
                  preset === opt.id
                    ? 'border-[var(--cat-text)] bg-[var(--cat-text)] text-[var(--cat-surface)]'
                    : 'border-neutral-200/70 bg-[var(--cat-surface)] text-[var(--cat-muted)] hover:border-neutral-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPresetChange('personalizado')}
              className={`border px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition ${
                preset === 'personalizado'
                  ? 'border-[var(--cat-text)] bg-[var(--cat-text)] text-[var(--cat-surface)]'
                  : 'border-neutral-200/70 bg-[var(--cat-surface)] text-[var(--cat-muted)] hover:border-neutral-300'
              }`}
            >
              Personalizado
            </button>
          </div>
        </div>

        {preset === 'personalizado' ? (
          <div className="relative mt-4 flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--cat-muted)]">
              Desde
              <input
                type="date"
                className="mc-input bg-white"
                value={customDesde ?? ''}
                onChange={(e) => onCustomDesdeChange?.(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--cat-muted)]">
              Hasta
              <input
                type="date"
                className="mc-input bg-white"
                value={customHasta ?? ''}
                onChange={(e) => onCustomHastaChange?.(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {toolbar ? <div className="relative mt-5 flex flex-wrap gap-2">{toolbar}</div> : null}
      </section>

      {children}
    </div>
  )
}

export function useReportRangeState(initial: ReportPeriodPreset = '7d') {
  const [preset, setPreset] = useState(initial)
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')

  const range = reportPresetToRange(
    preset,
    preset === 'personalizado' ? { desde: customDesde, hasta: customHasta } : undefined,
  )

  return {
    preset,
    setPreset,
    customDesde,
    setCustomDesde,
    customHasta,
    setCustomHasta,
    range,
  }
}
