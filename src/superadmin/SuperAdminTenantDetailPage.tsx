import { useCallback, useEffect, useState } from 'react'
import { deleteField } from 'firebase/firestore'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  IconChevronLeft,
  IconLink,
  IconPerson,
} from '@/icons/McIcons'
import { billingPlanOf } from '@/lib/catalogTheme'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { buildStorePublicUrl, formatStorePublicUrlLabel } from '@/lib/storePublicUrl'
import {
  MC_TRIAL_DAYS,
  MS_MONTH,
  MS_QUARTER,
  MS_TRIAL,
  MS_YEAR,
  membershipExpiryLabel,
} from '@/lib/subscription'
import { formatPlatformTermsVersionLabel } from '@/lib/platformTerms'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import type { McBillingPlan } from '@/types/mc'
import { fetchTenantOverviewById, type TenantOverviewRow } from '@/superadmin/fetchTenantsOverview'
import {
  ASSIGN_PLAN_OPTIONS,
  assignExpertPlanFromNow,
  assignTenantSubscriptionFromNow,
  extendTenantSubscription,
  patchTenantOnepayKyb,
  setTenantBillingPlan,
  setTenantPlanTag,
  type AssignPlanDuration,
} from '@/superadmin/tenantAdminActions'
import { formatTenantShortDate, tenantPlanLabel } from '@/superadmin/tenantDisplayUtils'

export function SuperAdminTenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const nav = useNavigate()
  const { profile, isImpersonating, startStoreImpersonation } = useMcAuth()
  const [row, setRow] = useState<TenantOverviewRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [assigningId, setAssigningId] = useState<AssignPlanDuration | null>(null)
  const [impersonateBusy, setImpersonateBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!tenantId || !firebaseConfigured) return
    setErr(null)
    setLoading(true)
    try {
      const data = await fetchTenantOverviewById(getDb(), tenantId)
      setRow(data)
      if (!data) setErr('Tienda no encontrada.')
    } catch {
      setErr('No se pudo cargar el detalle de la tienda.')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void reload()
  }, [profile, reload])

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }
  if (!tenantId) {
    return <Navigate to="/superadmin" replace />
  }

  const tenant = row?.tenant
  const publicUrl = tenant ? buildStorePublicUrl(tenant.slug) : ''
  const urlLabel = tenant ? formatStorePublicUrlLabel(tenant.slug) : ''

  async function withMutation(fn: () => Promise<void>, successMessage: string) {
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      await fn()
      await reload()
      setMsg(successMessage)
    } catch {
      setErr('No se pudo guardar el cambio. Revisá reglas Firestore (súper admin).')
    } finally {
      setBusy(false)
      setAssigningId(null)
    }
  }

  async function handleAssignPlan(duration: AssignPlanDuration) {
    const option = ASSIGN_PLAN_OPTIONS.find((o) => o.id === duration)
    if (!option) return
    setAssigningId(duration)
    await withMutation(
      () => assignExpertPlanFromNow(getDb(), tenantId!, duration),
      `Plan Expert asignado: ${option.label} desde hoy.`,
    )
  }

  async function entrarComoTienda() {
    if (!tenant) return
    if (
      !window.confirm(
        `¿Entrar al panel como «${tenant.nombreTienda}»?\n\nVas a ver la app exactamente como la tienda. Queda registro de auditoría.`,
      )
    ) {
      return
    }
    setImpersonateBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await startStoreImpersonation(tenant.id)
      if (!res.ok) {
        setErr(res.message)
        return
      }
      nav('/app', { replace: true })
    } finally {
      setImpersonateBusy(false)
    }
  }

  return (
    <div className="mc-shell space-y-6 pb-32">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        Volver al listado
      </Link>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900" aria-hidden />
          <p className="ios-subhead text-mc-600">Cargando tienda…</p>
        </div>
      ) : !row || !tenant ? (
        <div className="mc-card space-y-3 py-8 text-center">
          <p className="ios-subhead text-mc-700">{err ?? 'Tienda no encontrada.'}</p>
          <Link to="/superadmin" className="mc-btn-secondary inline-flex px-4 py-2 text-[14px] no-underline">
            Ir al listado
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="ios-large-title truncate">{tenant.nombreTienda}</h1>
              <p className="truncate font-mono text-[13px] text-mc-500">{urlLabel}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-mc-200/90 bg-white px-4 py-2.5 text-[14px] font-semibold text-mc-900 no-underline shadow-sm transition hover:border-mc-300 hover:bg-mc-50"
              >
                <IconLink size={18} />
                Ver tienda
              </a>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400/80 bg-gradient-to-br from-amber-50 to-white px-4 py-2.5 text-[14px] font-semibold text-amber-950 shadow-sm transition hover:border-amber-500/80 hover:from-amber-100/80 disabled:opacity-60"
                disabled={busy || impersonateBusy || isImpersonating}
                onClick={() => void entrarComoTienda()}
              >
                <IconPerson size={18} />
                Entrar como esta tienda
              </button>
            </div>
          </div>

          <section className="mc-card space-y-4" aria-label="Asignar plan Expert">
            <div>
              <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">
                Asignar plan Expert
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-mc-600">
                Activa Expert y fija el vencimiento desde hoy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ASSIGN_PLAN_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="mc-btn-primary px-4 py-2.5 text-[15px]"
                  disabled={busy}
                  onClick={() => void handleAssignPlan(option.id)}
                >
                  {busy && assigningId === option.id ? 'Guardando…' : option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-label="Detalle de tienda">
            <div className="mc-card space-y-3">
              <dl className="space-y-2.5 text-[15px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-mc-500">ID tienda</dt>
                  <dd className="text-right font-mono text-[13px] text-mc-900">{tenant.id}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mc-500">URL pública</dt>
                  <dd className="max-w-[62%] text-right">
                    <a
                      className="font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {urlLabel}
                    </a>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mc-500">WhatsApp</dt>
                  <dd className="text-right text-mc-900">{tenant.whatsappNumero || '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mc-500">Dueño</dt>
                  <dd className="max-w-[60%] text-right break-all text-mc-900">
                    {row.ownerDisplayName && <span className="font-medium">{row.ownerDisplayName}</span>}
                    {row.ownerEmail && (
                      <span className="block ios-footnote text-mc-600">{row.ownerEmail}</span>
                    )}
                    {!row.ownerEmail && !row.ownerDisplayName && '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mc-500">Alta</dt>
                  <dd className="text-right text-mc-900">{formatTenantShortDate(tenant.createdAt)}</dd>
                </div>
                <div className="flex flex-col gap-1 border-t border-mc-100 pt-3">
                  <div className="flex justify-between gap-3">
                    <dt className="text-mc-500">Términos y condiciones</dt>
                    <dd className="text-right text-mc-900">
                      {tenant.platformTermsAcceptedAt ? (
                        <span className="font-medium text-emerald-900">Aceptados</span>
                      ) : (
                        <span className="text-mc-500">Sin registro</span>
                      )}
                    </dd>
                  </div>
                  {tenant.platformTermsAcceptedAt ? (
                    <dl className="space-y-2 rounded-lg border border-violet-200/60 bg-violet-50/40 px-3 py-3 text-[13px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-mc-600">Versión</dt>
                        <dd className="text-right font-mono text-mc-900">
                          {formatPlatformTermsVersionLabel(tenant.platformTermsVersion)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-mc-600">Fecha y hora</dt>
                        <dd className="text-right text-mc-900">
                          {formatTenantShortDate(tenant.platformTermsAcceptedAt)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-mc-600">Correo</dt>
                        <dd className="max-w-[58%] text-right break-all text-mc-900">
                          {tenant.platformTermsAcceptedByEmail ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-mc-600">UID</dt>
                        <dd className="max-w-[58%] text-right break-all font-mono text-[11px] text-mc-800">
                          {tenant.platformTermsAcceptedByUid ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-mc-600">Hash contenido</dt>
                        <dd className="font-mono text-[11px] text-mc-900">
                          {tenant.platformTermsContentHash ?? '—'}
                        </dd>
                      </div>
                      {tenant.platformTermsUserAgent ? (
                        <div className="border-t border-violet-200/50 pt-2">
                          <dt className="text-mc-600">User-Agent</dt>
                          <dd className="mt-1 break-all text-[11px] leading-relaxed text-mc-700">
                            {tenant.platformTermsUserAgent}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mc-500">Vence</dt>
                  <dd className="text-right font-medium text-mc-900">
                    {billingPlanOf(tenant) === 'free' ? (
                      <span className="inline-flex items-center gap-1.5 border border-emerald-200/80 bg-emerald-50/60 px-2 py-0.5 text-[12px] font-medium text-emerald-800">
                        Sin vencimiento
                      </span>
                    ) : (
                      membershipExpiryLabel(tenant, formatTenantShortDate)
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mc-500">Productos</dt>
                  <dd className="text-right text-mc-900">{row.productCount}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mc-500">Pedidos</dt>
                  <dd className="text-right text-mc-900">{row.pedidosCount}</dd>
                </div>
                <div className="flex flex-col gap-2 border-t border-mc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-mc-500">Plan producto (Free / Expert)</span>
                  <select
                    className="mc-input max-w-[12rem] py-2 text-[15px] sm:text-right"
                    disabled={busy}
                    value={billingPlanOf(tenant)}
                    onChange={(e) =>
                      void withMutation(
                        () => setTenantBillingPlan(getDb(), tenant.id, e.target.value as McBillingPlan),
                        `Plan producto: ${e.target.value === 'expert' ? 'Expert' : 'Free'}.`,
                      )
                    }
                  >
                    <option value="free">Free</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 border-t border-mc-100 pt-3">
                  <span className="font-medium text-mc-900">1 · Alta empresa OnePay (KYB)</span>
                  <span className="text-mc-500">
                    El vendedor envía datos desde Mi Catálogo; queda registro en la tienda.
                  </span>
                  <p className="ios-footnote text-mc-600">
                    Estado:{' '}
                    <strong className="text-mc-900">{tenant.onepayKybStatus ?? '—'}</strong>
                    {tenant.onepayCompanyId ? (
                      <>
                        {' '}
                        · empresa <span className="font-mono text-[12px]">{tenant.onepayCompanyId}</span>
                      </>
                    ) : null}
                    {tenant.onepayFundWithdrawalPeriod ? (
                      <>
                        {' '}
                        · llegada de fondos:{' '}
                        <strong className="text-mc-900">
                          {tenant.onepayFundWithdrawalPeriod === 'daily'
                            ? 'Diariamente'
                            : tenant.onepayFundWithdrawalPeriod === 'weekly'
                              ? 'Semanalmente'
                              : tenant.onepayFundWithdrawalPeriod === 'biweekly'
                                ? 'Quincenalmente'
                                : 'Mensualmente'}
                        </strong>
                      </>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="mc-btn-secondary px-3 py-2 text-[14px]"
                      disabled={busy}
                      onClick={() =>
                        void withMutation(
                          () => patchTenantOnepayKyb(getDb(), tenant.id, { onepayKybStatus: 'approved' }),
                          'Estado OnePay KYB actualizado.',
                        )
                      }
                    >
                      Marcar KYB aprobada (tras revisar OnePay)
                    </button>
                    <button
                      type="button"
                      className="mc-btn-secondary px-3 py-2 text-[14px]"
                      disabled={busy}
                      onClick={() =>
                        void withMutation(
                          () => patchTenantOnepayKyb(getDb(), tenant.id, { onepayKybStatus: 'rejected' }),
                          'Estado OnePay KYB actualizado.',
                        )
                      }
                    >
                      Marcar rechazada
                    </button>
                    <button
                      type="button"
                      className="mc-btn-secondary px-3 py-2 text-[14px]"
                      disabled={busy}
                      onClick={() =>
                        void withMutation(
                          () =>
                            patchTenantOnepayKyb(getDb(), tenant.id, {
                              onepayKybStatus: deleteField(),
                              onepayCompanyId: deleteField(),
                              onepayKybSubmittedAt: deleteField(),
                              onepayKybTermsAcceptedAt: deleteField(),
                              onepayKybTermsVersion: deleteField(),
                            }),
                          'Estado OnePay KYB actualizado.',
                        )
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
                    Acá cargás las claves del <strong className="text-mc-900">comercio</strong> en OnePay. Es lo que
                    marca la tienda como apta para cobrar con pasarela (
                    <code className="rounded bg-mc-100 px-1 text-[11px]">onepayPaymentsEnabled</code>).
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                        tenant.onepayPaymentsEnabled
                          ? 'border-emerald-300/80 text-emerald-900'
                          : 'border-neutral-200/70 text-mc-600'
                      }`}
                    >
                      {tenant.onepayPaymentsEnabled ? 'Pasarela activa' : 'Sin claves / webhook'}
                    </span>
                    <Link
                      to={`/superadmin/tienda/${tenant.id}/onepay`}
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

              {tenant.mensajeIntro ? (
                <p className="border border-neutral-200/50 bg-neutral-50/50 px-3 py-2 text-[13px] leading-relaxed text-mc-700">
                  Intro WhatsApp: {tenant.mensajeIntro}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-mc-100 pt-3">
                <IconLink size={18} className="text-mc-400" />
                <span className="ios-footnote font-medium text-mc-700">Etiqueta de plan</span>
                <select
                  className="mc-input max-w-[14rem] py-2 text-[15px]"
                  disabled={busy}
                  value={tenant.subscriptionPlan ?? ''}
                  onChange={(e) =>
                    void withMutation(
                      () =>
                        setTenantPlanTag(
                          getDb(),
                          tenant.id,
                          e.target.value as typeof tenant.subscriptionPlan | '',
                        ),
                      e.target.value ? 'Etiqueta actualizada.' : 'Etiqueta quitada.',
                    )
                  }
                >
                  <option value="">Sin etiqueta</option>
                  <option value="trial">Prueba</option>
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                  <option value="custom">Personalizado</option>
                </select>
                {tenant.subscriptionPlan ? (
                  <span className="ios-footnote text-mc-600">{tenantPlanLabel(tenant.subscriptionPlan)}</span>
                ) : null}
              </div>

              <div className="space-y-2 border-t border-mc-100 pt-3">
                {billingPlanOf(tenant) === 'free' ? (
                  <p className="ios-footnote leading-relaxed text-mc-600">
                    El plan <strong className="font-medium text-mc-900">Free</strong> no tiene vencimiento. Cambiá a
                    Expert para gestionar fechas de membresía.
                  </p>
                ) : (
                  <>
                    <p className="ios-footnote font-medium text-mc-700">
                      Extender Expert (suma sobre el máximo entre hoy y vencimiento)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="mc-btn-secondary px-3 py-2.5 text-[15px]"
                        disabled={busy}
                        onClick={() =>
                          void withMutation(
                            () =>
                              extendTenantSubscription(
                                getDb(),
                                tenant.id,
                                tenant.subscriptionEndsAt ?? Date.now(),
                                MS_TRIAL,
                              ),
                            `Listo: +${MC_TRIAL_DAYS} días.`,
                          )
                        }
                      >
                        +Prueba ({MC_TRIAL_DAYS} días)
                      </button>
                      <button
                        type="button"
                        className="mc-btn-secondary px-3 py-2.5 text-[15px]"
                        disabled={busy}
                        onClick={() =>
                          void withMutation(
                            () =>
                              extendTenantSubscription(
                                getDb(),
                                tenant.id,
                                tenant.subscriptionEndsAt ?? Date.now(),
                                MS_MONTH,
                              ),
                            'Listo: +1 mes.',
                          )
                        }
                      >
                        +1 mes
                      </button>
                      <button
                        type="button"
                        className="mc-btn-secondary px-3 py-2.5 text-[15px]"
                        disabled={busy}
                        onClick={() =>
                          void withMutation(
                            () =>
                              extendTenantSubscription(
                                getDb(),
                                tenant.id,
                                tenant.subscriptionEndsAt ?? Date.now(),
                                MS_QUARTER,
                              ),
                            'Listo: +3 meses.',
                          )
                        }
                      >
                        +3 meses
                      </button>
                      <button
                        type="button"
                        className="mc-btn-secondary px-3 py-2.5 text-[15px]"
                        disabled={busy}
                        onClick={() =>
                          void withMutation(
                            () =>
                              extendTenantSubscription(
                                getDb(),
                                tenant.id,
                                tenant.subscriptionEndsAt ?? Date.now(),
                                MS_YEAR,
                              ),
                            'Listo: +1 año.',
                          )
                        }
                      >
                        +1 año
                      </button>
                    </div>
                    <p className="ios-footnote font-medium text-mc-700">
                      Alta desde hoy (reemplaza la fecha de vencimiento)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="mc-btn-primary px-3 py-2.5 text-[15px]"
                        disabled={busy}
                        onClick={() =>
                          void withMutation(
                            () => assignTenantSubscriptionFromNow(getDb(), tenant.id, MS_TRIAL),
                            'Alta desde hoy: 7 días.',
                          )
                        }
                      >
                        7 días desde hoy
                      </button>
                      <button
                        type="button"
                        className="mc-btn-primary px-3 py-2.5 text-[15px]"
                        disabled={busy}
                        onClick={() =>
                          void withMutation(
                            () => assignTenantSubscriptionFromNow(getDb(), tenant.id, MS_MONTH),
                            'Alta desde hoy: 1 mes.',
                          )
                        }
                      >
                        1 mes desde hoy
                      </button>
                      <button
                        type="button"
                        className="mc-btn-primary px-3 py-2.5 text-[15px]"
                        disabled={busy}
                        onClick={() =>
                          void withMutation(
                            () => assignTenantSubscriptionFromNow(getDb(), tenant.id, MS_QUARTER),
                            'Alta desde hoy: 3 meses.',
                          )
                        }
                      >
                        3 meses desde hoy
                      </button>
                      <button
                        type="button"
                        className="mc-btn-primary px-3 py-2.5 text-[15px]"
                        disabled={busy}
                        onClick={() =>
                          void withMutation(
                            () => assignTenantSubscriptionFromNow(getDb(), tenant.id, MS_YEAR),
                            'Alta desde hoy: 1 año.',
                          )
                        }
                      >
                        1 año desde hoy
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </>
      )}

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
    </div>
  )
}
