import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { AnalyticsStatCard, AnalyticsStatGrid } from '@/components/analytics/AnalyticsStatCard'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { formatStorePublicUrlLabel } from '@/lib/storePublicUrl'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { fetchTenantsOverview, type TenantOverviewRow } from '@/superadmin/fetchTenantsOverview'
import {
  fetchPlatformTenantAnalytics,
  sumPlatformAnalytics,
  type TenantAnalyticsRow,
} from '@/superadmin/fetchPlatformAnalytics'
import { NewStoreNotifyEmailSettings } from '@/superadmin/NewStoreNotifyEmailSettings'
import { IconChartBars, IconChevronLeft, IconMagnifier } from '@/icons/McIcons'

type StoreAnalyticsRow = TenantOverviewRow & {
  analytics: TenantAnalyticsRow | null
}

export function SuperAdminAnalyticsPage() {
  const { profile } = useMcAuth()
  const [stores, setStores] = useState<StoreAnalyticsRow[]>([])
  const [platformTotals, setPlatformTotals] = useState(() => sumPlatformAnalytics([]))
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'visits30d' | 'visits7d' | 'nombre'>('visits30d')

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    setErr(null)
    try {
      const db = getDb()
      const tenants = await fetchTenantsOverview(db)
      let analyticsMap = new Map<string, TenantAnalyticsRow>()
      try {
        analyticsMap = await fetchPlatformTenantAnalytics(
          db,
          tenants.map((row) => row.tenant.id),
        )
      } catch (e) {
        console.error('[SuperAdminAnalyticsPage] analytics', e)
        setErr('No se pudieron cargar las métricas de tráfico. La lista de tiendas sí está disponible.')
      }

      const merged: StoreAnalyticsRow[] = tenants.map((row) => ({
        ...row,
        analytics: analyticsMap.get(row.tenant.id) ?? null,
      }))
      setStores(merged)
      setPlatformTotals(sumPlatformAnalytics(analyticsMap.values()))
    } catch (e) {
      console.error('[SuperAdminAnalyticsPage]', e)
      setErr('No se pudieron cargar las analíticas.')
      setStores([])
      setPlatformTotals(sumPlatformAnalytics([]))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void load()
  }, [profile, load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = stores
    if (q) {
      rows = rows.filter(
        (r) =>
          r.tenant.nombreTienda.toLowerCase().includes(q) ||
          r.tenant.slug.toLowerCase().includes(q) ||
          (r.ownerEmail ?? '').toLowerCase().includes(q),
      )
    }
    return [...rows].sort((a, b) => {
      if (sortBy === 'nombre') {
        return a.tenant.nombreTienda.localeCompare(b.tenant.nombreTienda, 'es')
      }
      const av = a.analytics?.[sortBy] ?? 0
      const bv = b.analytics?.[sortBy] ?? 0
      return bv - av
    })
  }, [stores, search, sortBy])

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="mc-shell space-y-8 pb-32">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        Súper admin
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-mc-600">
            <IconChartBars size={20} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Analíticas</p>
          </div>
          <h1 className="ios-large-title mt-1">Tráfico por tienda</h1>
          <p className="ios-subhead mt-1">Visitas al catálogo público y avisos de registro</p>
        </div>
        <button
          type="button"
          className="mc-btn-secondary shrink-0 px-4 py-2.5 text-[15px]"
          disabled={loading}
          onClick={() => void load()}
        >
          Actualizar
        </button>
      </div>

      <NewStoreNotifyEmailSettings />

      {err ? <p className="text-[13px] text-red-800">{err}</p> : null}

      <AnalyticsStatGrid className="lg:grid-cols-4">
        <AnalyticsStatCard
          label="Visitas 7 días"
          value={platformTotals.visits7d}
          hint="Toda la plataforma"
          accent
          loading={loading}
        />
        <AnalyticsStatCard
          label="Visitas 30 días"
          value={platformTotals.visits30d}
          loading={loading}
        />
        <AnalyticsStatCard
          label="Tiendas con tráfico"
          value={platformTotals.storesWithTraffic}
          hint="Con visitas en 30 días"
          loading={loading}
        />
        <AnalyticsStatCard
          label="Checkouts iniciados"
          value={platformTotals.checkoutStarts30d}
          hint="Últimos 30 días"
          loading={loading}
        />
      </AnalyticsStatGrid>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[15px] font-semibold text-mc-900">Desglose por tienda</h2>
          <div className="flex flex-wrap gap-2">
            <select
              className="mc-input max-w-[12rem] py-2 text-[14px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="visits30d">Más visitas (30d)</option>
              <option value="visits7d">Más visitas (7d)</option>
              <option value="nombre">Nombre A–Z</option>
            </select>
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <IconMagnifier
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mc-400"
              />
              <input
                className="mc-input w-full py-2 pl-9 text-[14px]"
                placeholder="Buscar tienda…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-mc-200/80">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-mc-200/80 bg-mc-50/70 text-[11px] uppercase tracking-[0.08em] text-mc-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Tienda</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold text-right">7 días</th>
                <th className="px-4 py-3 font-semibold text-right">30 días</th>
                <th className="px-4 py-3 font-semibold text-right">Vistas</th>
                <th className="px-4 py-3 font-semibold text-right">Checkouts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-mc-500">
                    Cargando analíticas…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-mc-500">
                    No hay tiendas que coincidan.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.tenant.id} className="bg-white/60 hover:bg-mc-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-mc-900">{row.tenant.nombreTienda}</p>
                      {row.ownerEmail ? (
                        <p className="mt-0.5 text-[11px] text-mc-500">{row.ownerEmail}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-mc-700">
                      {formatStorePublicUrlLabel(row.tenant.slug)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-mc-900">
                      {row.analytics?.visits7d ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-mc-900">
                      {row.analytics?.visits30d ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-mc-700">
                      {row.analytics?.pageViews30d ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-mc-700">
                      {row.analytics?.checkoutStarts30d ?? 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
