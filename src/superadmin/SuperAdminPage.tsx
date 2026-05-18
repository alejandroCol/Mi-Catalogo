import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteField,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  IconChartBars,
  IconChevronLeft,
  IconChevronRight,
  IconClipboard,
  IconCube,
  IconHome,
  IconLink,
  IconMagnifier,
} from '@/icons/McIcons'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  MC_TRIAL_DAYS,
  MS_MONTH,
  MS_TRIAL,
  MS_YEAR,
  extendSubscription,
  isSubscriptionActive,
  setSubscriptionFromNow,
} from '@/lib/subscription'
import { billingPlanOf } from '@/lib/catalogTheme'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import type { McBillingPlan, McTenant } from '@/types/mc'
import { fetchTenantsOverview, type TenantOverviewRow } from './fetchTenantsOverview'

function formatShortDate(ms: number) {
  return new Date(ms).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function planLabel(plan: McTenant['subscriptionPlan'] | undefined): string {
  switch (plan) {
    case 'trial':
      return 'Prueba'
    case 'monthly':
      return 'Mensual'
    case 'yearly':
      return 'Anual'
    case 'custom':
      return 'Personalizado'
    default:
      return 'Sin etiqueta'
  }
}

export function SuperAdminPage() {
  const { profile } = useMcAuth()
  const [rows, setRows] = useState<TenantOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [slugLookup, setSlugLookup] = useState('')
  const [slugTenant, setSlugTenant] = useState<(McTenant & { id: string }) | null>(null)
  /** Filtro rápido de tiendas relacionadas con OnePay (KYB / pasarela). */
  const [onepayListFilter, setOnepayListFilter] = useState<'all' | 'kyb_pending' | 'pasarela_on'>('all')

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
      const hay =
        t.nombreTienda.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (r.ownerEmail?.toLowerCase().includes(q) ?? false) ||
        (r.ownerDisplayName?.toLowerCase().includes(q) ?? false) ||
        t.id.toLowerCase().includes(q)
      return hay
    })
  }, [rows, search, onepayListFilter])

  const stats = useMemo(() => {
    let activas = 0
    let productos = 0
    let pedidos = 0
    for (const r of rows) {
      if (isSubscriptionActive(r.tenant.subscriptionEndsAt)) activas++
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

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.tenant.id === selectedId) ?? null : null),
    [rows, selectedId],
  )

  async function patchTenant(
    tenantId: string,
    patch: Partial<Pick<McTenant, 'subscriptionEndsAt' | 'subscriptionPlan'>>,
  ) {
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, tenantId), patch)
      await reload()
      setMsg('Cambios guardados.')
    } catch {
      setErr('No se pudo actualizar. Revisá reglas Firestore (súper admin).')
    } finally {
      setBusy(false)
    }
  }

  async function setBillingPlanRow(tenantId: string, plan: McBillingPlan) {
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, tenantId), { billingPlan: plan })
      await reload()
      setMsg(`Plan producto: ${plan === 'expert' ? 'Expert' : 'Free'}.`)
    } catch {
      setErr('No se pudo cambiar el plan Free / Expert.')
    } finally {
      setBusy(false)
    }
  }

  async function patchOnepayKyb(tenantId: string, patch: Record<string, unknown>) {
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, tenantId), patch)
      await reload()
      setMsg('Estado OnePay KYB actualizado.')
    } catch {
      setErr('No se pudo actualizar el estado KYB.')
    } finally {
      setBusy(false)
    }
  }

  async function setPlanTag(tenantId: string, value: string) {
    const v = value as McTenant['subscriptionPlan'] | ''
    if (!v) {
      setBusy(true)
      setMsg(null)
      setErr(null)
      try {
        await updateDoc(doc(getDb(), MC.tenants, tenantId), { subscriptionPlan: deleteField() })
        await reload()
        setMsg('Etiqueta quitada.')
      } catch {
        setErr('No se pudo actualizar el plan.')
      } finally {
        setBusy(false)
      }
      return
    }
    await patchTenant(tenantId, { subscriptionPlan: v })
  }

  async function extender(tenantId: string, currentEnd: number, ms: number, label: string) {
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      const next = extendSubscription(currentEnd, ms)
      await updateDoc(doc(getDb(), MC.tenants, tenantId), { subscriptionEndsAt: next })
      await reload()
      setMsg(`Listo: +${label} (desde el máximo entre hoy y vencimiento actual).`)
    } catch {
      setErr('No se pudo extender la suscripción.')
    } finally {
      setBusy(false)
    }
  }

  async function asignarDesdeHoy(tenantId: string, ms: number, label: string) {
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      const next = setSubscriptionFromNow(ms)
      await updateDoc(doc(getDb(), MC.tenants, tenantId), { subscriptionEndsAt: next })
      await reload()
      setMsg(`Alta desde hoy: ${label}.`)
    } catch {
      setErr('No se pudo asignar el plan.')
    } finally {
      setBusy(false)
    }
  }

  async function buscarPorSlug() {
    setErr(null)
    setMsg(null)
    setSlugTenant(null)
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
      const t = { id: ts.id, ...(ts.data() as Omit<McTenant, 'id'>) }
      setSlugTenant(t)
      setSelectedId(t.id)
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
        <button
          type="button"
          className="mc-btn-secondary shrink-0 px-4 py-2.5 text-[15px]"
          disabled={loading || busy}
          onClick={() => void reload()}
        >
          Actualizar datos
        </button>
      </div>

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
                />
              </div>
              <button type="button" className="mc-btn-primary px-4" disabled={busy} onClick={() => void buscarPorSlug()}>
                Ir
              </button>
            </div>
            {slugTenant && (
              <p className="ios-footnote text-mc-600">
                Encontrada: <strong className="text-mc-900">{slugTenant.nombreTienda}</strong> — seleccionada abajo.
              </p>
            )}
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

            <ul className="flex flex-col gap-2" role="list">
              {filtered.map((r) => {
                const t = r.tenant
                const active = isSubscriptionActive(t.subscriptionEndsAt)
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                      className={`mc-card mc-card-press flex w-full items-center gap-3 text-left ${
                        selectedId === t.id ? 'ring-1 ring-neutral-400/50' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="ios-headline truncate">{t.nombreTienda}</p>
                        <p className="ios-footnote truncate text-mc-500">/{t.slug}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                              active
                                ? 'border-neutral-200/80 text-mc-800'
                                : 'border-neutral-200/60 text-mc-500'
                            }`}
                          >
                            {active ? 'Activa' : 'Vencida'}
                          </span>
                          <span
                            className={`border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                              billingPlanOf(t) === 'expert'
                                ? 'border-mc-900/25 text-mc-900'
                                : 'border-neutral-200/70 text-mc-600'
                            }`}
                          >
                            {billingPlanOf(t) === 'expert' ? 'Expert' : 'Free'}
                          </span>
                          {t.subscriptionPlan && (
                            <span className="border border-neutral-200/70 px-2 py-0.5 text-[11px] font-medium text-mc-700">
                              {planLabel(t.subscriptionPlan)}
                            </span>
                          )}
                          {t.onepayKybStatus === 'pending' ? (
                            <span className="border border-amber-300/80 bg-amber-50/90 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-950">
                              KYB pendiente
                            </span>
                          ) : null}
                          {t.onepayKybStatus === 'approved' && t.onepayPaymentsEnabled !== true ? (
                            <span className="border border-sky-200/90 bg-sky-50/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-sky-950">
                              KYB aprobada · sin claves
                            </span>
                          ) : null}
                          {t.onepayPaymentsEnabled === true ? (
                            <span className="border border-emerald-300/80 bg-emerald-50/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-950">
                              Pasarela
                            </span>
                          ) : null}
                          <span className="ios-footnote text-mc-600">
                            {r.productCount} prod. · {r.pedidosCount} ped.
                          </span>
                        </div>
                      </div>
                      <IconChevronRight size={20} className="shrink-0 text-mc-300" />
                    </button>
                  </li>
                )
              })}
            </ul>
            {filtered.length === 0 && !loading && (
              <p className="ios-subhead py-6 text-center text-mc-500">No hay resultados para el filtro.</p>
            )}
          </section>

          {selected && (
            <section className="space-y-4 border-t border-neutral-200/50 pt-8" aria-label="Detalle de tienda">
              <h2 className="ios-headline">Detalle · {selected.tenant.nombreTienda}</h2>
              <div className="mc-card space-y-3">
                <dl className="space-y-2.5 text-[15px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">ID tienda</dt>
                    <dd className="text-right font-mono text-[13px] text-mc-900">{selected.tenant.id}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">Slug</dt>
                    <dd className="text-right">
                      <Link
                        className="font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
                        to={`/c/${selected.tenant.slug}`}
                      >
                        /c/{selected.tenant.slug}
                      </Link>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">WhatsApp</dt>
                    <dd className="text-right text-mc-900">{selected.tenant.whatsappNumero || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">Dueño</dt>
                    <dd className="max-w-[60%] text-right break-all text-mc-900">
                      {selected.ownerDisplayName && (
                        <span className="font-medium">{selected.ownerDisplayName}</span>
                      )}
                      {selected.ownerEmail && (
                        <span className="block ios-footnote text-mc-600">{selected.ownerEmail}</span>
                      )}
                      {!selected.ownerEmail && !selected.ownerDisplayName && '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">Alta</dt>
                    <dd className="text-right text-mc-900">{formatShortDate(selected.tenant.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">Vence</dt>
                    <dd className="text-right font-medium text-mc-900">
                      {formatShortDate(selected.tenant.subscriptionEndsAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">Productos</dt>
                    <dd className="text-right text-mc-900">{selected.productCount}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">Pedidos</dt>
                    <dd className="text-right text-mc-900">{selected.pedidosCount}</dd>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-mc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-mc-500">Plan producto (Free / Expert)</span>
                    <select
                      className="mc-input max-w-[12rem] py-2 text-[15px] sm:text-right"
                      disabled={busy}
                      value={billingPlanOf(selected.tenant)}
                      onChange={(e) => void setBillingPlanRow(selected.tenant.id, e.target.value as McBillingPlan)}
                    >
                      <option value="free">Free</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-mc-100 pt-3">
                    <span className="font-medium text-mc-900">1 · Alta empresa OnePay (KYB)</span>
                    <span className="text-mc-500">El vendedor envía datos desde Mi Catálogo; queda registro en la tienda.</span>
                    <p className="ios-footnote text-mc-600">
                      Estado:{' '}
                      <strong className="text-mc-900">
                        {selected.tenant.onepayKybStatus ?? '—'}
                      </strong>
                      {selected.tenant.onepayCompanyId ? (
                        <>
                          {' '}
                          · empresa{' '}
                          <span className="font-mono text-[12px]">{selected.tenant.onepayCompanyId}</span>
                        </>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="mc-btn-secondary px-3 py-2 text-[14px]"
                        disabled={busy}
                        onClick={() =>
                          void patchOnepayKyb(selected.tenant.id, { onepayKybStatus: 'approved' })
                        }
                      >
                        Marcar KYB aprobada (tras revisar OnePay)
                      </button>
                      <button
                        type="button"
                        className="mc-btn-secondary px-3 py-2 text-[14px]"
                        disabled={busy}
                        onClick={() =>
                          void patchOnepayKyb(selected.tenant.id, { onepayKybStatus: 'rejected' })
                        }
                      >
                        Marcar rechazada
                      </button>
                      <button
                        type="button"
                        className="mc-btn-secondary px-3 py-2 text-[14px]"
                        disabled={busy}
                        onClick={() =>
                          void patchOnepayKyb(selected.tenant.id, {
                            onepayKybStatus: deleteField(),
                            onepayCompanyId: deleteField(),
                            onepayKybSubmittedAt: deleteField(),
                            onepayKybTermsAcceptedAt: deleteField(),
                            onepayKybTermsVersion: deleteField(),
                          })
                        }
                      >
                        Limpiar solicitud KYB
                      </button>
                    </div>
                    <p className="ios-footnote leading-relaxed text-mc-500">
                      Sincroniza con Firestore después de revisar el resultado en{' '}
                      <strong className="font-medium text-mc-900">OnePay</strong>. Esto{' '}
                      <strong className="font-medium text-mc-900">no</strong> habilita cobros en el catálogo por sí solo.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-mc-100 pt-3">
                    <span className="font-medium text-mc-900">2 · Pasarela de cobro en el catálogo</span>
                    <span className="text-mc-500">
                      Acá cargás las claves del <strong className="text-mc-900">comercio</strong> en OnePay. Es lo que marca
                      la tienda como apta para cobrar con pasarela (
                      <code className="rounded bg-mc-100 px-1 text-[11px]">onepayPaymentsEnabled</code>).
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                          selected.tenant.onepayPaymentsEnabled
                            ? 'border-emerald-300/80 text-emerald-900'
                            : 'border-neutral-200/70 text-mc-600'
                        }`}
                      >
                        {selected.tenant.onepayPaymentsEnabled ? 'Pasarela activa' : 'Sin claves / webhook'}
                      </span>
                      <Link
                        to={`/superadmin/tienda/${selected.tenant.id}/onepay`}
                        className="mc-btn-primary px-3 py-2 text-[13px] no-underline"
                      >
                        Cargar API y webhook →
                      </Link>
                    </div>
                    <p className="ios-footnote text-mc-600">
                      Solo súper admin. Clave <span className="font-mono">sk_test_</span> o{' '}
                      <span className="font-mono">sk_live_</span> y secreto del webhook. El dueño elige modo pasarela en{' '}
                      <strong className="font-medium text-mc-900">Cuenta</strong> cuando esto esté listo.
                    </p>
                  </div>
                </dl>

                {selected.tenant.mensajeIntro ? (
                  <p className="border border-neutral-200/50 bg-neutral-50/50 px-3 py-2 text-[13px] leading-relaxed text-mc-700">
                    Intro WhatsApp: {selected.tenant.mensajeIntro}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 border-t border-mc-100 pt-3">
                  <IconLink size={18} className="text-mc-400" />
                  <span className="ios-footnote font-medium text-mc-700">Etiqueta de plan</span>
                  <select
                    className="mc-input max-w-[14rem] py-2 text-[15px]"
                    disabled={busy}
                    value={selected.tenant.subscriptionPlan ?? ''}
                    onChange={(e) => void setPlanTag(selected.tenant.id, e.target.value)}
                  >
                    <option value="">Sin etiqueta</option>
                    <option value="trial">Prueba</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                <div className="space-y-2 border-t border-mc-100 pt-3">
                  <p className="ios-footnote font-medium text-mc-700">Extender (suma sobre el máximo entre hoy y vencimiento)</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="mc-btn-secondary px-3 py-2.5 text-[15px]"
                      disabled={busy}
                      onClick={() =>
                        void extender(
                          selected.tenant.id,
                          selected.tenant.subscriptionEndsAt,
                          MS_TRIAL,
                          `${MC_TRIAL_DAYS} días`,
                        )
                      }
                    >
                      +Prueba ({MC_TRIAL_DAYS} días)
                    </button>
                    <button
                      type="button"
                      className="mc-btn-secondary px-3 py-2.5 text-[15px]"
                      disabled={busy}
                      onClick={() => void extender(selected.tenant.id, selected.tenant.subscriptionEndsAt, MS_MONTH, '1 mes')}
                    >
                      +1 mes
                    </button>
                    <button
                      type="button"
                      className="mc-btn-secondary px-3 py-2.5 text-[15px]"
                      disabled={busy}
                      onClick={() => void extender(selected.tenant.id, selected.tenant.subscriptionEndsAt, MS_YEAR, '1 año')}
                    >
                      +1 año
                    </button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-mc-100 pt-3">
                  <p className="ios-footnote font-medium text-mc-700">Alta desde hoy (reemplaza la fecha de vencimiento)</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="mc-btn-primary px-3 py-2.5 text-[15px]"
                      disabled={busy}
                      onClick={() => void asignarDesdeHoy(selected.tenant.id, MS_TRIAL, '7 días desde hoy')}
                    >
                      7 días desde hoy
                    </button>
                    <button
                      type="button"
                      className="mc-btn-primary px-3 py-2.5 text-[15px]"
                      disabled={busy}
                      onClick={() => void asignarDesdeHoy(selected.tenant.id, MS_MONTH, '1 mes desde hoy')}
                    >
                      1 mes desde hoy
                    </button>
                    <button
                      type="button"
                      className="mc-btn-primary px-3 py-2.5 text-[15px]"
                      disabled={busy}
                      onClick={() => void asignarDesdeHoy(selected.tenant.id, MS_YEAR, '1 año desde hoy')}
                    >
                      1 año desde hoy
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {err && <p className="border border-red-200/60 bg-red-50/40 px-3 py-2 text-[14px] leading-relaxed text-red-900">{err}</p>}
          {msg && (
            <p className="border border-neutral-200/60 bg-neutral-50/50 px-3 py-2 text-[14px] leading-relaxed text-mc-900">{msg}</p>
          )}
        </>
      )}
    </div>
  )
}
