import { useCallback, useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  IconChartBars,
  IconChevronLeft,
  IconChevronRight,
  IconClipboard,
  IconCube,
  IconHome,
  IconMagnifier,
} from '@/icons/McIcons'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { isTenantMembershipActive } from '@/lib/subscription'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { fetchTenantsOverview, type TenantOverviewRow } from './fetchTenantsOverview'
import { LandingDemoSettings } from './LandingDemoSettings'
import { NewStoreNotifyEmailSettings } from './NewStoreNotifyEmailSettings'
import { NewStoreExpertPromoSettings } from './NewStoreExpertPromoSettings'
import { TenantOverviewListItem } from './TenantOverviewListItem'
import {
  assignExpertPlanFromNow,
  assignMasterPlanFromNow,
  ASSIGN_PLAN_OPTIONS,
  type AssignPlanDuration,
  type AssignPlanProduct,
} from './tenantAdminActions'

export function SuperAdminPage() {
  const nav = useNavigate()
  const { profile, isImpersonating, impersonation } = useMcAuth()
  const [rows, setRows] = useState<TenantOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [assigning, setAssigning] = useState<{
    tenantId: string
    duration: AssignPlanDuration
    product: AssignPlanProduct
  } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [slugLookup, setSlugLookup] = useState('')
  const [onepayListFilter, setOnepayListFilter] = useState<'all' | 'kyb_pending' | 'pasarela_on'>('all')
  const [logoutBusy, setLogoutBusy] = useState(false)

  async function cerrarSesion() {
    if (!firebaseConfigured || logoutBusy) return
    setLogoutBusy(true)
    try {
      await signOut(getAuthApp())
      nav('/login', { replace: true })
    } finally {
      setLogoutBusy(false)
    }
  }

  const reload = useCallback(async () => {
    setErr(null)
    setLoading(true)
    try {
      const data = await fetchTenantsOverview(getDb())
      setRows(data)
    } catch {
      setErr('No se pudo cargar el panel. Revisá conexión y reglas de Firestore.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void reload()
  }, [profile, reload])

  const filtered = useMemo(() => {
    let base = rows
    if (onepayListFilter === 'kyb_pending') {
      base = base.filter((r) => r.tenant.onepayKybStatus === 'pending')
    } else if (onepayListFilter === 'pasarela_on') {
      base = base.filter((r) => r.tenant.onepayPaymentsEnabled === true)
    }
    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter((r) => {
      const t = r.tenant
      return (
        t.nombreTienda.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (r.ownerEmail?.toLowerCase().includes(q) ?? false) ||
        (r.ownerDisplayName?.toLowerCase().includes(q) ?? false) ||
        t.id.toLowerCase().includes(q)
      )
    })
  }, [rows, search, onepayListFilter])

  const stats = useMemo(() => {
    let activas = 0
    let productos = 0
    let pedidos = 0
    for (const r of rows) {
      if (isTenantMembershipActive(r.tenant)) activas++
      productos += r.productCount
      pedidos += r.pedidosCount
    }
    return {
      total: rows.length,
      activas,
      vencidas: rows.length - activas,
      productos,
      pedidos,
      conProductos: rows.filter((r) => r.productCount > 0).length,
      kybPending: rows.filter((r) => r.tenant.onepayKybStatus === 'pending').length,
      pasarelaOn: rows.filter((r) => r.tenant.onepayPaymentsEnabled === true).length,
    }
  }, [rows])

  async function handleAssignPlan(
    tenantId: string,
    product: AssignPlanProduct,
    duration: AssignPlanDuration,
  ) {
    const option = ASSIGN_PLAN_OPTIONS.find((o) => o.id === duration)
    if (!option) return
    setBusy(true)
    setAssigning({ tenantId, duration, product })
    setMsg(null)
    setErr(null)
    try {
      if (product === 'master') {
        await assignMasterPlanFromNow(getDb(), tenantId, duration)
        setMsg(`Plan Master asignado (${option.label}).`)
      } else {
        await assignExpertPlanFromNow(getDb(), tenantId, duration)
        setMsg(`Plan Expert asignado (${option.label}).`)
      }
      await reload()
    } catch {
      setErr('No se pudo asignar el plan.')
    } finally {
      setBusy(false)
      setAssigning(null)
    }
  }

  async function buscarPorSlug() {
    setErr(null)
    setMsg(null)
    const s = slugLookup.trim().toLowerCase()
    if (s.length < 2) {
      setErr('Ingresá el slug de la tienda.')
      return
    }
    setBusy(true)
    try {
      const db = getDb()
      const sref = doc(db, MC.slugs, s)
      const ss = await getDoc(sref)
      if (!ss.exists() || !(ss.data() as { active?: boolean }).active) {
        setErr('Slug no encontrado.')
        return
      }
      const tenantId = (ss.data() as { tenantId: string }).tenantId
      const ts = await getDoc(doc(db, MC.tenants, tenantId))
      if (!ts.exists()) {
        setErr('Tienda no existe.')
        return
      }
      nav(`/superadmin/tienda/${tenantId}`)
    } finally {
      setBusy(false)
    }
  }

  if (!isMcSuperAdminUser(profile)) {
    return (
      <div className="mc-shell space-y-4">
        <p className="ios-subhead text-mc-900">No tenés permisos de súper admin.</p>
        <p className="text-[13px] leading-relaxed text-mc-600">
          El acceso se define con <code className="rounded bg-mc-100 px-1">isSuperAdmin: true</code> en el documento{' '}
          <code className="rounded bg-mc-100 px-1">mc_users/&#123;tuUid&#125;</code> (consola o panel).
        </p>
        <Link
          to="/app"
          className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
        >
          <IconChevronLeft size={18} />
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="mc-shell space-y-8 pb-32">
      <Link
        to="/app"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        Volver
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="ios-large-title">Súper admin</h1>
          <p className="ios-subhead mt-1">Tiendas, métricas y planes</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="mc-btn-secondary px-4 py-2.5 text-[15px]"
            disabled={loading || busy}
            onClick={() => void reload()}
          >
            Actualizar datos
          </button>
          <button
            type="button"
            className="mc-btn-secondary px-4 py-2.5 text-[15px] text-mc-700"
            disabled={logoutBusy || busy}
            onClick={() => void cerrarSesion()}
          >
            {logoutBusy ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>

      <NewStoreNotifyEmailSettings />
      <NewStoreExpertPromoSettings />
      <LandingDemoSettings />

      <Link
        to="/superadmin/vendedores"
        className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 to-white px-4 py-3 text-[14px] font-semibold text-emerald-950 no-underline transition hover:border-emerald-300/90 hover:bg-emerald-50 sm:w-auto sm:justify-start"
      >
        Panel vendedores (equipo y visitas)
      </Link>

      <Link
        to="/superadmin/analytics"
        className="inline-flex w-full items-center justify-center rounded-lg border border-mc-200/90 bg-gradient-to-br from-mc-50/80 to-white px-4 py-3 text-[14px] font-semibold text-mc-900 no-underline transition hover:border-mc-300/90 hover:bg-mc-50 sm:w-auto sm:justify-start"
      >
        Analíticas por tienda
      </Link>

      <Link
        to="/superadmin/terminos"
        className="inline-flex w-full items-center justify-center rounded-lg border border-mc-200/90 bg-mc-50/60 px-4 py-3 text-[14px] font-semibold text-mc-900 no-underline transition hover:bg-mc-100/70 sm:w-auto sm:justify-start"
      >
        Términos y condiciones (registro de tiendas)
      </Link>

      <Link
        to="/superadmin/tutoriales"
        className="inline-flex w-full items-center justify-center rounded-lg border border-mc-200/90 bg-mc-50/60 px-4 py-3 text-[14px] font-semibold text-mc-900 no-underline transition hover:bg-mc-100/70 sm:w-auto sm:justify-start"
      >
        Administrar tutoriales
      </Link>

      <Link
        to="/superadmin/planes"
        className="inline-flex w-full items-center justify-center rounded-lg border border-mc-200/90 bg-mc-50/60 px-4 py-3 text-[14px] font-semibold text-mc-900 no-underline transition hover:bg-mc-100/70 sm:w-auto sm:justify-start"
      >
        Configurar planes (límites y precios Expert)
      </Link>

      <Link
        to="/superadmin/envios-micatalogo"
        className="inline-flex w-full items-center justify-center rounded-lg border border-mc-200/90 bg-mc-50/60 px-4 py-3 text-[14px] font-semibold text-mc-900 no-underline transition hover:bg-mc-100/70 sm:w-auto sm:justify-start"
      >
        Tarifas de envío plataforma (Excel por ciudad)
      </Link>

      <Link
        to="/superadmin/pasarela-micatalogo"
        className="inline-flex w-full items-center justify-center rounded-lg border border-mc-200/90 bg-mc-50/60 px-4 py-3 text-[14px] font-semibold text-mc-900 no-underline transition hover:bg-mc-100/70 sm:w-auto sm:justify-start"
      >
        Configurar pasarela Mi Catálogo (tiendas sin cuenta OnePay)
      </Link>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900" aria-hidden />
          <p className="ios-subhead text-mc-600">Cargando tiendas…</p>
        </div>
      ) : (
        <>
          <section aria-label="Resumen" className="space-y-4">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">Resumen</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="mc-card">
                <div className="flex items-center gap-2 text-mc-500">
                  <IconHome size={17} />
                  <span className="ios-footnote font-medium">Tiendas</span>
                </div>
                <p className="mt-2 text-[1.35rem] font-medium tracking-tighter tabular-nums text-mc-900">{stats.total}</p>
              </div>
              <div className="mc-card">
                <div className="flex items-center gap-2 text-mc-500">
                  <IconChartBars size={17} />
                  <span className="ios-footnote font-medium text-mc-600">Suscripción activa</span>
                </div>
                <p className="mt-2 text-[1.35rem] font-medium tracking-tighter tabular-nums text-mc-900">{stats.activas}</p>
              </div>
              <div className="mc-card">
                <div className="flex items-center gap-2 text-mc-500">
                  <IconChartBars size={17} />
                  <span className="ios-footnote font-medium text-mc-600">Vencidas</span>
                </div>
                <p className="mt-2 text-[1.35rem] font-medium tracking-tighter tabular-nums text-mc-900">{stats.vencidas}</p>
              </div>
              <div className="mc-card">
                <div className="flex items-center gap-2 text-mc-500">
                  <IconCube size={17} />
                  <span className="ios-footnote font-medium">Productos (total)</span>
                </div>
                <p className="mt-2 text-[1.35rem] font-medium tracking-tighter tabular-nums text-mc-900">{stats.productos}</p>
                <p className="ios-footnote mt-1 leading-relaxed text-mc-500">{stats.conProductos} tiendas con catálogo</p>
              </div>
              <div className="mc-card col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 text-mc-500">
                  <IconClipboard size={17} />
                  <span className="ios-footnote font-medium">Pedidos (total anotados)</span>
                </div>
                <p className="mt-2 text-[1.35rem] font-medium tracking-tighter tabular-nums text-mc-900">{stats.pedidos}</p>
              </div>
            </div>
            <p className="ios-footnote leading-relaxed text-mc-600">
              <strong className="text-mc-900">OnePay</strong>:{' '}
              <span className="tabular-nums">{stats.kybPending}</span> solicitud(es) KYB en estado{' '}
              <span className="font-medium">pending</span> ·{' '}
              <span className="tabular-nums">{stats.pasarelaOn}</span> tienda(s) con cobros por pasarela activos (
              <code className="rounded bg-mc-100 px-1 text-[11px]">onepayPaymentsEnabled</code>).
            </p>
          </section>

          <section className="space-y-3" aria-label="Buscar por slug">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">Buscar por URL</h2>
            <div className="mc-card flex flex-wrap gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <IconMagnifier
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mc-400"
                />
                <input
                  className="mc-input pl-10"
                  placeholder="slug (ej. mi-tienda)"
                  value={slugLookup}
                  onChange={(e) => setSlugLookup(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void buscarPorSlug()
                  }}
                />
              </div>
              <button type="button" className="mc-btn-primary px-4" disabled={busy} onClick={() => void buscarPorSlug()}>
                Ir
              </button>
            </div>
          </section>

          <section className="space-y-3" aria-label="Listado">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">Tiendas registradas</h2>
              <div className="flex w-full flex-col gap-2 sm:max-w-lg sm:flex-row sm:items-center">
                <select
                  className="mc-input py-2 text-[13px] sm:w-[11.5rem]"
                  value={onepayListFilter}
                  onChange={(e) => setOnepayListFilter(e.target.value as typeof onepayListFilter)}
                  aria-label="Filtrar por estado OnePay"
                >
                  <option value="all">Todas las tiendas</option>
                  <option value="kyb_pending">Solo KYB pendiente</option>
                  <option value="pasarela_on">Solo pasarela activa</option>
                </select>
                <div className="relative min-w-0 flex-1">
                  <IconMagnifier
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mc-400"
                  />
                  <input
                    className="mc-input pl-10"
                    placeholder="Filtrar por nombre, slug, correo…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <ul className="flex flex-col gap-3" role="list">
              {filtered.map((r) => (
                <TenantOverviewListItem
                  key={r.tenant.id}
                  row={r}
                  busy={busy}
                  assigning={
                    assigning?.tenantId === r.tenant.id
                      ? { duration: assigning.duration, product: assigning.product }
                      : null
                  }
                  onAssignPlan={handleAssignPlan}
                />
              ))}
            </ul>
            {filtered.length === 0 && !loading && (
              <p className="ios-subhead py-6 text-center text-mc-500">No hay resultados para el filtro.</p>
            )}
          </section>

          {isImpersonating && impersonation ? (
            <section
              className="rounded-xl border border-amber-300/70 bg-gradient-to-br from-amber-50/90 to-orange-50/50 px-4 py-3"
              aria-label="Modo soporte activo"
            >
              <p className="text-[13px] font-semibold text-amber-950">
                Modo soporte activo · {impersonation.tenantName || 'tienda'}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-amber-900/85">
                Estás viendo otra tienda desde el panel. Usá el banner superior en la app para salir.
              </p>
              <Link
                to="/app"
                className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-950 underline decoration-amber-400/80 underline-offset-4"
              >
                Ir al panel impersonado
                <IconChevronRight size={16} />
              </Link>
            </section>
          ) : null}

          {err && (
            <p className="border border-red-200/60 bg-red-50/40 px-3 py-2 text-[14px] leading-relaxed text-red-900">
              {err}
            </p>
          )}
          {msg && (
            <p className="border border-neutral-200/60 bg-neutral-50/50 px-3 py-2 text-[14px] leading-relaxed text-mc-900">
              {msg}
            </p>
          )}
        </>
      )}
    </div>
  )
}
