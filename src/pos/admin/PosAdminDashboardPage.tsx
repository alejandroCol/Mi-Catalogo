import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { PosIcon, PosIconBox } from '@/pos/components/PosIcon'
import { PosAnimatedNumber } from '@/pos/components/PosAnimatedNumber'
import { PosRangoFechasFilter } from '@/pos/components/PosRangoFechasFilter'
import { PosDemoTour } from '@/pos/components/PosDemoTour'
import { usePosRangoFechas } from '@/pos/hooks/usePosRangoFechas'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosVentas } from '@/pos/hooks/usePosVentas'
import { usePosVendors } from '@/pos/hooks/usePosVendors'
import { POS_ADMIN_NAV } from '@/pos/lib/posNavConfig'
import { posFechaKeyLocal, posFormatFechaCorta, posFormatHora } from '@/pos/lib/posDate'
import { ventasActivas, ingresoContableCop, ingresoContableMs } from '@/pos/lib/posVentaUtils'
import { PosExpertSaleModal } from '@/pos/components/PosExpertSaleModal'
import { hasPosExpertAccess } from '@/pos/lib/posExpertGate'

const CHART_GOLD = '#c5a367'

function formatCopTooltip(value: unknown) {
  return formatCop(typeof value === 'number' ? value : 0)
}

const QUICK_LINKS = POS_ADMIN_NAV.filter((n) => n.to !== '/pos/admin')

export function PosAdminDashboardPage() {
  const { tenant, profile } = useMcAuth()
  const nav = useNavigate()
  const tenantId = tenant?.id ?? profile?.tenantId
  const [demoOpen, setDemoOpen] = useState(false)
  const [expertModal, setExpertModal] = useState(false)
  const {
    preset,
    setPreset,
    customDesde,
    setCustomDesde,
    customHasta,
    setCustomHasta,
    start,
    end,
    label,
    hoy,
  } = usePosRangoFechas('hoy')
  const { sedes } = usePosSedes(tenantId)
  const { vendors } = usePosVendors(tenantId)
  const { ventas, loading } = usePosVentas(tenantId, {
    desdeMs: start,
    hastaMs: end,
    cobradasDesdeMs: start,
    cobradasHastaMs: end,
  })

  const ventasActivasList = ventasActivas(ventas)
  const totalVentas = ventasActivasList.reduce((s, v) => s + ingresoContableCop(v), 0)
  const ventasKpiLabel = preset === 'hoy' ? 'Cobrado hoy' : `Cobrado (${label})`
  const firstName = profile?.displayName?.split(' ')[0] ?? 'admin'
  const sedesActivas = sedes.filter((s) => s.activa).length
  const vendedoresActivos = vendors.filter((v) => v.active !== false).length
  const ticketPromedio = ventasActivasList.length ? Math.round(totalVentas / ventasActivasList.length) : 0

  const porHora = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hora: `${String(h).padStart(2, '0')}:00`,
      total: 0,
    }))
    for (const v of ventasActivasList) {
      const ms = ingresoContableMs(v)
      if (ms == null) continue
      const h = new Date(ms).getHours()
      buckets[h]!.total += ingresoContableCop(v)
    }
    return buckets.filter((b) => b.total > 0 || preset === 'hoy')
  }, [ventasActivasList, preset])

  const porDia = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventasActivasList) {
      const ms = ingresoContableMs(v)
      if (ms == null) continue
      const key = posFechaKeyLocal(new Date(ms))
      map.set(key, (map.get(key) ?? 0) + ingresoContableCop(v))
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({
        fecha: posFormatFechaCorta(new Date(fecha + 'T12:00:00').getTime()),
        total,
      }))
  }, [ventasActivasList])

  const porVendedor = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventasActivasList) {
      const ingreso = ingresoContableCop(v)
      if (ingreso <= 0) continue
      map.set(v.vendedorNombre, (map.get(v.vendedorNombre) ?? 0) + ingreso)
    }
    return [...map.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [ventasActivasList])

  const ultimasVentas = ventasActivasList.slice(0, 5)

  function irACobrar() {
    if (!hasPosExpertAccess(tenant)) {
      setExpertModal(true)
      return
    }
    nav('/pos/ventas')
  }

  return (
    <div className="mc-pos-page mc-pos-dashboard">
      {demoOpen && <PosDemoTour catalogSlug={tenant?.slug ?? null} onClose={() => setDemoOpen(false)} />}

      <section className="mc-pos-dashboard-hero">
        <div className="mc-pos-dashboard-hero__bg" aria-hidden />
        <div className="mc-pos-dashboard-hero__mark" aria-hidden>
          <PosIconBox name="caja" tone="gold" size="lg" />
        </div>
        <div className="mc-pos-dashboard-hero__content">
          <p className="mc-landing-eyebrow">Panel admin</p>
          <h1 className="mc-pos-dashboard-hero__title">
            Hola, {firstName}
            <span className="mc-pos-dashboard-hero__accent"> · POS</span>
          </h1>
          <p className="mc-pos-dashboard-hero__subtitle">
            {tenant?.nombreTienda ? `Gestión de ${tenant.nombreTienda}` : 'Tu punto de venta'}
          </p>

          <PosRangoFechasFilter
            preset={preset}
            onPresetChange={setPreset}
            customDesde={customDesde}
            customHasta={customHasta}
            onCustomDesdeChange={setCustomDesde}
            onCustomHastaChange={setCustomHasta}
            hoy={hoy}
            className="mc-pos-dashboard-filters"
          />

          <div className="mc-pos-dashboard-hero__kpis">
            <article className="mc-pos-dashboard-kpi mc-pos-dashboard-kpi--main mc-pos-dashboard-kpi--animated">
              <PosIconBox name="ventas" tone="gold" size="sm" />
              <div>
                <p className="mc-pos-dashboard-kpi__label">{ventasKpiLabel}</p>
                <p className="mc-pos-dashboard-kpi__value">
                  {loading ? '…' : <PosAnimatedNumber value={totalVentas} format="cop" />}
                </p>
                <p className="mc-pos-dashboard-kpi__meta">
                  <PosAnimatedNumber value={ventasActivasList.length} format="integer" /> transacciones
                </p>
              </div>
            </article>
            <article className="mc-pos-dashboard-kpi mc-pos-dashboard-kpi--animated">
              <PosIconBox name="sedes" tone="cream" size="sm" />
              <div>
                <p className="mc-pos-dashboard-kpi__label">Sedes activas</p>
                <p className="mc-pos-dashboard-kpi__value">
                  <PosAnimatedNumber value={sedesActivas} format="integer" />
                </p>
              </div>
            </article>
            <article className="mc-pos-dashboard-kpi mc-pos-dashboard-kpi--animated">
              <PosIconBox name="vendedores" tone="cream" size="sm" />
              <div>
                <p className="mc-pos-dashboard-kpi__label">Ticket promedio</p>
                <p className="mc-pos-dashboard-kpi__value">
                  {loading ? '…' : <PosAnimatedNumber value={ticketPromedio} format="cop" />}
                </p>
                <p className="mc-pos-dashboard-kpi__meta">{vendedoresActivos} cajeros</p>
              </div>
            </article>
          </div>

          <div className="mc-pos-dashboard-hero__actions">
            <button
              type="button"
              className="mc-landing-btn-primary mc-pos-dashboard-hero__cta"
              onClick={irACobrar}
            >
              <PosIcon name="ventas" size={18} />
              Cobrar venta
            </button>
            <button type="button" className="mc-landing-btn-secondary text-sm" onClick={() => setDemoOpen(true)}>
              Ver demo 90 seg
            </button>
          </div>
        </div>
      </section>

      <section className="mc-pos-dashboard-charts" aria-label="Gráficos">
        <div className="mc-pos-dashboard-charts__grid">
          <article className="mc-pos-chart-card mc-pos-chart-card--enter">
            <h2 className="mc-pos-chart-card__title">Ventas por hora</h2>
            <div className="mc-pos-chart-card__body">
              {loading ? (
                <p className="mc-pos-muted">Cargando…</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={porHora}>
                    <defs>
                      <linearGradient id="posDashGold" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#posDashGold)"
                      strokeWidth={2}
                      isAnimationActive
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          <article className="mc-pos-chart-card mc-pos-chart-card--enter mc-pos-chart-card--delay">
            <h2 className="mc-pos-chart-card__title">Por vendedor</h2>
            <div className="mc-pos-chart-card__body">
              {loading || porVendedor.length === 0 ? (
                <p className="mc-pos-muted">{loading ? 'Cargando…' : 'Sin ventas en el período.'}</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porVendedor} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nombre" width={72} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={formatCopTooltip} />
                    <Bar dataKey="total" fill={CHART_GOLD} radius={[0, 6, 6, 0]} isAnimationActive animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>

          {porDia.length > 1 && (
            <article className="mc-pos-chart-card mc-pos-chart-card--wide mc-pos-chart-card--enter mc-pos-chart-card--delay2">
              <h2 className="mc-pos-chart-card__title">Tendencia del período</h2>
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
                      stroke={CHART_GOLD}
                      fill="url(#posDashGold)"
                      strokeWidth={2}
                      isAnimationActive
                      animationDuration={1100}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="mc-pos-dashboard-bottom">
        <div className="mc-pos-dashboard-recent">
          <h2 className="mc-pos-dashboard-section-title">
            <PosIcon name="ticket" size={16} />
            Últimas ventas
          </h2>
          <ul className="mc-pos-dashboard-recent__list">
            {ultimasVentas.map((v) => (
              <li key={v.id} className="mc-pos-dashboard-recent__item">
                <span className="mc-pos-dashboard-recent__amount">{formatCop(v.totalCop)}</span>
                <span className="mc-pos-dashboard-recent__meta">
                  {posFormatHora(v.createdAt)} · {v.vendedorNombre}
                </span>
              </li>
            ))}
            {!loading && ultimasVentas.length === 0 && (
              <li className="mc-pos-muted text-sm">Sin ventas en el período.</li>
            )}
          </ul>
          <Link to="/pos/admin/ventas" className="mc-pos-dashboard-recent__link no-underline">
            Ver listado completo →
          </Link>        </div>

        <nav className="mc-pos-dashboard-quick" aria-label="Accesos rápidos">
          <h2 className="mc-pos-dashboard-section-title">
            <PosIcon name="home" size={16} />
            Accesos rápidos
          </h2>
          <div className="mc-pos-dashboard-quick__grid">
            {QUICK_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="mc-pos-dashboard-quick__link no-underline">
                <PosIcon name={item.icon} size={16} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </section>

      <PosExpertSaleModal variant="sale" open={expertModal} onClose={() => setExpertModal(false)} />
    </div>
  )
}
