import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  query,
  updateDoc,
  where,
  getDocs,
} from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { IconChevronLeft, IconPlus, IconTrash } from '@/icons/McIcons'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { callMcAdminCreateStore } from '@/lib/mcAdminCreateStoreApi'
import { callMcCreateSalesRep, callMcSetSalesRepActive } from '@/lib/mcSalesRepApi'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { fetchTenantsOverview } from '@/superadmin/fetchTenantsOverview'
import {
  fetchAllSalesVisits,
  fetchSalesReps,
  groupVisitsByDate,
  type SalesRepRow,
  type SalesVisitRow,
} from '@/superadmin/fetchSalesRepOverview'
import { useDemoStores } from '@/vendedor/hooks/useDemoStores'
import type { McDemoStore, McTenant } from '@/types/mc'

const OUTCOME_LABELS: Record<SalesVisitRow['outcome'], string> = {
  venta_exitosa: 'Venta exitosa',
  pendiente: 'Pendiente',
  rechazo: 'Rechazo',
}

const OUTCOME_STYLES: Record<SalesVisitRow['outcome'], string> = {
  venta_exitosa: 'bg-emerald-100 text-emerald-800',
  pendiente: 'bg-amber-100 text-amber-900',
  rechazo: 'bg-red-100 text-red-800',
}

function localDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function SuperAdminVendedoresPage() {
  const { profile } = useMcAuth()
  const [reps, setReps] = useState<SalesRepRow[]>([])
  const [visits, setVisits] = useState<SalesVisitRow[]>([])
  const [tenants, setTenants] = useState<(McTenant & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState(localDateKey())

  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')

  const [storeNombre, setStoreNombre] = useState('')
  const [storeEmail, setStoreEmail] = useState('')
  const [storePassword, setStorePassword] = useState('')
  const [storeWhatsapp, setStoreWhatsapp] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [lastCreatedStoreUrl, setLastCreatedStoreUrl] = useState<string | null>(null)

  const [demoTenantId, setDemoTenantId] = useState('')
  const [demoDisplayName, setDemoDisplayName] = useState('')
  const [demoDescription, setDemoDescription] = useState('')

  const { stores: demoStores, loading: demoLoading } = useDemoStores(false)

  const reload = useCallback(async () => {
    setErr(null)
    setLoading(true)
    try {
      const db = getDb()
      const [repsData, visitsData, tenantRows] = await Promise.all([
        fetchSalesReps(db),
        fetchAllSalesVisits(db),
        fetchTenantsOverview(db),
      ])
      setReps(repsData)
      setVisits(visitsData)
      setTenants(tenantRows.map((r) => ({ ...r.tenant, id: r.tenant.id })))
    } catch {
      setErr('No se pudo cargar datos de vendedores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void reload()
  }, [profile, reload])

  const visitsByDate = useMemo(() => groupVisitsByDate(visits), [visits])
  const sortedDates = useMemo(
    () => [...visitsByDate.keys()].sort((a, b) => b.localeCompare(a)),
    [visitsByDate],
  )

  const filteredVisits = useMemo(() => {
    if (!filterDate) return visits
    return visits.filter((v) => v.dateKey === filterDate)
  }, [visits, filterDate])

  const dailyStats = useMemo(() => {
    const dayVisits = filteredVisits
    return {
      total: dayVisits.length,
      vendidas: dayVisits.filter((v) => v.outcome === 'venta_exitosa').length,
      pendientes: dayVisits.filter((v) => v.outcome === 'pendiente').length,
      rechazos: dayVisits.filter((v) => v.outcome === 'rechazo').length,
    }
  }, [filteredVisits])

  if (!isMcSuperAdminUser(profile)) {
    return (
      <div className="mc-page mx-auto max-w-lg p-6">
        <p className="text-mc-700">Acceso restringido a súper admin.</p>
        <Link to="/app" className="mc-btn-secondary mt-4 inline-flex">
          Volver
        </Link>
      </div>
    )
  }

  async function onCreateRep(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setBusy(true)
    const res = await callMcCreateSalesRep({
      email: newEmail.trim(),
      password: newPassword,
      displayName: newName.trim(),
    })
    setBusy(false)
    if (!res.ok) {
      setErr(res.message)
      return
    }
    setMsg('Vendedor creado correctamente.')
    setNewEmail('')
    setNewPassword('')
    setNewName('')
    void reload()
  }

  async function onCreateStore(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setLastCreatedStoreUrl(null)
    setBusy(true)
    const res = await callMcAdminCreateStore({
      nombreTienda: storeNombre.trim(),
      email: storeEmail.trim(),
      password: storePassword,
      whatsappNumero: storeWhatsapp.trim(),
      ...(storeSlug.trim() ? { slug: storeSlug.trim() } : {}),
    })
    setBusy(false)
    if (!res.ok) {
      setErr(res.message)
      return
    }
    setMsg(
      `Tienda creada. El comerciante puede iniciar sesión sin verificar correo (${res.data.emailVerified ? 'correo ya verificado' : 'pendiente'}).`,
    )
    setLastCreatedStoreUrl(res.data.storeUrl)
    setStoreNombre('')
    setStoreEmail('')
    setStorePassword('')
    setStoreWhatsapp('')
    setStoreSlug('')
    void reload()
  }

  async function onToggleRep(uid: string, active: boolean) {
    setBusy(true)
    const res = await callMcSetSalesRepActive(uid, active)
    setBusy(false)
    if (!res.ok) {
      setErr(res.message)
      return
    }
    void reload()
  }

  async function onCreateDemo(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (!demoTenantId) {
      setErr('Seleccioná una tienda.')
      return
    }
    setBusy(true)
    try {
      const tenantSnap = await getDoc(doc(getDb(), MC.tenants, demoTenantId))
      if (!tenantSnap.exists()) {
        setErr('Tienda no encontrada.')
        setBusy(false)
        return
      }
      const tenant = tenantSnap.data() as McTenant
      const existing = await getDocs(
        query(collection(getDb(), MC.demoStores), where('tenantId', '==', demoTenantId)),
      )
      if (!existing.empty) {
        setErr('Esa tienda ya está registrada como demo.')
        setBusy(false)
        return
      }
      const maxOrder = demoStores.reduce((m, s) => Math.max(m, s.order), 0)
      await addDoc(collection(getDb(), MC.demoStores), {
        tenantId: demoTenantId,
        slug: tenant.slug,
        displayName: demoDisplayName.trim() || tenant.nombreTienda,
        description: demoDescription.trim() || null,
        active: true,
        order: maxOrder + 1,
        createdAt: Date.now(),
      })
      setMsg('Tienda demo agregada.')
      setDemoTenantId('')
      setDemoDisplayName('')
      setDemoDescription('')
    } catch {
      setErr('No se pudo crear la tienda demo.')
    } finally {
      setBusy(false)
    }
  }

  async function onRemoveDemo(id: string) {
    if (!confirm('¿Eliminar esta tienda demo?')) return
    setBusy(true)
    try {
      await deleteDoc(doc(getDb(), MC.demoStores, id))
      setMsg('Tienda demo eliminada.')
    } catch {
      setErr('No se pudo eliminar.')
    } finally {
      setBusy(false)
    }
  }

  async function onToggleDemo(store: McDemoStore) {
    setBusy(true)
    try {
      await updateDoc(doc(getDb(), MC.demoStores, store.id), { active: !store.active })
    } catch {
      setErr('No se pudo actualizar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-page mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[14px] font-medium text-mc-600 no-underline hover:text-mc-900"
      >
        <IconChevronLeft size={18} />
        Súper admin
      </Link>

      <header>
        <h1 className="ios-large-title">Vendedores</h1>
        <p className="ios-subhead mt-1 text-mc-600">
          Equipo comercial, tiendas demo y registro de visitas por fecha
        </p>
      </header>

      {err ? <p className="rounded-lg bg-red-50 px-4 py-3 text-[14px] text-red-800">{err}</p> : null}
      {msg ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-[14px] text-emerald-800">{msg}</p> : null}

      {/* Create sales rep */}
      <section className="mc-card space-y-4">
        <h2 className="text-[16px] font-semibold text-mc-900">Crear vendedor</h2>
        <form onSubmit={(e) => void onCreateRep(e)} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="ios-footnote font-medium text-mc-700">Nombre</label>
            <input className="mc-input mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Correo</label>
            <input
              type="email"
              className="mc-input mt-1"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="ios-footnote font-medium text-mc-700">Contraseña inicial</label>
            <input
              type="password"
              className="mc-input mt-1"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="mc-btn-primary sm:col-span-2" disabled={busy}>
            <IconPlus size={16} className="mr-1 inline" />
            Crear vendedor
          </button>
        </form>
      </section>

      {/* Create store (no email verification) */}
      <section className="mc-card space-y-4">
        <div>
          <h2 className="text-[16px] font-semibold text-mc-900">Crear tienda</h2>
          <p className="ios-footnote mt-1 text-mc-600">
            Alta directa para marcas cerradas en campo. El correo queda verificado y el comerciante entra al panel sin
            paso de confirmación.
          </p>
        </div>
        <form onSubmit={(e) => void onCreateStore(e)} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="ios-footnote font-medium text-mc-700">Nombre de la tienda</label>
            <input
              className="mc-input mt-1"
              value={storeNombre}
              onChange={(e) => setStoreNombre(e.target.value)}
              placeholder="Ej. Boutique Luna"
              required
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Correo del comerciante</label>
            <input
              type="email"
              className="mc-input mt-1"
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">WhatsApp</label>
            <input
              className="mc-input mt-1"
              value={storeWhatsapp}
              onChange={(e) => setStoreWhatsapp(e.target.value)}
              placeholder="573001234567"
              required
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Contraseña inicial</label>
            <input
              type="password"
              className="mc-input mt-1"
              value={storePassword}
              onChange={(e) => setStorePassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Enlace catálogo (opcional)</label>
            <input
              className="mc-input mt-1"
              value={storeSlug}
              onChange={(e) => setStoreSlug(e.target.value)}
              placeholder="Se genera del nombre si lo dejás vacío"
            />
          </div>
          <button type="submit" className="mc-btn-primary sm:col-span-2" disabled={busy}>
            <IconPlus size={16} className="mr-1 inline" />
            Crear tienda
          </button>
        </form>
        {lastCreatedStoreUrl ? (
          <p className="rounded-lg bg-mc-50 px-4 py-3 text-[13px] text-mc-700">
            Catálogo:{' '}
            <a
              href={lastCreatedStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-mc-900 underline"
            >
              {lastCreatedStoreUrl}
            </a>
          </p>
        ) : null}
      </section>

      {/* Sales reps list */}
      <section className="mc-card">
        <h2 className="text-[16px] font-semibold text-mc-900">Equipo ({reps.length})</h2>
        {loading ? (
          <p className="ios-subhead mt-4 text-mc-500">Cargando…</p>
        ) : reps.length === 0 ? (
          <p className="ios-subhead mt-4 text-mc-500">Aún no hay vendedores creados.</p>
        ) : (
          <ul className="mt-4 divide-y divide-mc-100">
            {reps.map((rep) => (
              <li key={rep.uid} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div>
                  <p className="font-medium text-mc-900">{rep.displayName}</p>
                  <p className="ios-footnote text-mc-500">{rep.email}</p>
                  <p className="ios-footnote mt-1 text-mc-600">
                    {rep.visitCount} visitas · {rep.soldCount} vendidas
                  </p>
                </div>
                <button
                  type="button"
                  className={rep.active !== false ? 'mc-btn-secondary text-[13px]' : 'mc-btn-primary text-[13px]'}
                  disabled={busy}
                  onClick={() => void onToggleRep(rep.uid, rep.active === false)}
                >
                  {rep.active !== false ? 'Desactivar' : 'Activar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Demo stores */}
      <section className="mc-card space-y-4">
        <h2 className="text-[16px] font-semibold text-mc-900">Tiendas demo</h2>
        <form onSubmit={(e) => void onCreateDemo(e)} className="space-y-3">
          <div>
            <label className="ios-footnote font-medium text-mc-700">Tienda existente</label>
            <select
              className="mc-input mt-1"
              value={demoTenantId}
              onChange={(e) => setDemoTenantId(e.target.value)}
            >
              <option value="">Seleccionar tienda…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombreTienda} ({t.slug})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Nombre para vendedores (opcional)</label>
            <input
              className="mc-input mt-1"
              value={demoDisplayName}
              onChange={(e) => setDemoDisplayName(e.target.value)}
              placeholder="Ej. Demo moda boutique"
            />
          </div>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Descripción (opcional)</label>
            <input
              className="mc-input mt-1"
              value={demoDescription}
              onChange={(e) => setDemoDescription(e.target.value)}
              placeholder="Rubro o nota para el vendedor"
            />
          </div>
          <button type="submit" className="mc-btn-primary" disabled={busy}>
            Agregar tienda demo
          </button>
        </form>

        {demoLoading ? null : demoStores.length > 0 ? (
          <ul className="mt-4 divide-y divide-mc-100 border-t border-mc-100 pt-4">
            {demoStores.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-mc-900">
                    {s.displayName}
                    {!s.active ? (
                      <span className="ml-2 text-[11px] font-normal text-mc-500">(inactiva)</span>
                    ) : null}
                  </p>
                  <p className="ios-footnote text-mc-500">/{s.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="mc-btn-secondary px-3 py-1.5 text-[12px]"
                    disabled={busy}
                    onClick={() => void onToggleDemo(s)}
                  >
                    {s.active ? 'Ocultar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-[12px] text-red-700"
                    disabled={busy}
                    onClick={() => void onRemoveDemo(s.id)}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ios-footnote text-mc-500">Sin tiendas demo aún.</p>
        )}
      </section>

      {/* Visits by date */}
      <section className="mc-card space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-mc-900">Registro de visitas</h2>
          <div>
            <label className="ios-footnote font-medium text-mc-700">Filtrar por fecha</label>
            <input
              type="date"
              className="mc-input mt-1"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-mc-50 px-3 py-2 text-center">
            <p className="text-[20px] font-bold text-mc-900">{dailyStats.total}</p>
            <p className="ios-footnote text-mc-500">Visitas</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
            <p className="text-[20px] font-bold text-emerald-800">{dailyStats.vendidas}</p>
            <p className="ios-footnote text-emerald-700/80">Vendidas</p>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
            <p className="text-[20px] font-bold text-amber-900">{dailyStats.pendientes}</p>
            <p className="ios-footnote text-amber-800/80">Pendientes</p>
          </div>
          <div className="rounded-xl bg-red-50 px-3 py-2 text-center">
            <p className="text-[20px] font-bold text-red-800">{dailyStats.rechazos}</p>
            <p className="ios-footnote text-red-700/80">Rechazos</p>
          </div>
        </div>

        {loading ? (
          <p className="ios-subhead text-mc-500">Cargando visitas…</p>
        ) : filteredVisits.length === 0 ? (
          <p className="ios-subhead text-mc-500">Sin visitas para esta fecha.</p>
        ) : (
          <ul className="divide-y divide-mc-100">
            {filteredVisits.map((v) => (
              <li key={v.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-mc-900">{v.storeName}</p>
                    <p className="ios-footnote text-mc-500">{v.salesRepName}</p>
                    {v.tenantSlug ? (
                      <p className="ios-footnote mt-0.5 text-mc-brand-gold">Tienda vinculada · {v.tenantSlug}</p>
                    ) : null}
                    {v.storeDetail ? (
                      <p className="ios-footnote mt-1 text-mc-600">{v.storeDetail}</p>
                    ) : null}
                    {v.rejectionReason ? (
                      <p className="ios-footnote mt-1 text-red-700/90">Motivo: {v.rejectionReason}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${OUTCOME_STYLES[v.outcome]}`}
                  >
                    {OUTCOME_LABELS[v.outcome]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {sortedDates.length > 1 ? (
          <details className="border-t border-mc-100 pt-4">
            <summary className="cursor-pointer text-[14px] font-medium text-mc-700">
              Ver historial por día ({sortedDates.length} días)
            </summary>
            <div className="mt-3 space-y-4">
              {sortedDates.map((date) => {
                const dayList = visitsByDate.get(date) ?? []
                const sold = dayList.filter((v) => v.outcome === 'venta_exitosa').length
                return (
                  <div key={date} className="rounded-xl border border-mc-200/70 p-3">
                    <p className="text-[14px] font-semibold text-mc-900">
                      {date} — {dayList.length} visitas, {sold} vendidas
                    </p>
                  </div>
                )
              })}
            </div>
          </details>
        ) : null}
      </section>

      <button type="button" className="mc-btn-secondary w-full sm:w-auto" disabled={loading} onClick={() => void reload()}>
        Actualizar datos
      </button>
    </div>
  )
}
