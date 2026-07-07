import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Navigate, Link, useParams } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { ReportChartPanel } from '@/components/reports/ReportChartPanel'
import { ReportExportBar } from '@/components/reports/ReportExportBar'
import { buildProfitKpis, ReportKpiGrid } from '@/components/reports/ReportKpiGrid'
import { ReportShell, useReportRangeState } from '@/components/reports/ReportShell'
import { usePosProductCostMap } from '@/hooks/usePosProductCostMap'
import { formatCop } from '@/lib/formatCop'
import { exportProfitSummaryExcel, exportProfitSummaryPdf } from '@/lib/reports/exportReport'
import { findPosReport } from '@/lib/reports/reportDefinitions'
import { summarizePosVentasProfit } from '@/lib/reports/profitMetrics'
import { reportFormatRangeLabel } from '@/lib/reports/reportDateRange'
import {
  aggregatePosByDay,
  aggregatePosByDiaSemana,
  aggregatePosByHour,
  aggregatePosByMetodoPago,
  aggregatePosBySede,
  topPosProducts,
} from '@/lib/reports/salesAggregations'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { IconChevronLeft } from '@/icons/McIcons'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosVentas } from '@/pos/hooks/usePosVentas'
import { usePosVendors } from '@/pos/hooks/usePosVendors'
import {
  comparativoPresetToRanges,
  defaultComparativoRanges,
  posFormatRangoLabel,
  posFechaKeyLocal,
  posRangoFechas,
  type ComparativoPreset,
} from '@/pos/lib/posDate'
import { exportTopArticulosExcel, exportVentasExcel } from '@/pos/lib/exportReportes'
import { ventasActivas } from '@/pos/lib/posVentaUtils'

function formatCopTooltip(value: unknown) {
  return formatCop(typeof value === 'number' ? value : 0)
}

export function PosReporteDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const { tenant, profile } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const report = reportId ? findPosReport(reportId) : undefined
  const { sedes } = usePosSedes(tenantId)
  const { vendors } = usePosVendors(tenantId)
  const [sedeFilter, setSedeFilter] = useState('')

  const {
    preset,
    setPreset,
    customDesde,
    setCustomDesde,
    customHasta,
    setCustomHasta,
    range,
  } = useReportRangeState(reportId === 'cierre-periodo' ? 'semana' : '7d')

  const isComparativo = reportId === 'comparativo'
  const [compRanges, setCompRanges] = useState(defaultComparativoRanges)
  const [compPreset, setCompPreset] = useState<ComparativoPreset | 'personalizado'>('7d')

  const { ventas, loading } = usePosVentas(tenantId, {
    sedeId: sedeFilter || undefined,
    desdeMs: range.startMs,
    hastaMs: range.endMs,
    cobradasDesdeMs: range.startMs,
    cobradasHastaMs: range.endMs,
    enabled: !isComparativo,
  })
  const { costMap, loading: loadingCosts } = usePosProductCostMap(tenantId, sedeFilter || null)

  const compRangeA = posRangoFechas(compRanges.desdeA, compRanges.hastaA)
  const compRangeB = posRangoFechas(compRanges.desdeB, compRanges.hastaB)
  const { ventas: ventasCompA, loading: loadingCompA } = usePosVentas(tenantId, {
    sedeId: sedeFilter || undefined,
    desdeMs: compRangeA.start,
    hastaMs: compRangeA.end,
    cobradasDesdeMs: compRangeA.start,
    cobradasHastaMs: compRangeA.end,
    enabled: isComparativo,
  })
  const { ventas: ventasCompB, loading: loadingCompB } = usePosVentas(tenantId, {
    sedeId: sedeFilter || undefined,
    desdeMs: compRangeB.start,
    hastaMs: compRangeB.end,
    cobradasDesdeMs: compRangeB.start,
    cobradasHastaMs: compRangeB.end,
    enabled: isComparativo,
  })

  const ventasActivasList = useMemo(() => ventasActivas(ventas), [ventas])
  const sedeNames = useMemo(() => new Map(sedes.map((s) => [s.id, s.nombre])), [sedes])

  const summary = useMemo(
    () => summarizePosVentasProfit(ventasActivasList, costMap),
    [ventasActivasList, costMap],
  )

  const byDay = useMemo(() => aggregatePosByDay(ventasActivasList), [ventasActivasList])
  const byHour = useMemo(() => aggregatePosByHour(ventasActivasList), [ventasActivasList])
  const bySede = useMemo(() => aggregatePosBySede(ventasActivasList, sedeNames), [ventasActivasList, sedeNames])
  const byDiaSemana = useMemo(() => aggregatePosByDiaSemana(ventasActivasList), [ventasActivasList])
  const byMetodo = useMemo(() => aggregatePosByMetodoPago(ventasActivasList), [ventasActivasList])
  const topProducts = useMemo(() => topPosProducts(ventasActivasList, 15), [ventasActivasList])

  const porVendedor = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventasActivasList) {
      map.set(v.vendedorNombre, (map.get(v.vendedorNombre) ?? 0) + v.totalCop)
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [ventasActivasList])

  const comparativoPeriodos = useMemo(() => {
    const a = ventasActivas(ventasCompA)
    const b = ventasActivas(ventasCompB)
    const totalA = a.reduce((s, v) => s + v.totalCop, 0)
    const totalB = b.reduce((s, v) => s + v.totalCop, 0)
    const labelA = posFormatRangoLabel(compRanges.desdeA, compRanges.hastaA)
    const labelB = posFormatRangoLabel(compRanges.desdeB, compRanges.hastaB)
    const delta = totalB - totalA
    const deltaPct = totalA > 0 ? Math.round((delta / totalA) * 100) : totalB > 0 ? 100 : 0
    return {
      totalA,
      totalB,
      txA: a.length,
      txB: b.length,
      delta,
      deltaPct,
      chart: [
        { periodo: labelA, total: totalA },
        { periodo: labelB, total: totalB },
      ],
    }
  }, [ventasCompA, ventasCompB, compRanges])

  if (!report) return <Navigate to="/pos/admin/reportes" replace />

  const reportDef = report
  const rangeLabel = reportFormatRangeLabel(range.desde, range.hasta)
  const fileSuffix = `${range.desde}_${range.hasta}`
  const loadingAll = loading || loadingCosts

  function exportExcel() {
    exportProfitSummaryExcel(`POS ${reportDef.title}`, rangeLabel, summary, `pos_${reportDef.id}_${fileSuffix}.xlsx`)
  }

  function exportPdf() {
    exportProfitSummaryPdf({
      channelLabel: 'POS',
      reportTitle: reportDef.title,
      rangeDesde: range.desde,
      rangeHasta: range.hasta,
      summary,
      tables: [{ title: 'Ventas por sede', rows: bySede }],
      filename: `pos_${reportDef.id}_${fileSuffix}.pdf`,
    })
  }

  const sedeSelect = (
    <label className="flex flex-col gap-1 text-[12px] text-[var(--cat-muted)]">
      Sede
      <select className="mc-input bg-white" value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)}>
        <option value="">Todas</option>
        {sedes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="mc-pos-page mc-pos-reportes">
      {!isComparativo ? (
        <ReportShell
          backTo="/pos/admin/reportes"
          backLabel="Reportes"
          eyebrow="Análisis"
          title={report.title}
          subtitle={report.subtitle}
          preset={preset}
          onPresetChange={setPreset}
          customDesde={customDesde}
          customHasta={customHasta}
          onCustomDesdeChange={setCustomDesde}
          onCustomHastaChange={setCustomHasta}
          toolbar={
            <>
              {sedeSelect}
              <ReportExportBar
                disabled={loadingAll}
                onExportExcel={
                  report.id === 'articulos'
                    ? () => exportTopArticulosExcel(topProducts.map((p) => ({ nombre: p.nombre, unidades: p.unidades, total: p.ingresoCop })), `pos_top_${fileSuffix}.xlsx`)
                    : report.id === 'general'
                      ? () => exportVentasExcel(ventasActivasList, `pos_ventas_${fileSuffix}.xlsx`)
                      : exportExcel
                }
                onExportPdf={exportPdf}
              />
            </>
          }
        >
          {(report.id === 'ventas-ganancias' || report.id === 'cierre-periodo' || report.id === 'estado-cuenta') && (
            <>
              <ReportKpiGrid items={buildProfitKpis(summary, false)} loading={loadingAll} />
              <div className="mc-reports-charts">
                <ReportChartPanel title="Ventas por día" data={byDay} type="area" loading={loadingAll} />
                <ReportChartPanel
                  title="Ingreso vs costo vs ganancia"
                  data={[
                    { label: 'Ingreso', value: summary.ingresoBrutoCop },
                    { label: 'Costo', value: summary.costoConocidoCop },
                    { label: 'Ganancia', value: summary.gananciaNetaCop },
                  ]}
                  type="bar"
                  loading={loadingAll}
                />
              </div>
            </>
          )}

          {report.id === 'horarios-venta' && (
            <ReportChartPanel title="Ventas por hora" data={byHour} type="line" height={340} loading={loadingAll} />
          )}

          {report.id === 'por-sede' && (
            <div className="mc-reports-charts">
              <ReportChartPanel title="Ventas por sede" data={bySede} type="horizontal-bar" height={340} loading={loadingAll} />
              <ReportChartPanel title="Distribución" data={bySede.slice(0, 6)} type="pie" loading={loadingAll} />
            </div>
          )}

          {report.id === 'por-dia-semana' && (
            <ReportChartPanel title="Ventas por día de la semana" data={byDiaSemana} type="bar" height={340} loading={loadingAll} />
          )}

          {report.id === 'productos-margen' && (
            <ReportChartPanel
              title="Top productos"
              data={topProducts.map((p) => ({ label: p.nombre.slice(0, 28), value: p.ingresoCop }))}
              type="horizontal-bar"
              height={380}
              loading={loadingAll}
            />
          )}

          {report.id === 'metodos-pago' && (
            <ReportChartPanel title="Métodos de pago" data={byMetodo} type="pie" height={340} loading={loadingAll} />
          )}

          {report.id === 'general' && (
            <div className="mc-reports-charts">
              <ReportChartPanel title="Ventas por día" data={byDay} type="area" loading={loadingAll} />
              {bySede.length > 0 ? (
                <ReportChartPanel title="Por sede" data={bySede} type="pie" loading={loadingAll} />
              ) : null}
            </div>
          )}

          {report.id === 'vendedores' && (
            <ReportChartPanel title="Ventas por vendedor" data={porVendedor} type="horizontal-bar" height={360} loading={loadingAll} />
          )}

          {report.id === 'articulos' && (
            <>
              <ReportChartPanel
                title="Top 15 artículos"
                data={topProducts.map((p) => ({ label: p.nombre.slice(0, 20), value: p.ingresoCop }))}
                type="bar"
                height={360}
                loading={loadingAll}
              />
              <ReportKpiGrid
                loading={loadingAll}
                items={[
                  { label: 'Vendedores activos', value: String(vendors.filter((v) => v.active !== false).length) },
                  { label: 'Transacciones', value: String(summary.transacciones) },
                  { label: 'Ticket promedio', value: formatCop(summary.ticketPromedioCop) },
                ]}
              />
            </>
          )}
        </ReportShell>
      ) : (
        <>
          <Link
            to="/pos/admin/reportes"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
          >
            <IconChevronLeft size={16} />
            Reportes
          </Link>
          <PosPageHeader icon="reportes" eyebrow="Reportes POS" title={report.title} subtitle={report.subtitle} />
          <div className="mb-4 flex flex-wrap gap-3">{sedeSelect}</div>
          <div className="mc-pos-comparativo-filters">
            <div className="mc-pos-comparativo-presets">
              {(
                [
                  ['7d', '7 días vs anterior'],
                  ['30d', '30 días vs anterior'],
                  ['mes', 'Este mes vs anterior'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`mc-pos-payment-pill ${compPreset === id ? 'mc-pos-payment-pill--active' : ''}`}
                  onClick={() => {
                    setCompPreset(id)
                    setCompRanges(comparativoPresetToRanges(id))
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mc-pos-comparativo-rangos">
              <fieldset className="mc-pos-comparativo-rango">
                <legend>Período A</legend>
                <label className="mc-pos-field mc-pos-field--inline">
                  <span>Desde</span>
                  <input type="date" value={compRanges.desdeA} max={compRanges.hastaA} onChange={(e) => { setCompPreset('personalizado'); setCompRanges((p) => ({ ...p, desdeA: e.target.value })) }} />
                </label>
                <label className="mc-pos-field mc-pos-field--inline">
                  <span>Hasta</span>
                  <input type="date" value={compRanges.hastaA} min={compRanges.desdeA} max={posFechaKeyLocal()} onChange={(e) => { setCompPreset('personalizado'); setCompRanges((p) => ({ ...p, hastaA: e.target.value })) }} />
                </label>
              </fieldset>
              <fieldset className="mc-pos-comparativo-rango">
                <legend>Período B</legend>
                <label className="mc-pos-field mc-pos-field--inline">
                  <span>Desde</span>
                  <input type="date" value={compRanges.desdeB} max={compRanges.hastaB} onChange={(e) => { setCompPreset('personalizado'); setCompRanges((p) => ({ ...p, desdeB: e.target.value })) }} />
                </label>
                <label className="mc-pos-field mc-pos-field--inline">
                  <span>Hasta</span>
                  <input type="date" value={compRanges.hastaB} min={compRanges.desdeB} max={posFechaKeyLocal()} onChange={(e) => { setCompPreset('personalizado'); setCompRanges((p) => ({ ...p, hastaB: e.target.value })) }} />
                </label>
              </fieldset>
            </div>
          </div>

          <section className="mc-pos-kpi-grid mc-pos-kpi-grid--comparativo">
            <article className="mc-pos-kpi-card">
              <p className="mc-pos-kpi-card__label">Período A</p>
              <p className="mc-pos-kpi-card__value">{loadingCompA ? '…' : formatCop(comparativoPeriodos.totalA)}</p>
              <p className="mc-pos-kpi-card__meta">{comparativoPeriodos.txA} transacciones</p>
            </article>
            <article className="mc-pos-kpi-card mc-pos-kpi-card--highlight">
              <p className="mc-pos-kpi-card__label">Período B</p>
              <p className="mc-pos-kpi-card__value">{loadingCompB ? '…' : formatCop(comparativoPeriodos.totalB)}</p>
              <p className="mc-pos-kpi-card__meta">{comparativoPeriodos.txB} transacciones</p>
            </article>
            <article className="mc-pos-kpi-card">
              <p className="mc-pos-kpi-card__label">Variación</p>
              <p className={`mc-pos-kpi-card__value ${comparativoPeriodos.delta >= 0 ? 'mc-pos-kpi-card__value--up' : 'mc-pos-kpi-card__value--down'}`}>
                {loadingCompA || loadingCompB ? '…' : `${comparativoPeriodos.delta >= 0 ? '+' : ''}${formatCop(comparativoPeriodos.delta)}`}
              </p>
              <p className="mc-pos-kpi-card__meta">
                {loadingCompA || loadingCompB ? '—' : `${comparativoPeriodos.deltaPct >= 0 ? '+' : ''}${comparativoPeriodos.deltaPct}% vs A`}
              </p>
            </article>
          </section>

          <article className="mc-pos-chart-card">
            <h3 className="mc-pos-chart-card__title">Comparativo por rango</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparativoPeriodos.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={formatCopTooltip} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {comparativoPeriodos.chart.map((_, i) => (
                    <Cell key={i} fill={i === 1 ? '#c5a367' : '#d4d0cb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </article>
        </>
      )}
    </div>
  )
}
