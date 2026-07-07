import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ReportChartPanel, ReportDualChartPanel } from '@/components/reports/ReportChartPanel'
import { ReportExportBar } from '@/components/reports/ReportExportBar'
import { buildProfitKpis, ReportKpiGrid } from '@/components/reports/ReportKpiGrid'
import { ReportShell, useReportRangeState } from '@/components/reports/ReportShell'
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
  summarizeCatalogOrdersProfit,
  type ProductCostLookup,
} from '@/lib/reports/profitMetrics'
import { reportDateKeysBetween, reportFormatRangeLabel } from '@/lib/reports/reportDateRange'
import {
  aggregateCatalogByCiudad,
  aggregateCatalogByDay,
  aggregateCatalogByDiaSemana,
  aggregateCatalogByHour,
  mergeVisitsWithSales,
  topCatalogProducts,
} from '@/lib/reports/salesAggregations'
import { useDemoAdmin } from '@/vendedor/demo-admin/DemoAdminContext'
import { demoAdminPath } from '@/vendedor/demo-admin/demoAdminPaths'

export function DemoAdminReporteDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const { demo, ventas, products, analyticsByPeriod } = useDemoAdmin()
  const report = reportId ? findCatalogReport(reportId) : undefined
  const reportesPath = demoAdminPath(demo.id, 'reportes')
  const {
    preset,
    setPreset,
    customDesde,
    setCustomDesde,
    customHasta,
    setCustomHasta,
    range,
  } = useReportRangeState(reportId === 'cierre-periodo' ? 'semana' : '7d')

  const ordenes = useMemo(
    () => ventas.filter((o) => o.createdAt >= range.startMs && o.createdAt < range.endMs),
    [ventas, range.startMs, range.endMs],
  )

  const costMap = useMemo((): ProductCostLookup => {
    const map: ProductCostLookup = new Map()
    for (const p of products) {
      map.set(p.id, { precioCostoCop: p.precioCostoCop })
    }
    return map
  }, [products])

  const daily = useMemo(() => {
    const keys = new Set(reportDateKeysBetween(range.desde, range.hasta))
    return analyticsByPeriod['30d'].daily.filter((d) => keys.has(d.dateKey))
  }, [analyticsByPeriod, range.desde, range.hasta])

  const ventasValidas = useMemo(() => ordenes.filter(isOrdenCatalogoVentaValida), [ordenes])
  const summary = useMemo(
    () => summarizeCatalogOrdersProfit(ventasValidas, costMap),
    [ventasValidas, costMap],
  )

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

  if (!report) return <Navigate to={reportesPath} replace />

  const reportDef = report
  const rangeLabel = reportFormatRangeLabel(range.desde, range.hasta)
  const fileSuffix = `${range.desde}_${range.hasta}`

  function exportExcel() {
    exportProfitSummaryExcel(reportDef.title, rangeLabel, summary, `catalogo_demo_${reportDef.id}_${fileSuffix}.xlsx`)
  }

  function exportPdf() {
    exportProfitSummaryPdf({
      channelLabel: 'Tienda virtual (demo)',
      reportTitle: reportDef.title,
      rangeDesde: range.desde,
      rangeHasta: range.hasta,
      summary,
      tables: [{ title: 'Ventas por día', rows: byDay }],
      filename: `catalogo_demo_${reportDef.id}_${fileSuffix}.pdf`,
    })
  }

  function exportChartExcel(rows: { label: string; value: number }[], name: string) {
    exportChartPointsExcel(
      rows,
      [
        { key: 'label', header: 'Concepto' },
        { key: 'value', header: 'Monto COP' },
      ],
      name,
      `catalogo_demo_${reportDef.id}_${name}_${fileSuffix}.xlsx`,
    )
  }

  return (
    <ReportShell
      backTo={reportesPath}
      backLabel="Reportes"
      eyebrow="Tienda virtual · demo"
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
          <ReportKpiGrid items={buildProfitKpis(summary)} />
          <div className="mc-reports-charts">
            <ReportChartPanel title="Ventas por día" data={byDay} type="area" />
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
            />
          </div>
        </>
      )}

      {report.id === 'horarios-venta' && (
        <div className="mc-reports-charts">
          <ReportChartPanel
            title="Ventas por hora del día"
            subtitle="Basado en la hora de creación de cada pedido"
            data={byHour}
            type="line"
          />
          <ReportDualChartPanel title="Visitas vs ventas diarias" data={visitsVsSales} />
        </div>
      )}

      {report.id === 'por-ciudad' && (
        <div className="mc-reports-charts">
          <ReportChartPanel title="Ventas por ciudad" data={byCiudad} type="horizontal-bar" height={360} />
          <ReportChartPanel title="Distribución" data={byCiudad.slice(0, 6)} type="pie" />
        </div>
      )}

      {report.id === 'por-dia-semana' && (
        <ReportChartPanel title="Ventas por día de la semana" data={byDiaSemana} type="bar" height={340} />
      )}

      {report.id === 'productos-margen' && (
        <>
          <ReportChartPanel
            title="Top productos por ingreso"
            data={topProducts.map((p) => ({ label: p.nombre.slice(0, 24), value: p.ingresoCop }))}
            type="horizontal-bar"
            height={360}
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
          ) : null}
        </>
      )}

      {report.id === 'conversion-trafico' && (
        <>
          <ReportKpiGrid
            items={[
              { label: 'Visitas', value: String(conversionSummary.visits), highlight: true },
              { label: 'Inicios checkout', value: String(conversionSummary.checkoutStarts) },
              { label: 'Compras completadas', value: String(conversionSummary.checkoutCompletes) },
              { label: 'Conversión', value: `${conversionSummary.conversionPct}%` },
              { label: 'Ventas periodo', value: formatCop(summary.ingresoBrutoCop) },
            ]}
          />
          <ReportDualChartPanel title="Tráfico vs facturación" data={visitsVsSales} />
        </>
      )}
    </ReportShell>
  )
}
