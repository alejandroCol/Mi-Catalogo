import { formatCop } from '@/lib/formatCop'
import {
  ordenCatalogoDevolucionEstado,
  ordenCatalogoDevolucionEtiqueta,
} from '@/lib/catalogOrderCancel'
import {
  isOrdenCatalogoCancelada,
  type CatalogCancellationsSummary,
} from '@/lib/reports/profitMetrics'
import type { McOrdenCatalogo } from '@/types/mc'

function devolucionTone(estado: ReturnType<typeof ordenCatalogoDevolucionEstado>): string {
  if (estado === 'devuelto_onepay') return 'text-emerald-800'
  if (estado === 'pendiente_onepay') return 'text-red-800'
  return 'text-[var(--cat-muted)]'
}

export function ReportCancellationsPanel({
  ordenes,
  summary,
  loading,
}: {
  ordenes: (McOrdenCatalogo & { id: string })[]
  summary: CatalogCancellationsSummary
  loading?: boolean
}) {
  const filas = ordenes.filter(isOrdenCatalogoCancelada)

  return (
    <section className="mc-reports-table-wrap mc-reports-fade-in space-y-4">
      <div>
        <h3 className="mc-reports-chart__title">Canceladas y devoluciones</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)]">
          No entran en el ingreso bruto. Acá ves si el dinero se devolvió al cliente.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article>
          <p className="mc-reports-kpi__label">Canceladas</p>
          <p className="mc-reports-kpi__value">{loading ? '…' : summary.canceladas}</p>
        </article>
        <article>
          <p className="mc-reports-kpi__label">Monto cancelado</p>
          <p className="mc-reports-kpi__value">{loading ? '…' : formatCop(summary.montoCanceladoCop)}</p>
        </article>
        <article>
          <p className="mc-reports-kpi__label">Devuelto OnePay</p>
          <p className="mc-reports-kpi__value">{loading ? '…' : formatCop(summary.montoDevueltoCop)}</p>
        </article>
        <article>
          <p className="mc-reports-kpi__label">Pendiente devolver</p>
          <p className="mc-reports-kpi__value">{loading ? '…' : formatCop(summary.montoPendienteCop)}</p>
        </article>
      </div>
      {filas.length === 0 && !loading ? (
        <p className="text-[13px] leading-relaxed text-[var(--cat-muted)]">
          No hay ventas canceladas en este periodo.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="mc-reports-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Devolución</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((o) => {
                const dev = ordenCatalogoDevolucionEstado(o)
                return (
                  <tr key={o.id}>
                    <td className="font-mono text-[12px]">{o.numeroReferencia ?? o.id.slice(0, 8)}</td>
                    <td className="tabular-nums text-[12px] text-[var(--cat-muted)]">
                      {new Date(o.createdAt).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{o.clienteNombre?.trim() || '—'}</td>
                    <td className="tabular-nums">{formatCop(o.totalCop)}</td>
                    <td>Cancelado</td>
                    <td className={devolucionTone(dev)}>{ordenCatalogoDevolucionEtiqueta(dev)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
