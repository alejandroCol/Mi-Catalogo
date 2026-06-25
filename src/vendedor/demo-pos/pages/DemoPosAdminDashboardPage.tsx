import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCop } from '@/lib/formatCop'
import { PosAnimatedNumber } from '@/pos/components/PosAnimatedNumber'
import { PosIcon, PosIconBox } from '@/pos/components/PosIcon'
import { posFechaKeyLocal, posFormatFechaCorta, posFormatHora } from '@/pos/lib/posDate'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'
import { ventasActivasDemo, ventasHoyDemo } from '@/vendedor/demo-pos/demoPosMockData'
import { demoPosAdminPath } from '@/vendedor/demo-pos/demoPosPaths'

const CHART_GOLD = '#c5a367'

function formatCopTooltip(value: unknown) {
  return formatCop(typeof value === 'number' ? value : 0)
}

export function DemoPosAdminDashboardPage() {
  const { demo, tenant, sedes, ventas, vendors, productos } = useDemoPos()
  const ventasActivas = ventasActivasDemo(ventas)
  const ventasHoy = ventasHoyDemo(ventas)
  const totalHoy = ventasHoy.reduce((s, v) => s + v.totalCop, 0)
  const ticketPromedio = ventasHoy.length ? Math.round(totalHoy / ventasHoy.length) : 0

  const porHora = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hora: `${String(h).padStart(2, '0')}:00`,
      total: 0,
    }))
    for (const v of ventasHoy) {
      buckets[new Date(v.createdAt).getHours()]!.total += v.totalCop
    }
    return buckets.filter((b) => b.total > 0)
  }, [ventasHoy])

  const porVendedor = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventasHoy) {
      map.set(v.vendedorNombre, (map.get(v.vendedorNombre) ?? 0) + v.totalCop)
    }
    return [...map.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
  }, [ventasHoy])

  const porDia = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventasActivas) {
      const key = posFechaKeyLocal(new Date(v.createdAt))
      map.set(key, (map.get(key) ?? 0) + v.totalCop)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([fecha, total]) => ({
        fecha: posFormatFechaCorta(new Date(fecha + 'T12:00:00').getTime()),
        total,
      }))
  }, [ventasActivas])

  const ultimas = ventasHoy.slice(0, 5)
  const enCatalogo = productos.filter((p) => p.publicadoEnCatalogo).length

  return (
    <div className="mc-pos-page mc-pos-dashboard mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="mc-pos-dashboard-hero">
        <div className="mc-pos-dashboard-hero__bg" aria-hidden />
        <div className="mc-pos-dashboard-hero__mark" aria-hidden>
          <PosIconBox name="caja" tone="gold" size="lg" />
        </div>
        <div className="mc-pos-dashboard-hero__content">
          <p className="mc-landing-eyebrow">Panel admin POS</p>
          <h1 className="mc-pos-dashboard-hero__title">
            {tenant.nombreTienda}
            <span className="mc-pos-dashboard-hero__accent"> · demo</span>
          </h1>
          <p className="mc-pos-dashboard-hero__subtitle">
            {sedes.length} sedes · {vendors.length} cajeros · {enCatalogo} productos en catálogo
          </p>

          <div className="mc-pos-dashboard-hero__kpis">
            <article className="mc-pos-dashboard-kpi mc-pos-dashboard-kpi--main mc-pos-dashboard-kpi--animated">
              <PosIconBox name="ventas" tone="gold" size="sm" />
              <div>
                <p className="mc-pos-dashboard-kpi__label">Ventas hoy</p>
                <p className="mc-pos-dashboard-kpi__value">
                  <PosAnimatedNumber value={totalHoy} format="cop" />
                </p>
                <p className="mc-pos-dashboard-kpi__meta">
                  <PosAnimatedNumber value={ventasHoy.length} format="integer" /> transacciones
                </p>
              </div>
            </article>
            <article className="mc-pos-dashboard-kpi mc-pos-dashboard-kpi--animated">
              <PosIconBox name="sedes" tone="cream" size="sm" />
              <div>
                <p className="mc-pos-dashboard-kpi__label">Sedes activas</p>
                <p className="mc-pos-dashboard-kpi__value">
                  <PosAnimatedNumber value={sedes.filter((s) => s.activa).length} format="integer" />
                </p>
              </div>
            </article>
            <article className="mc-pos-dashboard-kpi mc-pos-dashboard-kpi--animated">
              <PosIconBox name="vendedores" tone="cream" size="sm" />
              <div>
                <p className="mc-pos-dashboard-kpi__label">Ticket promedio</p>
                <p className="mc-pos-dashboard-kpi__value">
                  <PosAnimatedNumber value={ticketPromedio} format="cop" />
                </p>
              </div>
            </article>
          </div>

          <div className="mc-pos-dashboard-hero__actions">
            <Link
              to={demoPosAdminPath(demo.id, 'ventas')}
              className="mc-landing-btn-primary mc-pos-dashboard-hero__cta no-underline"
            >
              <PosIcon name="ticket" size={18} />
              Ver ventas del día
            </Link>
            <Link
              to={demoPosAdminPath(demo.id, 'reportes')}
              className="mc-landing-btn-secondary text-sm no-underline"
            >
              Abrir reportes
            </Link>
          </div>
        </div>
      </section>

      <section className="mc-pos-dashboard-charts" aria-label="Gráficos">
        <div className="mc-pos-dashboard-charts__grid">
          <article className="mc-pos-chart-card mc-pos-chart-card--enter">
            <h2 className="mc-pos-chart-card__title">Ventas por hora (hoy)</h2>
            <div className="mc-pos-chart-card__body">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={porHora}>
                  <defs>
                    <linearGradient id="demoPosDashGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_GOLD} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={formatCopTooltip} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={CHART_GOLD}
                    fill="url(#demoPosDashGold)"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="mc-pos-chart-card mc-pos-chart-card--enter mc-pos-chart-card--delay">
            <h2 className="mc-pos-chart-card__title">Por cajero (hoy)</h2>
            <div className="mc-pos-chart-card__body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porVendedor} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={formatCopTooltip} />
                  <Bar dataKey="total" fill={CHART_GOLD} radius={[0, 4, 4, 0]} isAnimationActive animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="mc-pos-chart-card mc-pos-chart-card--enter mc-pos-chart-card--wide">
            <h2 className="mc-pos-chart-card__title">Tendencia 7 días</h2>
            <div className="mc-pos-chart-card__body">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={porDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={formatCopTooltip} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3f3d45"
                    fill="#3f3d4518"
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      </section>

      <section className="mc-pos-dashboard-recent" aria-label="Últimas ventas">
        <div className="mc-pos-dashboard-recent__head">
          <h2 className="mc-pos-dashboard-recent__title">Últimas ventas hoy</h2>
          <Link to={demoPosAdminPath(demo.id, 'ventas')} className="mc-pos-dashboard-recent__link no-underline">
            Ver todas →
          </Link>
        </div>
        <ul className="mc-pos-dashboard-recent__list">
          {ultimas.map((v) => (
            <li key={v.id} className="mc-pos-dashboard-recent__item">
              <div>
                <p className="mc-pos-dashboard-recent__item-title">{v.lineas[0]?.nombre ?? 'Venta'}</p>
                <p className="mc-pos-dashboard-recent__item-meta">
                  {posFormatHora(v.createdAt)} · {v.vendedorNombre}
                </p>
              </div>
              <span className="mc-pos-dashboard-recent__item-amount">{formatCop(v.totalCop)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mc-pos-dashboard-quick" aria-label="Accesos rápidos">
        <h2 className="mc-pos-dashboard-quick__title">Módulos del admin</h2>
        <div className="mc-pos-dashboard-quick__grid">
          {[
            { to: demoPosAdminPath(demo.id, 'ventas'), label: 'Ventas', desc: 'Listado por sede y fecha', icon: 'ventas' as const },
            { to: demoPosAdminPath(demo.id, 'reportes'), label: 'Reportes', desc: 'Gráficos y exportación', icon: 'reportes' as const },
            { to: demoPosAdminPath(demo.id, 'inventario'), label: 'Inventario', desc: 'Stock por sede', icon: 'inventario' as const },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="mc-pos-dashboard-quick__tile no-underline">
              <PosIconBox name={item.icon} tone="gold" size="sm" />
              <div>
                <p className="mc-pos-dashboard-quick__tile-label">{item.label}</p>
                <p className="mc-pos-dashboard-quick__tile-desc">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
