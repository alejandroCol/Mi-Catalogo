import * as XLSX from 'xlsx'
import { formatCop } from '@/lib/formatCop'
import type { McPosVenta } from '@/types/mc'

export function exportVentasExcel(ventas: McPosVenta[], filename: string) {
  const rows = ventas.map((v) => ({
    Fecha: new Date(v.createdAt).toLocaleString('es-CO'),
    Vendedor: v.vendedorNombre,
    Sede: v.sedeId,
    Total: v.totalCop,
    Lineas: v.lineas.map((l) => `${l.nombre}×${l.cantidad}`).join('; '),
    Pagos: v.pagos.map((p) => `${p.metodo}:${p.monto}`).join('; '),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
  XLSX.writeFile(wb, filename)
}

export function exportTopArticulosExcel(
  items: { nombre: string; unidades: number; total: number }[],
  filename: string,
) {
  const rows = items.map((a, i) => ({
    Rank: i + 1,
    Artículo: a.nombre,
    Unidades: a.unidades,
    Total: a.total,
    'Total COP': formatCop(a.total),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Top artículos')
  XLSX.writeFile(wb, filename)
}
