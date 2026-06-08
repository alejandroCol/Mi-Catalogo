import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  IconCart,
  IconChartBars,
  IconCube,
  IconHome,
  IconPerson,
} from '@/icons/McIcons'
import { formatCop } from '@/lib/formatCop'
import { VendedorPageHeader } from '@/vendedor/components/VendedorPageHeader'
import { useDemoStores } from '@/vendedor/hooks/useDemoStores'
import { buildDemoAdminMock } from '@/vendedor/demoAdminMockData'

const ESTADO_COLORS: Record<string, string> = {
  Pagado: 'bg-[color-mix(in_srgb,var(--mc-landing-gold)_20%,white)] text-[var(--mc-landing-gold-dark)]',
  'En preparación': 'bg-neutral-100 text-mc-brand-gray',
  'Listo envío': 'bg-neutral-100 text-mc-600',
  Enviado: 'bg-neutral-100 text-mc-600',
  Entregado: 'bg-neutral-100 text-mc-600',
}

export function VendedorDemoAdminPage() {
  const { demoId } = useParams<{ demoId: string }>()
  const { stores, loading } = useDemoStores(true)

  const demo = stores.find((s) => s.id === demoId)
  const mock = useMemo(
    () => buildDemoAdminMock(demo?.displayName ?? 'Tienda demo'),
    [demo?.displayName],
  )

  if (loading) {
    return <p className="text-sm text-mc-500">Cargando…</p>
  }

  if (!demo) {
    return (
      <div className="mc-vendedor-page">
        <p className="text-mc-600">Tienda demo no encontrada.</p>
        <Link to="/vendedor" className="mc-landing-btn-secondary inline-flex w-fit no-underline">
          Volver al panel
        </Link>
      </div>
    )
  }

  const maxBar = Math.max(...mock.weeklyBars)

  return (
    <div className="mc-vendedor-page pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <VendedorPageHeader
          eyebrow="Vista demo"
          title={demo.displayName}
          lead="Así ve el comerciante su panel de administración. Los datos son de ejemplo."
        />
        <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--mc-landing-gold)_35%,white)] bg-[color-mix(in_srgb,var(--mc-landing-gold)_12%,white)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--mc-landing-gold-dark)]">
          Datos ilustrativos
        </span>
      </div>

      <div className="mc-vendedor-panel flex gap-2 overflow-x-auto p-2">
        {[
          { icon: <IconHome size={18} />, label: 'Inicio', active: true },
          { icon: <IconCube size={18} />, label: 'Productos', active: false },
          { icon: <IconCart size={18} />, label: 'Ventas', active: false },
          { icon: <IconPerson size={18} />, label: 'Cuenta', active: false },
        ].map((tab) => (
          <span
            key={tab.label}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium ${
              tab.active
                ? 'bg-mc-brand-gray text-white'
                : 'text-mc-500'
            }`}
          >
            {tab.icon}
            {tab.label}
          </span>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="mc-vendedor-demo-stat mc-vendedor-demo-stat--featured">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-brand-gold">Ventas hoy</p>
          <p className="mt-2 text-xl font-semibold tracking-tighter text-mc-brand-gray sm:text-2xl">
            {mock.formatVentasHoy}
          </p>
        </div>
        {[
          { label: 'Esta semana', value: mock.formatVentasSemana },
          { label: 'Visitas hoy', value: String(mock.stats.visitasHoy) },
          { label: 'Pedidos pendientes', value: String(mock.stats.pedidosPendientes) },
          { label: 'Conversión', value: mock.stats.tasaConversion },
          { label: 'Producto top', value: mock.stats.productoTop, wide: true },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`mc-vendedor-demo-stat ${stat.wide ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">{stat.label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tighter text-mc-brand-gray sm:text-2xl">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="mc-vendedor-panel">
        <div className="flex items-center gap-2">
          <IconChartBars size={18} className="text-mc-brand-gold" />
          <h2 className="text-base font-semibold tracking-tight text-mc-brand-gray">Ventas últimos 7 días</h2>
        </div>
        <div className="mt-6 flex h-36 items-end justify-between gap-2">
          {mock.weeklyBars.map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-lg bg-mc-brand-gray"
                style={{ height: `${(h / maxBar) * 100}%`, minHeight: '8px' }}
              />
              <span className="text-[10px] font-medium text-mc-500">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mc-vendedor-panel">
        <h2 className="text-base font-semibold tracking-tight text-mc-brand-gray">Pedidos recientes</h2>
        <ul className="mt-5 divide-y divide-neutral-100">
          {mock.orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-mc-brand-gray">{order.cliente}</p>
                <p className="mt-0.5 text-xs text-mc-500">
                  {order.id} · {order.hace}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-mc-brand-gray">{formatCop(order.total)}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    ESTADO_COLORS[order.estado] ?? 'bg-neutral-100 text-mc-600'
                  }`}
                >
                  {order.estado}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs leading-relaxed text-mc-500">
        Los números son ilustrativos para la demo presencial. La tienda real del comerciante mostrará sus propios datos.
      </p>
    </div>
  )
}
