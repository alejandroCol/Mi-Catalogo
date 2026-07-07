import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCop } from '@/lib/formatCop'
import { montoTransferenciaVenta } from '@/pos/lib/cajaCalculos'
import { isVentaActiva, ingresoContableCop } from '@/pos/lib/posVentaUtils'
import type { McPosCajaDiaria, McPosVenta } from '@/types/mc'

const GOLD = { r: 197, g: 163, b: 103 }

export type DatosReporteCierreCaja = {
  fechaKey: string
  sedeNombre: string
  vendedorNombre: string
  cierreAt: number
  caja: McPosCajaDiaria
  ventas: McPosVenta[]
  ventasEfectivo: number
}

function fechaLegible(fechaKey: string) {
  const [y, m, d] = fechaKey.split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function descargarReporteCierreCajaPdf(datos: DatosReporteCierreCaja) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ingresos = datos.caja.ingresos ?? []
  const egresos = datos.caja.egresos ?? []
  const totalIngresos = ingresos.reduce((s, e) => s + e.montoCop, 0)
  const totalEgresos = egresos.reduce((s, e) => s + e.montoCop, 0)
  const ventasPdf = datos.ventas.filter(isVentaActiva)
  const ventasTransf = ventasPdf.reduce((s, v) => s + montoTransferenciaVenta(v), 0)
  const totalVentas = ventasPdf.reduce((s, v) => s + ingresoContableCop(v), 0)
  const efectivoEsperado =
    datos.caja.efectivoEsperado ??
    datos.caja.saldoInicialEfectivo + datos.ventasEfectivo + totalIngresos - totalEgresos

  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text('Mi Catálogo POS', 14, 14)
  doc.setFontSize(11)
  doc.text('Cierre de caja', 14, 22)

  doc.setTextColor(40, 40, 40)
  let y = 36
  doc.setFontSize(10)
  doc.text(`Fecha: ${fechaLegible(datos.fechaKey)}`, 14, y)
  y += 6
  doc.text(`Sede: ${datos.sedeNombre}`, 14, y)
  y += 6
  doc.text(`Vendedor: ${datos.vendedorNombre}`, 14, y)
  y += 10

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Monto']],
    body: [
      ['Saldo inicial efectivo', formatCop(datos.caja.saldoInicialEfectivo)],
      ['Ventas efectivo', formatCop(datos.ventasEfectivo)],
      ['Ventas transferencia/Nequi', formatCop(ventasTransf)],
      ['Total ventas', formatCop(totalVentas)],
      ['Ingresos caja', formatCop(totalIngresos)],
      ['Egresos caja', formatCop(totalEgresos)],
      ['Efectivo esperado', formatCop(efectivoEsperado)],
      ['Efectivo contado', formatCop(datos.caja.efectivoContado ?? 0)],
      ['Diferencia', formatCop(datos.caja.diferencia ?? 0)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [GOLD.r, GOLD.g, GOLD.b] },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  autoTable(doc, {
    startY: finalY,
    head: [['Hora', 'Total', 'Pagos']],
    body: datos.ventas.map((v) => [
      new Date(v.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      formatCop(v.totalCop),
      v.estado === 'anulada'
        ? 'Anulada'
        : v.pagos.map((p) => `${p.metodo}: ${formatCop(p.monto)}`).join(', '),
    ]),
    theme: 'striped',
  })

  const slug = datos.vendedorNombre.replace(/\s+/g, '_').slice(0, 20)
  doc.save(`cierre_caja_${datos.fechaKey}_${slug}.pdf`)
}
