import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCop } from '@/lib/formatCop'
import type { ChartPoint } from '@/lib/reports/salesAggregations'

const CHART_COLORS = ['#c5a367', '#3f3d45', '#8b7355', '#d4b896', '#6b6560', '#e8dcc8', '#a89070']

function formatCopTooltip(value: unknown) {
  return formatCop(typeof value === 'number' ? value : 0)
}

type Props = {
  title: string
  subtitle?: string
  data: ChartPoint[]
  type?: 'bar' | 'line' | 'area' | 'pie' | 'horizontal-bar'
  dataKey?: string
  height?: number
  loading?: boolean
  emptyMessage?: string
}

export function ReportChartPanel({
  title,
  subtitle,
  data,
  type = 'bar',
  dataKey = 'value',
  height = 300,
  loading,
  emptyMessage = 'Sin datos en este periodo.',
}: Props) {
  const hasData = data.some((d) => d.value > 0)

  return (
    <article className="mc-reports-chart mc-reports-fade-in">
      <div className="mc-reports-chart__head">
        <h3 className="mc-reports-chart__title">{title}</h3>
        {subtitle ? <p className="mc-reports-chart__subtitle">{subtitle}</p> : null}
      </div>
      {loading ? (
        <p className="mc-reports-chart__empty">Cargando…</p>
      ) : !hasData ? (
        <p className="mc-reports-chart__empty">{emptyMessage}</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {type === 'area' ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="reportGoldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c5a367" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#c5a367" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={formatCopTooltip} />
              <Area type="monotone" dataKey={dataKey} stroke="#c5a367" fill="url(#reportGoldGrad)" strokeWidth={2} />
            </AreaChart>
          ) : type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={formatCopTooltip} />
              <Line type="monotone" dataKey={dataKey} stroke="#3f3d45" strokeWidth={2} dot={{ fill: '#c5a367', r: 3 }} />
            </LineChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey={dataKey} nameKey="label" cx="50%" cy="50%" outerRadius={95} label>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatCopTooltip} />
              <Legend />
            </PieChart>
          ) : type === 'horizontal-bar' ? (
            <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
              <XAxis type="number" tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
              <Tooltip formatter={formatCopTooltip} />
              <Bar dataKey={dataKey} fill="#3f3d45" radius={[0, 6, 6, 0]} />
            </BarChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={formatCopTooltip} />
              <Bar dataKey={dataKey} fill="#c5a367" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </article>
  )
}

type DualProps = {
  title: string
  data: { label: string; visitas: number; ventas: number }[]
  loading?: boolean
}

export function ReportDualChartPanel({ title, data, loading }: DualProps) {
  const hasData = data.some((d) => d.visitas > 0 || d.ventas > 0)
  return (
    <article className="mc-reports-chart mc-reports-fade-in mc-reports-chart--wide">
      <div className="mc-reports-chart__head">
        <h3 className="mc-reports-chart__title">{title}</h3>
      </div>
      {loading ? (
        <p className="mc-reports-chart__empty">Cargando…</p>
      ) : !hasData ? (
        <p className="mc-reports-chart__empty">Sin datos en este periodo.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
            <Tooltip />
            <Legend />
            <Area yAxisId="left" type="monotone" dataKey="visitas" name="Visitas" stroke="#6b6560" fill="#6b656033" />
            <Area yAxisId="right" type="monotone" dataKey="ventas" name="Ventas COP" stroke="#c5a367" fill="#c5a36733" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </article>
  )
}
