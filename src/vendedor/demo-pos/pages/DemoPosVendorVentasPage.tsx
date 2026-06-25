import { formatCop } from '@/lib/formatCop'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'
import { ventasHoyDemo } from '@/vendedor/demo-pos/demoPosMockData'
import { DemoPosVentaCards } from '@/vendedor/demo-pos/components/DemoPosVentaCards'

export function DemoPosVendorVentasPage() {
  const { vendorActivo, sedes, ventas } = useDemoPos()
  const sede = sedes.find((s) => s.id === vendorActivo.sedeId)
  const misVentas = ventasHoyDemo(ventas).filter((v) => v.vendedorUid === vendorActivo.uid)
  const total = misVentas.reduce((s, v) => s + v.totalCop, 0)

  return (
    <div className="mc-pos-page mc-pos-ventas-list-page mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PosPageHeader
        icon="ticket"
        eyebrow="Mis ventas"
        title="Ventas de hoy"
        subtitle={`${vendorActivo.nombre} · ${sede?.nombre ?? 'Sede'} · ${formatCop(total)}`}
      />

      <section className="mc-pos-ventas-list-summary mb-4" aria-label="Resumen">
        <article className="mc-pos-ventas-list-summary__card mc-pos-ventas-list-summary__card--main">
          <p className="mc-pos-ventas-list-summary__label">Total cobrado</p>
          <p className="mc-pos-ventas-list-summary__value">{formatCop(total)}</p>
        </article>
        <article className="mc-pos-ventas-list-summary__card">
          <p className="mc-pos-ventas-list-summary__label">Cobros</p>
          <p className="mc-pos-ventas-list-summary__value">{misVentas.length}</p>
        </article>
      </section>

      <DemoPosVentaCards
        ventas={misVentas}
        emptyTitle="Aún no hay ventas hoy"
        emptyDescription="Cuando cobres el primer producto, aparece acá con método de pago y detalle."
      />
    </div>
  )
}
