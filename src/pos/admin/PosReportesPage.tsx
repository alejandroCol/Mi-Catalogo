import { useMemo, useState } from 'react'
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
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { usePosSedes } from '@/pos/hooks/usePosSedes'
import { usePosVentas } from '@/pos/hooks/usePosVentas'
import { usePosVendors } from '@/pos/hooks/usePosVendors'
import { usePosTurnos } from '@/pos/hooks/usePosTurnos'
import { PosPageHeader } from '@/pos/components/PosPageHeader'
import {
  posFechaKeyLocal,
  posFormatDuracion,
  posFormatFechaCorta,
  posFormatHora,
  posFormatRangoLabel,
  posRangoFechas,
  posTurnoDuracionMs,
  comparativoPresetToRanges,
  defaultComparativoRanges,
  type ComparativoPreset,
} from '@/pos/lib/posDate'
import { exportTopArticulosExcel, exportVentasExcel } from '@/pos/lib/exportReportes'
import { ventasActivas } from '@/pos/lib/posVentaUtils'

const CHART_COLORS = ['#c5a367', '#3f3d45', '#8b7355', '#d4b896', '#6b6560', '#e8dcc8']

function formatCopTooltip(value: unknown) {
  return formatCop(typeof value === 'number' ? value : 0)
}

type RangoPreset = 'hoy' | '7d' | '30d' | 'mes' | 'personalizado'

function presetToRange(preset: RangoPreset): { desde: string; hasta: string } {
  const hoy = posFechaKeyLocal()
  if (preset === 'hoy') return { desde: hoy, hasta: hoy }
  const d = new Date()
  if (preset === '7d') {
    d.setDate(d.getDate() - 6)
    return { desde: posFechaKeyLocal(d), hasta: hoy }
  }
  if (preset === '30d') {
    d.setDate(d.getDate() - 29)
    return { desde: posFechaKeyLocal(d), hasta: hoy }
  }
  if (preset === 'mes') {
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    return { desde: posFechaKeyLocal(first), hasta: hoy }
  }
  return { desde: hoy, hasta: hoy }
}

export function PosReportesPage() {
  const { tenant, profile } = useMcAuth()
  const tenantId = tenant?.id ?? profile?.tenantId
  const { sedes } = usePosSedes(tenantId)
  const { vendors } = usePosVendors(tenantId)

  const [preset, setPreset] = useState<RangoPreset>('7d')
  const [sedeFilter, setSedeFilter] = useState('')
  const [tab, setTab] = useState<
    'general' | 'vendedores' | 'articulos' | 'horas' | 'comparativo' | 'turnos'
  >('general')
  const [vendedorFilter, setVendedorFilter] = useState('')
  const [compRanges, setCompRanges] = useState(defaultComparativoRanges)
  const [compPreset, setCompPreset] = useState<ComparativoPreset | 'personalizado'>('7d')

  const range = presetToRange(preset)
  const { start, end } = posRangoFechas(range.desde, range.hasta)
  const { ventas, loading } = usePosVentas(tenantId, {
    sedeId: sedeFilter || undefined,
    desdeMs: start,
    hastaMs: end,
    enabled: tab !== 'comparativo' && tab !== 'turnos',
  })

  const { turnos, loading: loadingTurnos } = usePosTurnos(tenantId, {
    sedeId: sedeFilter || undefined,
    desdeMs: start,
    hastaMs: end,
    enabled: tab === 'turnos',
  })

  const compRangeA = posRangoFechas(compRanges.desdeA, compRanges.hastaA)
  const compRangeB = posRangoFechas(compRanges.desdeB, compRanges.hastaB)
  const { ventas: ventasCompA, loading: loadingCompA } = usePosVentas(tenantId, {
    sedeId: sedeFilter || undefined,
    desdeMs: compRangeA.start,
    hastaMs: compRangeA.end,
    enabled: tab === 'comparativo',
  })
  const { ventas: ventasCompB, loading: loadingCompB } = usePosVentas(tenantId, {
    sedeId: sedeFilter || undefined,
    desdeMs: compRangeB.start,
    hastaMs: compRangeB.end,
    enabled: tab === 'comparativo',
  })

  const ventasActivasList = useMemo(() => ventasActivas(ventas), [ventas])
  const ventasCompAActivas = useMemo(() => ventasActivas(ventasCompA), [ventasCompA])
  const ventasCompBActivas = useMemo(() => ventasActivas(ventasCompB), [ventasCompB])

  const totalVentas = ventasActivasList.reduce((s, v) => s + v.totalCop, 0)
  const ticketPromedio = ventasActivasList.length ? Math.round(totalVentas / ventasActivasList.length) : 0

  const porDia = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventasActivasList) {
      const key = posFechaKeyLocal(new Date(v.createdAt))
      map.set(key, (map.get(key) ?? 0) + v.totalCop)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({
        fecha: posFormatFechaCorta(new Date(fecha + 'T12:00:00').getTime()),
        total,
      }))
  }, [ventasActivasList])

  const porHora = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, '0')}:00`, total: 0 }))
    for (const v of ventasActivasList) {
      const h = new Date(v.createdAt).getHours()
      buckets[h]!.total += v.totalCop
    }
    return buckets
  }, [ventasActivasList])

  const porVendedor = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventasActivasList) {
      map.set(v.vendedorNombre, (map.get(v.vendedorNombre) ?? 0) + v.totalCop)
    }
    return [...map.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
  }, [ventasActivasList])

  const porArticulo = useMemo(() => {
    const map = new Map<string, { nombre: string; unidades: number; total: number }>()
    for (const v of ventasActivasList) {
      for (const l of v.lineas) {
        const cur = map.get(l.productoId) ?? { nombre: l.nombre, unidades: 0, total: 0 }
        cur.unidades += l.cantidad
        cur.total += l.subtotalCop
        map.set(l.productoId, cur)
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 15)
  }, [ventasActivasList])

  const porSede = useMemo(() => {
    const map = new Map<string, number>()
    for (const v of ventasActivasList) {
      const sede = sedes.find((s) => s.id === v.sedeId)
      const label = sede?.nombre ?? v.sedeId
      map.set(label, (map.get(label) ?? 0) + v.totalCop)
    }
    return [...map.entries()].map(([nombre, value]) => ({ nombre, value }))
  }, [ventasActivasList, sedes])

  const comparativoPeriodos = useMemo(() => {
    const totalA = ventasCompAActivas.reduce((s, v) => s + v.totalCop, 0)
    const totalB = ventasCompBActivas.reduce((s, v) => s + v.totalCop, 0)
    const labelA = posFormatRangoLabel(compRanges.desdeA, compRanges.hastaA)
    const labelB = posFormatRangoLabel(compRanges.desdeB, compRanges.hastaB)
    const delta = totalB - totalA
    const deltaPct = totalA > 0 ? Math.round((delta / totalA) * 100) : totalB > 0 ? 100 : 0
    return {
      totalA,
      totalB,
      txA: ventasCompAActivas.length,
      txB: ventasCompBActivas.length,
      labelA,
      labelB,
      delta,
      deltaPct,
      chart: [
        { periodo: labelA, total: totalA, transacciones: ventasCompAActivas.length },
        { periodo: labelB, total: totalB, transacciones: ventasCompBActivas.length },
      ],
    }
  }, [ventasCompAActivas, ventasCompBActivas, compRanges])

  function aplicarCompPreset(preset: ComparativoPreset) {
    setCompPreset(preset)
    setCompRanges(comparativoPresetToRanges(preset))
  }

  function patchCompRange(key: keyof typeof compRanges, value: string) {
    setCompPreset('personalizado')
    setCompRanges((prev) => ({ ...prev, [key]: value }))
  }

  const vendorNameByUid = useMemo(
    () => new Map(vendors.map((v) => [v.uid, v.displayName])),
    [vendors],
  )

  const turnosFiltrados = useMemo(() => {
    if (!vendedorFilter) return turnos
    return turnos.filter((t) => t.vendedorUid === vendedorFilter)
  }, [turnos, vendedorFilter])

  const turnosReporte = useMemo(() => {
    const rows = turnosFiltrados.map((t) => {
      const duracionMs = posTurnoDuracionMs(t)
      return {
        id: t.id,
        vendedorNombre: vendorNameByUid.get(t.vendedorUid) ?? 'Vendedor',
        sedeNombre: sedes.find((s) => s.id === t.sedeId)?.nombre ?? t.sedeId,
        inicioAt: t.inicioAt,
        finAt: t.finAt,
        estado: t.estado,
        inicioLabel: `${posFormatFechaCorta(t.inicioAt)} · ${posFormatHora(t.inicioAt)}`,
        finLabel: t.finAt
          ? `${posFormatFechaCorta(t.finAt)} · ${posFormatHora(t.finAt)}`
          : t.estado === 'abierto'
            ? 'En curso'
            : '—',
        duracionMs,
        duracionLabel: posFormatDuracion(duracionMs),
      }
    })

    const totalMs = rows.reduce((s, r) => s + r.duracionMs, 0)
    const abiertos = rows.filter((r) => r.estado === 'abierto').length
    const promedioMs = rows.length ? Math.round(totalMs / rows.length) : 0

    const porVendedorMap = new Map<string, { nombre: string; horas: number; turnos: number }>()
    for (const r of rows) {
      const cur = porVendedorMap.get(r.vendedorNombre) ?? {
        nombre: r.vendedorNombre,
        horas: 0,
        turnos: 0,
      }
      cur.horas += r.duracionMs / 3600000
      cur.turnos += 1
      porVendedorMap.set(r.vendedorNombre, cur)
    }
    const porVendedorHoras = [...porVendedorMap.values()]
      .map((v) => ({ nombre: v.nombre, horas: Math.round(v.horas * 10) / 10, turnos: v.turnos }))
      .sort((a, b) => b.horas - a.horas)

    return { rows, totalMs, abiertos, promedioMs, porVendedorHoras }
  }, [turnosFiltrados, vendorNameByUid, sedes])

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'vendedores' as const, label: 'Por vendedor' },
    { id: 'articulos' as const, label: 'Top artículos' },
    { id: 'horas' as const, label: 'Por hora' },
    { id: 'turnos' as const, label: 'Horarios' },
    { id: 'comparativo' as const, label: 'Comparativo' },
  ]

  return (
    <div className="mc-pos-page mc-pos-reportes">
      <PosPageHeader
        icon="reportes"
        eyebrow="Análisis"
        title="Reportes POS"
        subtitle="Ventas, tendencias y rendimiento por sede y vendedor."
      />

      <div className="mc-pos-reportes-filters">
        <div className="mc-pos-reportes-presets">
          {(
            [
              ['hoy', 'Hoy'],
              ['7d', '7 días'],
              ['30d', '30 días'],
              ['mes', 'Este mes'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`mc-pos-payment-pill ${preset === id ? 'mc-pos-payment-pill--active' : ''}`}
              onClick={() => setPreset(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mc-pos-field mc-pos-field--inline">
          <span>Sede</span>
          <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)}>
            <option value="">Todas</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        {tab === 'turnos' && (
          <label className="mc-pos-field mc-pos-field--inline">
            <span>Vendedor</span>
            <select value={vendedorFilter} onChange={(e) => setVendedorFilter(e.target.value)}>
              <option value="">Todos</option>
              {vendors.map((v) => (
                <option key={v.uid} value={v.uid}>
                  {v.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mc-pos-reportes-export">
          <button
            type="button"
            className="mc-landing-btn-secondary text-sm"
            disabled={loading || ventas.length === 0}
            onClick={() => exportVentasExcel(ventas, `ventas_pos_${range.desde}_${range.hasta}.xlsx`)}
          >
            Exportar ventas Excel
          </button>
          <button
            type="button"
            className="mc-landing-btn-secondary text-sm"
            disabled={loading || porArticulo.length === 0}
            onClick={() =>
              exportTopArticulosExcel(porArticulo, `top_articulos_pos_${range.desde}_${range.hasta}.xlsx`)
            }
          >
            Exportar top artículos
          </button>
        </div>
      </div>

      {tab !== 'comparativo' && tab !== 'turnos' && (
      <section className="mc-pos-kpi-grid">
        <article className="mc-pos-kpi-card mc-pos-kpi-card--highlight">
          <p className="mc-pos-kpi-card__label">Total ventas</p>
          <p className="mc-pos-kpi-card__value">{loading ? '…' : formatCop(totalVentas)}</p>
        </article>
        <article className="mc-pos-kpi-card">
          <p className="mc-pos-kpi-card__label">Transacciones</p>
          <p className="mc-pos-kpi-card__value">{ventas.length}</p>
        </article>
        <article className="mc-pos-kpi-card">
          <p className="mc-pos-kpi-card__label">Ticket promedio</p>
          <p className="mc-pos-kpi-card__value">{formatCop(ticketPromedio)}</p>
        </article>
        <article className="mc-pos-kpi-card">
          <p className="mc-pos-kpi-card__label">Vendedores activos</p>
          <p className="mc-pos-kpi-card__value">{vendors.filter((v) => v.active !== false).length}</p>
        </article>
      </section>
      )}

      <nav className="mc-pos-reportes-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mc-pos-nav__pill ${tab === t.id ? 'mc-pos-nav__pill--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'general' && (
        <div className="mc-pos-charts-grid">
          <article className="mc-pos-chart-card mc-pos-chart-card--wide">
            <h3 className="mc-pos-chart-card__title">Ventas por día</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={porDia}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c5a367" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#c5a367" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={formatCopTooltip} />
                <Area type="monotone" dataKey="total" stroke="#c5a367" fill="url(#goldGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </article>
          {porSede.length > 0 && (
            <article className="mc-pos-chart-card">
              <h3 className="mc-pos-chart-card__title">Por sede</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={porSede} dataKey="value" nameKey="nombre" cx="50%" cy="50%" outerRadius={90} label>
                    {porSede.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={formatCopTooltip} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </article>
          )}
        </div>
      )}

      {tab === 'vendedores' && (
        <article className="mc-pos-chart-card">
          <h3 className="mc-pos-chart-card__title">Ventas por vendedor</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={porVendedor} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={formatCopTooltip} />
              <Bar dataKey="total" fill="#3f3d45" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      )}

      {tab === 'articulos' && (
        <article className="mc-pos-chart-card">
          <h3 className="mc-pos-chart-card__title">Top 15 artículos</h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={porArticulo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
              <XAxis dataKey="nombre" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={80} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={formatCopTooltip} />
              <Bar dataKey="total" fill="#c5a367" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mc-pos-top-list">
            {porArticulo.slice(0, 5).map((a, i) => (
              <div key={a.nombre} className="mc-pos-top-list__row">
                <span className="mc-pos-top-list__rank">{i + 1}</span>
                <span className="mc-pos-top-list__name">{a.nombre}</span>
                <span className="mc-pos-top-list__meta">{a.unidades} uds</span>
                <span className="mc-pos-top-list__total">{formatCop(a.total)}</span>
              </div>
            ))}
          </div>
        </article>
      )}

      {tab === 'horas' && (
        <article className="mc-pos-chart-card">
          <h3 className="mc-pos-chart-card__title">Ventas por hora del día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={porHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
              <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={formatCopTooltip} />
              <Line type="monotone" dataKey="total" stroke="#3f3d45" strokeWidth={2} dot={{ fill: '#c5a367' }} />
            </LineChart>
          </ResponsiveContainer>
        </article>
      )}

      {tab === 'turnos' && (
        <>
          <section className="mc-pos-kpi-grid mc-pos-kpi-grid--comparativo">
            <article className="mc-pos-kpi-card mc-pos-kpi-card--highlight">
              <p className="mc-pos-kpi-card__label">Turnos registrados</p>
              <p className="mc-pos-kpi-card__value">{loadingTurnos ? '…' : turnosReporte.rows.length}</p>
              <p className="mc-pos-kpi-card__meta">{posFormatRangoLabel(range.desde, range.hasta)}</p>
            </article>
            <article className="mc-pos-kpi-card">
              <p className="mc-pos-kpi-card__label">Horas trabajadas</p>
              <p className="mc-pos-kpi-card__value">
                {loadingTurnos ? '…' : posFormatDuracion(turnosReporte.totalMs)}
              </p>
              <p className="mc-pos-kpi-card__meta">Suma de todos los turnos</p>
            </article>
            <article className="mc-pos-kpi-card">
              <p className="mc-pos-kpi-card__label">Promedio por turno</p>
              <p className="mc-pos-kpi-card__value">
                {loadingTurnos ? '…' : posFormatDuracion(turnosReporte.promedioMs)}
              </p>
              <p className="mc-pos-kpi-card__meta">
                {turnosReporte.abiertos > 0 ? `${turnosReporte.abiertos} en curso` : 'Sin turnos abiertos'}
              </p>
            </article>
          </section>

          {turnosReporte.porVendedorHoras.length > 0 && (
            <article className="mc-pos-chart-card">
              <h3 className="mc-pos-chart-card__title">Horas por vendedor</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={turnosReporte.porVendedorHoras} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
                  <XAxis type="number" tickFormatter={(v) => `${v}h`} />
                  <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} h`, 'Horas']} />
                  <Bar dataKey="horas" fill="#c5a367" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>
          )}

          <article className="mc-pos-chart-card">
            <h3 className="mc-pos-chart-card__title">Detalle de turnos</h3>
            {loadingTurnos && <p className="mc-pos-muted">Cargando turnos…</p>}
            {!loadingTurnos && turnosReporte.rows.length === 0 && (
              <p className="mc-pos-muted">No hay turnos en este período.</p>
            )}
            {!loadingTurnos && turnosReporte.rows.length > 0 && (
              <div className="mc-pos-turnos-table">
                <div className="mc-pos-turnos-table__head">
                  <span>Vendedor</span>
                  <span>Sede</span>
                  <span>Inicio</span>
                  <span>Cierre</span>
                  <span>Duración</span>
                  <span>Estado</span>
                </div>
                {turnosReporte.rows.map((t) => (
                  <div key={t.id} className="mc-pos-turnos-table__row">
                    <span className="mc-pos-turnos-table__name">{t.vendedorNombre}</span>
                    <span>{t.sedeNombre}</span>
                    <span>{t.inicioLabel}</span>
                    <span>{t.finLabel}</span>
                    <span className="mc-pos-turnos-table__duracion">{t.duracionLabel}</span>
                    <span>
                      <span
                        className={`mc-pos-badge ${
                          t.estado === 'abierto' ? 'mc-pos-badge--ok' : 'mc-pos-badge--off'
                        }`}
                      >
                        {t.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </>
      )}

      {tab === 'comparativo' && (
        <>
          <div className="mc-pos-comparativo-filters">
            <div className="mc-pos-comparativo-presets">
              {(
                [
                  ['7d', '7 días vs anterior'],
                  ['30d', '30 días vs anterior'],
                  ['mes', 'Este mes vs anterior'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`mc-pos-payment-pill ${compPreset === id ? 'mc-pos-payment-pill--active' : ''}`}
                  onClick={() => aplicarCompPreset(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mc-pos-comparativo-rangos">
              <fieldset className="mc-pos-comparativo-rango">
                <legend>Período A</legend>
                <label className="mc-pos-field mc-pos-field--inline">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={compRanges.desdeA}
                    max={compRanges.hastaA}
                    onChange={(e) => patchCompRange('desdeA', e.target.value)}
                  />
                </label>
                <label className="mc-pos-field mc-pos-field--inline">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={compRanges.hastaA}
                    min={compRanges.desdeA}
                    max={posFechaKeyLocal()}
                    onChange={(e) => patchCompRange('hastaA', e.target.value)}
                  />
                </label>
              </fieldset>
              <fieldset className="mc-pos-comparativo-rango">
                <legend>Período B</legend>
                <label className="mc-pos-field mc-pos-field--inline">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={compRanges.desdeB}
                    max={compRanges.hastaB}
                    onChange={(e) => patchCompRange('desdeB', e.target.value)}
                  />
                </label>
                <label className="mc-pos-field mc-pos-field--inline">
                  <span>Hasta</span>
                  <input
                    type="date"
                    value={compRanges.hastaB}
                    min={compRanges.desdeB}
                    max={posFechaKeyLocal()}
                    onChange={(e) => patchCompRange('hastaB', e.target.value)}
                  />
                </label>
              </fieldset>
            </div>
          </div>

          <section className="mc-pos-kpi-grid mc-pos-kpi-grid--comparativo">
            <article className="mc-pos-kpi-card">
              <p className="mc-pos-kpi-card__label">Período A</p>
              <p className="mc-pos-kpi-card__value">
                {loadingCompA ? '…' : formatCop(comparativoPeriodos.totalA)}
              </p>
              <p className="mc-pos-kpi-card__meta">{comparativoPeriodos.txA} transacciones</p>
            </article>
            <article className="mc-pos-kpi-card mc-pos-kpi-card--highlight">
              <p className="mc-pos-kpi-card__label">Período B</p>
              <p className="mc-pos-kpi-card__value">
                {loadingCompB ? '…' : formatCop(comparativoPeriodos.totalB)}
              </p>
              <p className="mc-pos-kpi-card__meta">{comparativoPeriodos.txB} transacciones</p>
            </article>
            <article className="mc-pos-kpi-card">
              <p className="mc-pos-kpi-card__label">Variación</p>
              <p
                className={`mc-pos-kpi-card__value ${
                  comparativoPeriodos.delta >= 0 ? 'mc-pos-kpi-card__value--up' : 'mc-pos-kpi-card__value--down'
                }`}
              >
                {loadingCompA || loadingCompB
                  ? '…'
                  : `${comparativoPeriodos.delta >= 0 ? '+' : ''}${formatCop(comparativoPeriodos.delta)}`}
              </p>
              <p className="mc-pos-kpi-card__meta">
                {loadingCompA || loadingCompB
                  ? '—'
                  : `${comparativoPeriodos.deltaPct >= 0 ? '+' : ''}${comparativoPeriodos.deltaPct}% vs A`}
              </p>
            </article>
          </section>

          <article className="mc-pos-chart-card">
            <h3 className="mc-pos-chart-card__title">Comparativo por rango</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparativoPeriodos.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4df" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={formatCopTooltip} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {comparativoPeriodos.chart.map((_, i) => (
                    <Cell key={i} fill={i === 1 ? '#c5a367' : '#d4d0cb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </article>
        </>
      )}
    </div>
  )
}
