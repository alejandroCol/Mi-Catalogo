import { useMemo, useState } from 'react'
import { formatCop } from '@/lib/formatCop'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'
import { ventasActivasDemo, ventasHoyDemo } from '@/vendedor/demo-pos/demoPosMockData'
import { DemoPosVentaCards } from '@/vendedor/demo-pos/components/DemoPosVentaCards'

export function DemoPosAdminVentasPage() {
  const { sedes, ventas } = useDemoPos()
  const [sedeFilter, setSedeFilter] = useState(sedes[0]?.id ?? '')
  const [rango, setRango] = useState<'hoy' | '7d'>('hoy')

  const filtradas = useMemo(() => {
    let list = ventasActivasDemo(ventas)
    if (rango === 'hoy') list = ventasHoyDemo(ventas)
    if (sedeFilter) list = list.filter((v) => v.sedeId === sedeFilter)
    return list
  }, [ventas, sedeFilter, rango])

  const total = filtradas.reduce((s, v) => s + v.totalCop, 0)
  const ticketPromedio = filtradas.length ? Math.round(total / filtradas.length) : 0

  return (
    <div className="mc-pos-page mc-pos-ventas-list-page mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PosPageHeader
        icon="ticket"
        eyebrow="Ventas"
        title="Listado de ventas"
        subtitle={`${rango === 'hoy' ? 'Hoy' : 'Últimos 7 días'} · ${filtradas.length} activas · ${formatCop(total)}`}
      />

      <section className="mc-pos-ventas-list-toolbar">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={rango === 'hoy' ? 'mc-landing-btn-primary text-sm' : 'mc-landing-btn-secondary text-sm'}
            onClick={() => setRango('hoy')}
          >
            Hoy
          </button>
          <button
            type="button"
            className={rango === '7d' ? 'mc-landing-btn-primary text-sm' : 'mc-landing-btn-secondary text-sm'}
            onClick={() => setRango('7d')}
          >
            7 días
          </button>
        </div>
        <label className="mc-pos-field mc-pos-field--inline">
          <span>Sede</span>
          <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)}>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="mc-pos-ventas-list-summary" aria-label="Resumen">
        <article className="mc-pos-ventas-list-summary__card mc-pos-ventas-list-summary__card--main">
          <p className="mc-pos-ventas-list-summary__label">Total vendido</p>
          <p className="mc-pos-ventas-list-summary__value">{formatCop(total)}</p>
        </article>
        <article className="mc-pos-ventas-list-summary__card">
          <p className="mc-pos-ventas-list-summary__label">Transacciones</p>
          <p className="mc-pos-ventas-list-summary__value">{filtradas.length}</p>
        </article>
        <article className="mc-pos-ventas-list-summary__card">
          <p className="mc-pos-ventas-list-summary__label">Ticket promedio</p>
          <p className="mc-pos-ventas-list-summary__value">{formatCop(ticketPromedio)}</p>
        </article>
      </section>

      <DemoPosVentaCards ventas={filtradas} multiDay={rango === '7d'} />
    </div>
  )
}
