import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { ReportChartPanel, ReportDualChartPanel } from '@/components/reports/ReportChartPanel'
import { ReportCancellationsPanel } from '@/components/reports/ReportCancellationsPanel'
import { ReportExportBar } from '@/components/reports/ReportExportBar'
import { buildProfitKpis, ReportKpiGrid } from '@/components/reports/ReportKpiGrid'
import { ReportShell, useReportRangeState } from '@/components/reports/ReportShell'
import { useCatalogOrdenes } from '@/hooks/useCatalogOrdenes'
import { useCatalogProductCostMap } from '@/hooks/useCatalogProductCostMap'
import { useReportAnalyticsDaily } from '@/hooks/useReportAnalyticsDaily'
import { mcAnalyticsDateKeyBogota } from '@/lib/mcAnalyticsDates'
import { formatCop } from '@/lib/formatCop'
import {
  exportChartPointsExcel,
  exportProfitSummaryExcel,
  exportProfitSummaryPdf,
} from '@/lib/reports/exportReport'
import { findCatalogReport } from '@/lib/reports/reportDefinitions'
import {
  catalogLineProfit,
  isOrdenCatalogoVentaValida,
  summarizeCatalogCancellations,
  summarizeCatalogOrdersProfit,
} from '@/lib/reports/profitMetrics'
import { reportFormatRangeLabel } from '@/lib/reports/reportDateRange'
import {
  aggregateCatalogByCiudad,
  aggregateCatalogByDay,
  aggregateCatalogByDiaSemana,
  aggregateCatalogByHour,
  mergeVisitsWithSales,
  topCatalogProducts,
} from '@/lib/reports/salesAggregations'

export function CatalogReporteDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const { effectiveTenantId } = useMcAuth()
  const report = reportId ? findCatalogReport(reportId) : undefined
  const {
    preset,
    setPreset,
    customDesde,
    setCustomDesde,
    customHasta,
    setCustomHasta,
    range,
  } = useReportRangeState(reportId === 'cierre-periodo' ? 'semana' : '7d')

  const { ordenes, loading: loadingOrdenes } = useCatalogOrdenes(effectiveTenantId, {
    desdeMs: range.startMs,
    hastaMs: range.endMs,
  })
  const { costMap, loading: loadingCosts } = useCatalogProductCostMap(effectiveTenantId)
  const { daily, loading: loadingAnalytics } = useReportAnalyticsDaily(effectiveTenantId, range)

  const ventasValidas = useMemo(() => ordenes.filter(isOrdenCatalogoVentaValida), [ordenes])
  const summary = useMemo(
    () => summarizeCatalogOrdersProfit(ventasValidas, costMap),
    [ventasValidas, costMap],
  )
  const cancellations = useMemo(() => summarizeCatalogCancellations(ordenes), [ordenes])

  const byDay = useMemo(() => aggregateCatalogByDay(ventasValidas), [ventasValidas])
  const byHour = useMemo(() => aggregateCatalogByHour(ventasValidas), [ventasValidas])
  const byCiudad = useMemo(() => aggregateCatalogByCiudad(ventasValidas), [ventasValidas])
  const byDiaSemana = useMemo(() => aggregateCatalogByDiaSemana(ventasValidas), [ventasValidas])
  const topProducts = useMemo(() => topCatalogProducts(ventasValidas, 12), [ventasValidas])

  const visitsVsSales = useMemo(() => {
    const salesMap = new Map<string, number>()
    for (const o of ventasValidas) {
      const key = mcAnalyticsDateKeyBogota(o.createdAt)
      salesMap.set(key, (salesMap.get(key) ?? 0) + o.totalCop)
    }
    return mergeVisitsWithSales(daily, salesMap, range)
  }, [ventasValidas, daily, range])

  const conversionSummary = useMemo(() => {
    const visits = daily.reduce((s, d) => s + d.visits, 0)
    const checkoutStarts = daily.reduce((s, d) => s + d.checkoutStarts, 0)
    const checkoutCompletes = daily.reduce((s, d) => s + d.checkoutCompletes, 0)
    const conversionPct = visits > 0 ? Math.round((checkoutCompletes / visits) * 100) : 0
    return { visits, checkoutStarts, checkoutCompletes, conversionPct }
  }, [daily])

  const marginProducts = useMemo(() => {
    const map = new Map<string, { nombre: string; ingreso: number; costo: number; ganancia: number }>()
    for (const o of ventasValidas) {
      for (const line of o.lineas) {
        const p = catalogLineProfit(line, costMap)
        if (!p.tieneCosto || p.gananciaCop == null) continue
        const cur = map.get(line.productId) ?? { nombre: line.nombre, ingreso: 0, costo: 0, ganancia: 0 }
        cur.ingreso += p.ingresoCop
        cur.costo += p.costoCop ?? 0
        cur.ganancia += p.gananciaCop
        map.set(line.productId, cur)
      }
    }
    return [...map.values()].sort((a, b) => b.ganancia - a.ganancia).slice(0, 12)
  }, [ventasValidas, costMap])

  const loading = loadingOrdenes || loadingCosts

  if (!report) return <Navigate to="/app/reportes" replace />

  const reportDef = report
  const rangeLabel = reportFormatRangeLabel(range.desde, range.hasta)
  const fileSuffix = `${range.desde}_${range.hasta}`

  function exportExcel() {
    exportProfitSummaryExcel(reportDef.title, rangeLabel, summary, `catalogo_${reportDef.id}_${fileSuffix}.xlsx`)
  }

  function exportPdf() {
    exportProfitSummaryPdf({
      channelLabel: 'Tienda virtual',
      reportTitle: reportDef.title,
      rangeDesde: range.desde,
      rangeHasta: range.hasta,
      summary,
      tables: [{ title: 'Ventas por día', rows: byDay }],
      filename: `catalogo_${reportDef.id}_${fileSuffix}.pdf`,
    })
  }

  function exportChartExcel(rows: { label: string; value: number }[], name: string) {
    exportChartPointsExcel(rows, [{ key: 'label', header: 'Concepto' }, { key: 'value', header: 'Monto COP' }], name, `catalogo_${reportDef.id}_${name}_${fileSuffix}.xlsx`)
  }

  return (
    <ReportShell
      backTo="/app/reportes"
      backLabel="Reportes"
      eyebrow="Tienda virtual"
      title={report.title}
      subtitle={report.subtitle}
      preset={preset}
      onPresetChange={setPreset}
      customDesde={customDesde}
      customHasta={customHasta}
      onCustomDesdeChange={setCustomDesde}
      onCustomHastaChange={setCustomHasta}
      toolbar={
        <ReportExportBar
          disabled={loading}
          onExportExcel={
            report.id === 'horarios-venta' || report.id === 'por-ciudad' || report.id === 'por-dia-semana'
              ? () => {
                  if (report.id === 'horarios-venta') exportChartExcel(byHour, 'horarios')
                  if (report.id === 'por-ciudad') exportChartExcel(byCiudad, 'ciudades')
                  if (report.id === 'por-dia-semana') exportChartExcel(byDiaSemana, 'dias')
                }
              : exportExcel
          }
          onExportPdf={exportPdf}
        />
      }
    >
      {(report.id === 'ventas-ganancias' || report.id === 'cierre-periodo' || report.id === 'estado-cuenta') && (
        <>
          <ReportKpiGrid items={buildProfitKpis(summary)} loading={loading} />
          <div className="mc-reports-charts">
            <ReportChartPanel title="Ventas por día" data={byDay} type="area" loading={loading} />
            <ReportChartPanel
              title="Comisión pasarela vs ganancia neta"
              subtitle="Desglose estimado según tarifa OnePay"
              data={[
                { label: 'Ingreso bruto', value: summary.ingresoBrutoCop },
                { label: 'Costo productos', value: summary.costoConocidoCop },
                { label: 'Comisión pasarela', value: summary.comisionPasarelaCop },
                { label: 'Ganancia neta', value: summary.gananciaNetaCop },
              ]}
              type="bar"
              loading={loading}
            />
          </div>
          {summary.lineasSinCosto > 0 ? (
            <p className="mc-reports-note">
              {summary.lineasSinCosto} líneas no tienen precio de costo. Agregalo al crear o editar productos para
              calcular el margen completo. Los productos existentes siguen funcionando sin cambios.
            </p>
          ) : null}
          <ReportCancellationsPanel ordenes={ordenes} summary={cancellations} loading={loading} />
        </>
      )}

      {report.id === 'horarios-venta' && (
        <div className="mc-reports-charts">
          <ReportChartPanel
            title="Ventas por hora del día"
            subtitle="Basado en la hora de creación de cada pedido"
            data={byHour}
            type="line"
            loading={loading}
          />
          <ReportDualChartPanel title="Visitas vs ventas diarias" data={visitsVsSales} loading={loading || loadingAnalytics} />
        </div>
      )}

      {report.id === 'por-ciudad' && (
        <div className="mc-reports-charts">
          <ReportChartPanel title="Ventas por ciudad" data={byCiudad} type="horizontal-bar" height={360} loading={loading} />
          <ReportChartPanel title="Distribución" data={byCiudad.slice(0, 6)} type="pie" loading={loading} />
        </div>
      )}

      {report.id === 'por-dia-semana' && (
        <ReportChartPanel title="Ventas por día de la semana" data={byDiaSemana} type="bar" height={340} loading={loading} />
      )}

      {report.id === 'productos-margen' && (
        <>
          <ReportChartPanel
            title="Top productos por ingreso"
            data={topProducts.map((p) => ({ label: p.nombre.slice(0, 24), value: p.ingresoCop }))}
            type="horizontal-bar"
            height={360}
            loading={loading}
          />
          {marginProducts.length > 0 ? (
            <section className="mc-reports-table-wrap mc-reports-fade-in">
              <h3 className="mc-reports-chart__title mb-3">Margen por producto (con costo registrado)</h3>
              <div className="overflow-x-auto">
                <table className="mc-reports-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Ingreso</th>
                      <th>Costo</th>
                      <th>Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marginProducts.map((p) => (
                      <tr key={p.nombre}>
                        <td>{p.nombre}</td>
                        <td>{formatCop(p.ingreso)}</td>
                        <td>{formatCop(p.costo)}</td>
                        <td>{formatCop(p.ganancia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <p className="mc-reports-note">
              Aún no hay productos con precio de costo. Configuralo en Inventario para ver márgenes por artículo.
            </p>
          )}
        </>
      )}

      {report.id === 'conversion-trafico' && (
        <>
          <ReportKpiGrid
            loading={loadingAnalytics}
            items={[
              { label: 'Visitas', value: String(conversionSummary.visits), highlight: true },
              { label: 'Inicios checkout', value: String(conversionSummary.checkoutStarts) },
              { label: 'Compras completadas', value: String(conversionSummary.checkoutCompletes) },
              { label: 'Conversión', value: `${conversionSummary.conversionPct}%` },
              { label: 'Ventas periodo', value: formatCop(summary.ingresoBrutoCop) },
            ]}
          />
          <ReportDualChartPanel title="Tráfico vs facturación" data={visitsVsSales} loading={loadingAnalytics} />
        </>
      )}
    </ReportShell>
  )
}
