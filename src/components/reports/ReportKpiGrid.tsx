import { formatCop } from '@/lib/formatCop'
import type { SalesProfitSummary } from '@/lib/reports/profitMetrics'

type Kpi = {
  label: string
  value: string
  hint?: string
  highlight?: boolean
}

export function buildProfitKpis(summary: SalesProfitSummary, showPasarela = true): Kpi[] {
  const items: Kpi[] = [
    { label: 'Ingreso bruto', value: formatCop(summary.ingresoBrutoCop), highlight: true },
    { label: 'Ganancia bruta', value: formatCop(summary.gananciaBrutaCop) },
    { label: 'Ganancia neta', value: formatCop(summary.gananciaNetaCop), highlight: true },
    { label: 'Transacciones', value: String(summary.transacciones) },
    { label: 'Ticket promedio', value: formatCop(summary.ticketPromedioCop) },
    { label: 'Unidades', value: String(summary.unidades) },
    { label: 'Costo conocido', value: formatCop(summary.costoConocidoCop) },
  ]
  if (showPasarela) {
    items.splice(2, 0, {
      label: 'Comisión pasarela',
      value: formatCop(summary.comisionPasarelaCop),
      hint: 'OnePay por transacción',
    })
  }
  if (summary.margenPct != null) {
    items.push({ label: 'Margen', value: `${summary.margenPct}%` })
  }
  if (summary.lineasSinCosto > 0) {
    items.push({
      label: 'Sin costo registrado',
      value: String(summary.lineasSinCosto),
      hint: 'Líneas sin precio de costo',
    })
  }
  return items
}

type Props = {
  items: Kpi[]
  loading?: boolean
}

export function ReportKpiGrid({ items, loading }: Props) {
  return (
    <section className="mc-reports-kpi-grid">
      {items.map((item, i) => (
        <article
          key={item.label}
          className={`mc-reports-kpi ${item.highlight ? 'mc-reports-kpi--highlight' : ''}`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <p className="mc-reports-kpi__label">{item.label}</p>
          <p className="mc-reports-kpi__value">{loading ? '…' : item.value}</p>
          {item.hint ? <p className="mc-reports-kpi__hint">{item.hint}</p> : null}
        </article>
      ))}
    </section>
  )
}
