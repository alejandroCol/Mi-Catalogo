import { Link } from 'react-router-dom'
import { formatCop } from '@/lib/formatCop'
import { PosAnimatedNumber } from '@/pos/components/PosAnimatedNumber'
import { PosIconBox } from '@/pos/components/PosIcon'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'
import { ventasHoyDemo } from '@/vendedor/demo-pos/demoPosMockData'
import { demoPosVendorPath } from '@/vendedor/demo-pos/demoPosPaths'

export function DemoPosVendorHomePage() {
  const { demo, vendorActivo, sedes, ventas, productos } = useDemoPos()
  const sede = sedes.find((s) => s.id === vendorActivo.sedeId)
  const misVentasHoy = ventasHoyDemo(ventas).filter((v) => v.vendedorUid === vendorActivo.uid)
  const totalHoy = misVentasHoy.reduce((s, v) => s + v.totalCop, 0)
  const destacados = productos.filter((p) => p.publicadoEnCatalogo).slice(0, 4)

  return (
    <div className="mc-pos-page mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PosPageHeader
        icon="ventas"
        eyebrow="Cajera"
        title={`Hola, ${vendorActivo.nombre.split(' ')[0]}`}
        subtitle={`${sede?.nombre ?? 'Sede'} · turno abierto`}
      />

      <section className="mb-6 grid grid-cols-2 gap-3">
        <article className="mc-pos-dashboard-kpi mc-pos-dashboard-kpi--main mc-pos-dashboard-kpi--animated rounded-xl border border-neutral-200/70 bg-white p-4">
          <PosIconBox name="ventas" tone="gold" size="sm" />
          <div className="mt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">Mis ventas hoy</p>
            <p className="text-2xl font-semibold tracking-tight">
              <PosAnimatedNumber value={totalHoy} format="cop" />
            </p>
            <p className="text-sm text-neutral-500">
              <PosAnimatedNumber value={misVentasHoy.length} format="integer" /> cobros
            </p>
          </div>
        </article>
        <article className="rounded-xl border border-neutral-200/70 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">Caja efectivo</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
            {formatCop(
              misVentasHoy
                .filter((v) => v.pagos.some((p) => p.metodo === 'efectivo'))
                .reduce((s, v) => s + v.totalCop, 0),
            )}
          </p>
        </article>
      </section>

      <section className="mb-6 rounded-xl border border-dashed border-[#c5a367]/50 bg-[#fffdf8] p-5">
        <p className="text-sm font-semibold text-neutral-900">Vista demo de cobro</p>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
          En la app real, la cajera escanea o busca productos, elige método de pago y confirma con animación +
          sonido. El stock se sincroniza al catálogo al instante.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {destacados.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm transition hover:border-neutral-300"
            >
              <span className="font-medium text-neutral-900">{p.nombre}</span>
              <span className="text-neutral-600">{formatCop(p.precioCop)}</span>
            </button>
          ))}
        </div>
      </section>

      <p className="text-center text-sm text-neutral-500">
        <Link to={demoPosVendorPath(demo.id, 'ventas')} className="font-medium text-neutral-800 underline">
          Ver mis ventas de hoy →
        </Link>
      </p>
    </div>
  )
}
