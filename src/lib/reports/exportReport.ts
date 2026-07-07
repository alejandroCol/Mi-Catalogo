import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatCop } from '@/lib/formatCop'
import { reportFormatRangeLabel } from '@/lib/reports/reportDateRange'
import type { SalesProfitSummary } from '@/lib/reports/profitMetrics'
import type { ChartPoint } from '@/lib/reports/salesAggregations'

const GOLD = { r: 197, g: 163, b: 103 }

export function exportChartPointsExcel(
  rows: ChartPoint[],
  columns: { key: keyof ChartPoint | 'value'; header: string }[],
  sheetName: string,
  filename: string,
) {
  const data = rows.map((row) => {
    const out: Record<string, string | number> = {}
    for (const col of columns) {
      const val = col.key === 'value' ? row.value : row[col.key as keyof ChartPoint]
      out[col.header] = val ?? ''
    }
    return out
  })
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, filename)
}

export function exportProfitSummaryExcel(
  title: string,
  rangeLabel: string,
  summary: SalesProfitSummary,
  filename: string,
) {
  const rows = [
    { Métrica: 'Periodo', Valor: rangeLabel },
    { Métrica: 'Transacciones', Valor: summary.transacciones },
    { Métrica: 'Unidades vendidas', Valor: summary.unidades },
    { Métrica: 'Ingreso bruto', Valor: summary.ingresoBrutoCop },
    { Métrica: 'Ingreso productos', Valor: summary.ingresoProductosCop },
    { Métrica: 'Envío', Valor: summary.envioCop },
    { Métrica: 'Costo conocido', Valor: summary.costoConocidoCop },
    { Métrica: 'Ganancia bruta', Valor: summary.gananciaBrutaCop },
    { Métrica: 'Comisión pasarela', Valor: summary.comisionPasarelaCop },
    { Métrica: 'Ganancia neta', Valor: summary.gananciaNetaCop },
    { Métrica: 'Ticket promedio', Valor: summary.ticketPromedioCop },
    { Métrica: 'Margen %', Valor: summary.margenPct ?? 'N/D' },
    { Métrica: 'Líneas sin costo', Valor: summary.lineasSinCosto },
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  XLSX.writeFile(wb, filename)
}

export function exportProfitSummaryPdf(opts: {
  channelLabel: string
  reportTitle: string
  rangeDesde: string
  rangeHasta: string
  summary: SalesProfitSummary
  tables?: { title: string; rows: ChartPoint[] }[]
  filename: string
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const rangeLabel = reportFormatRangeLabel(opts.rangeDesde, opts.rangeHasta)

  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('Mi Catálogo', 14, 12)
  doc.setFontSize(11)
  doc.text(`${opts.channelLabel} · ${opts.reportTitle}`, 14, 20)

  doc.setTextColor(40, 40, 40)
  doc.setFontSize(10)
  doc.text(`Periodo: ${rangeLabel}`, 14, 36)

  const s = opts.summary
  autoTable(doc, {
    startY: 42,
    head: [['Concepto', 'Valor']],
    body: [
      ['Transacciones', String(s.transacciones)],
      ['Ingreso bruto', formatCop(s.ingresoBrutoCop)],
      ['Costo conocido', formatCop(s.costoConocidoCop)],
      ['Ganancia bruta', formatCop(s.gananciaBrutaCop)],
      ['Comisión pasarela', formatCop(s.comisionPasarelaCop)],
      ['Ganancia neta', formatCop(s.gananciaNetaCop)],
      ['Ticket promedio', formatCop(s.ticketPromedioCop)],
      ['Margen', s.margenPct != null ? `${s.margenPct}%` : 'Sin costos registrados'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [GOLD.r, GOLD.g, GOLD.b] },
  })

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  for (const table of opts.tables ?? []) {
    if (table.rows.length === 0) continue
    doc.setFontSize(11)
    doc.text(table.title, 14, y)
    y += 4
    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Monto']],
      body: table.rows.slice(0, 15).map((r) => [r.label, formatCop(r.value)]),
      theme: 'striped',
      headStyles: { fillColor: [63, 61, 69] },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    if (y > 250) {
      doc.addPage()
      y = 20
    }
  }

  doc.save(opts.filename)
}
