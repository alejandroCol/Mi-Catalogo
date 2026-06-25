import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCop } from '@/lib/formatCop'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import { posFechaKeyLocal, posFormatFechaCorta } from '@/pos/lib/posDate'
import { useDemoPos } from '@/vendedor/demo-pos/DemoPosContext'
import { ventasActivasDemo, ventasUltimos7DiasDemo } from '@/vendedor/demo-pos/demoPosMockData'

const CHART_COLORS = ['#c5a367', '#3f3d45', '#8b7355', '#d4b896']

const METODO_LABEL = {
  efectivo: 'Efectivo',
  nequi: 'Nequi',
  transferencia: 'Transferencia',
  credito: 'Crédito',
} as const

function formatCopTooltip(value: unknown) {
  return formatCop(typeof value === 'number' ? value : 0)
}

export function DemoPosAdminReportesPage() {
  const { sedes, ventas } = useDemoPos()
  const [sedeFilter, setSedeFilter] = useState('')
  const ventas7d = ventasUltimos7DiasDemo(ventas).filter((v) => !sedeFilter || v.sedeId === sedeFilter)
  const total = ventas7d.reduce((s, v) => s + v.totalCop, 0)

  const porMetodo = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventas7d) {
      for (const p of v.pagos) {
        const label = METODO_LABEL[p.metodo]
        map.set(label, (map.get(label) ?? 0) + p.monto)
      }
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [ventas7d])

  const porSede = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventas7d) {
      const sede = sedes.find((s) => s.id === v.sedeId)?.nombre ?? v.sedeId
      map.set(sede, (map.get(sede) ?? 0) + v.totalCop)
    }
    return [...map.entries()].map(([nombre, total]) => ({ nombre, total }))
  }, [ventas7d, sedes])

  const porDia = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventas7d) {
      const key = posFechaKeyLocal(new Date(v.createdAt))
      map.set(key, (map.get(key) ?? 0) + v.totalCop)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({
        fecha: posFormatFechaCorta(new Date(fecha + 'T12:00:00').getTime()),
        total,
      }))
  }, [ventas7d])

  const topProductos = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventas7d) {
      for (const l of v.lineas) {
        map.set(l.nombre, (map.get(l.nombre) ?? 0) + l.subtotalCop)
      }
    }
    return [...map.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [ventas7d])

  const ventasActivas = ventasActivasDemo(ventas)

  return (
    <div className="mc-pos-page mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PosPageHeader
        icon="reportes"
        eyebrow="Reportes"
        title="Análisis POS"
        subtitle={`Últimos 7 días · ${ventas7d.length} ventas · ${formatCop(total)}`}
      />

      <section className="mc-pos-ventas-list-toolbar">
        <label className="mc-pos-field mc-pos-field--inline">
          <span>Sede</span>
          <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)}>
            <option value="">Todas</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total 7 días" value={formatCop(total)} />
        <KpiCard label="Transacciones" value={String(ventas7d.length)} />
        <KpiCard label="Ticket prom." value={formatCop(ventas7d.length ? Math.round(total / ventas7d.length) : 0)} />
        <KpiCard label="Histórico demo" value={String(ventasActivas.length)} />
      </div>

      <div className="mc-pos-dashboard-charts__grid">
        <article className="mc-pos-chart-card">
          <h2 className="mc-pos-chart-card__title">Ventas por día</h2>
          <div className="mc-pos-chart-card__body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={porDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} tick={{ fontSize: 11 }} />
                <Tooltip formatter={formatCopTooltip} />
                <Bar dataKey="total" fill="#c5a367" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="mc-pos-chart-card">
          <h2 className="mc-pos-chart-card__title">Método de pago</h2>
          <div className="mc-pos-chart-card__body">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={porMetodo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {porMetodo.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatCopTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="mc-pos-chart-card mc-pos-chart-card--wide">
          <h2 className="mc-pos-chart-card__title">Top artículos</h2>
          <div className="mc-pos-chart-card__body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProductos} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={formatCopTooltip} />
                <Bar dataKey="total" fill="#3f3d45" radius={[0, 4, 4, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="mc-pos-chart-card">
          <h2 className="mc-pos-chart-card__title">Por sede</h2>
          <div className="mc-pos-chart-card__body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porSede}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} tick={{ fontSize: 11 }} />
                <Tooltip formatter={formatCopTooltip} />
                <Bar dataKey="total" fill="#8b7355" radius={[4, 4, 0, 0]} isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-neutral-200/70 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-neutral-900">{value}</p>
    </article>
  )
}
