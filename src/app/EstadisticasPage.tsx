import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { AnalyticsStatCard, AnalyticsStatGrid } from '@/components/analytics/AnalyticsStatCard'
import { VisitsBarChart } from '@/components/analytics/VisitsBarChart'
import { useTenantAnalytics } from '@/hooks/useTenantAnalytics'
import { useTenantTopProducts } from '@/hooks/useTenantTopProducts'
import { TopProductsRanking } from '@/components/analytics/TopProductsRanking'
import { mcAnalyticsDateKeyBogota } from '@/lib/mcAnalyticsDates'
import { buildStorePublicUrl, formatStorePublicUrlLabel } from '@/lib/storePublicUrl'
import { IconChartBars, IconChevronLeft, IconChevronRight } from '@/icons/McIcons'
import type { McAnalyticsPeriod } from '@/types/mc'

const PERIOD_OPTIONS: { id: McAnalyticsPeriod; label: string }[] = [
  { id: '7d', label: '7 días' },
  { id: '14d', label: '14 días' },
  { id: '30d', label: '30 días' },
]

function formatPercent(n: number, total: number): string {
  if (total <= 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

export function EstadisticasPage() {
  const { profile, tenant, effectiveTenantId } = useMcAuth()
  const [period, setPeriod] = useState<McAnalyticsPeriod>('14d')
  const { summary, loading, err, reload } = useTenantAnalytics(effectiveTenantId, period)
  const {
    rows: topProducts,
    loading: topProductsLoading,
    err: topProductsErr,
    reload: reloadTopProducts,
  } = useTenantTopProducts(effectiveTenantId, period)

  const todayKey = mcAnalyticsDateKeyBogota()
  const todayVisits = summary?.daily.find((d) => d.dateKey === todayKey)?.visits ?? 0
  const conversion =
    summary && summary.visits > 0
      ? formatPercent(summary.checkoutCompletes, summary.visits)
      : '0%'

  const periodLabel = PERIOD_OPTIONS.find((p) => p.id === period)?.label ?? period

  const insight = useMemo(() => {
    if (!summary || summary.daily.length < 2) return null
    const half = Math.floor(summary.daily.length / 2)
    const first = summary.daily.slice(0, half).reduce((s, d) => s + d.visits, 0)
    const second = summary.daily.slice(half).reduce((s, d) => s + d.visits, 0)
    if (first === 0 && second === 0) return 'Aún no hay visitas en este periodo. Compartí tu catálogo para empezar a medir.'
    if (second > first * 1.1) return 'Tu tráfico viene en alza respecto a la primera mitad del periodo.'
    if (second < first * 0.9) return 'El tráfico bajó un poco. Probá compartir el link en historias o WhatsApp.'
    return 'Tráfico estable. Seguí compartiendo tu catálogo para mantener el ritmo.'
  }, [summary])

  if (!tenant || !profile) {
    return (
      <div className="mc-shell">
        <p className="ios-subhead">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="mc-shell space-y-6 pb-28 sm:space-y-8">
      <Link
        to="/app"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        Inicio
      </Link>

      <section className="relative overflow-hidden border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-7 sm:px-8 sm:py-9">
        <div
          className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_16%,transparent)] blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[var(--cat-muted)]">
              <IconChartBars size={18} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Estadísticas</p>
            </div>
            <h1 className="mt-2 text-[1.65rem] font-medium leading-[1.12] tracking-tighter text-[var(--cat-text)] sm:text-[2rem]">
              Visitas a tu catálogo
            </h1>
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-[var(--cat-muted)]">
              Personas que entraron a{' '}
              <strong className="font-medium text-[var(--cat-text)]">{formatStorePublicUrlLabel(tenant.slug)}</strong>.
              Cada visitante se cuenta una vez por día.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`border px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] transition ${
                  period === opt.id
                    ? 'border-[var(--cat-text)] bg-[var(--cat-text)] text-[var(--cat-surface)]'
                    : 'border-neutral-200/70 bg-[var(--cat-surface)] text-[var(--cat-muted)] hover:border-neutral-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {err ? (
        <div className="border border-red-200/60 bg-red-50/40 px-5 py-4 text-[13px] text-red-900">
          {err}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void reload()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <AnalyticsStatGrid>
        <AnalyticsStatCard
          label="Hoy"
          value={todayVisits}
          hint="Visitantes únicos hoy"
          accent
          loading={loading}
        />
        <AnalyticsStatCard
          label={`Total ${periodLabel}`}
          value={summary?.visits ?? 0}
          hint="Visitantes únicos"
          loading={loading}
        />
        <AnalyticsStatCard
          label="Vistas de producto"
          value={summary?.productViews ?? 0}
          hint="Detalle de artículo"
          loading={loading}
        />
        <AnalyticsStatCard
          label="Conversión checkout"
          value={conversion}
          hint={`${summary?.checkoutCompletes ?? 0} completados`}
          loading={loading}
        />
      </AnalyticsStatGrid>

      <section className="border border-neutral-200/50 bg-[var(--cat-surface)] p-5 sm:p-7">
        <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[15px] font-medium tracking-tight text-[var(--cat-text)]">Tendencia diaria</h2>
            <p className="mt-1 text-[13px] text-[var(--cat-muted)]">Visitantes únicos por día</p>
          </div>
          {!loading && summary ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-neutral-100 pt-3 text-[12px] text-[var(--cat-muted)] sm:border-0 sm:pt-0">
              <span>
                <span className="font-semibold tabular-nums text-[var(--cat-text)]">{summary.pageViews}</span>{' '}
                vistas totales
              </span>
              <span className="hidden h-3 w-px bg-neutral-200 sm:block" aria-hidden />
              <span>
                <span className="font-semibold tabular-nums text-[var(--cat-text)]">{summary.checkoutStarts}</span>{' '}
                checkouts iniciados
              </span>
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="h-[168px] animate-pulse rounded-sm bg-neutral-100 sm:h-[196px]" />
        ) : summary && summary.daily.some((d) => d.visits > 0) ? (
          <VisitsBarChart daily={summary.daily} metric="visits" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center border border-neutral-200/60 text-[var(--cat-muted)]">
              <IconChartBars size={22} />
            </span>
            <p className="max-w-sm text-[14px] leading-relaxed text-[var(--cat-muted)]">
              Todavía no hay visitas registradas. Cuando compartas tu catálogo, acá verás el gráfico.
            </p>
            <a
              href={buildStorePublicUrl(tenant.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[14px] font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
            >
              Abrir catálogo público
              <IconChevronRight size={16} />
            </a>
          </div>
        )}
      </section>

      {insight ? (
        <section className="border border-[color-mix(in_srgb,var(--cat-accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface))] px-5 py-4 text-[13px] leading-relaxed text-[var(--cat-text)]">
          {insight}
        </section>
      ) : null}

      {topProductsErr ? (
        <div className="border border-red-200/60 bg-red-50/40 px-5 py-4 text-[13px] text-red-900">
          {topProductsErr}{' '}
          <button type="button" className="font-semibold underline" onClick={() => void reloadTopProducts()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <TopProductsRanking
        rows={topProducts}
        loading={topProductsLoading}
        slug={tenant.slug}
        periodLabel={periodLabel}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Vistas de página" value={summary?.pageViews ?? 0} loading={loading} />
        <MiniMetric label="Checkouts iniciados" value={summary?.checkoutStarts ?? 0} loading={loading} />
        <MiniMetric label="Checkouts completados" value={summary?.checkoutCompletes ?? 0} loading={loading} />
      </section>
    </div>
  )
}

function MiniMetric({
  label,
  value,
  loading,
}: {
  label: string
  value: number
  loading: boolean
}) {
  return (
    <div className="border border-neutral-200/50 bg-[var(--cat-surface)] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded-sm bg-neutral-100" />
      ) : (
        <p className="mt-1 text-[1.35rem] font-medium tabular-nums tracking-tight text-[var(--cat-text)]">{value}</p>
      )}
    </div>
  )
}
