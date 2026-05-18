import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { billingPlanOf } from '@/lib/catalogTheme'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import { isSubscriptionActive } from '@/lib/subscription'
import { useTenantPedidosSales } from '@/hooks/useTenantPedidosSales'
import { useTenantHasProducts } from '@/hooks/useTenantHasProducts'
import {
  IconBankCard,
  IconCalendar,
  IconChevronRight,
  IconClipboard,
  IconCoins,
  IconLink,
  IconPlusCircle,
} from '@/icons/McIcons'

export function DashboardPage() {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const [onepayBalancePreview, setOnepayBalancePreview] = useState<string | null>(null)
  const [onepayBalancePreviewLoading, setOnepayBalancePreviewLoading] = useState(false)
  const summaryPeriod = tenant?.salesSummaryPeriod === 'fortnight' ? 'fortnight' : 'week'
  const sales = useTenantPedidosSales(profile?.tenantId, summaryPeriod)
  const { hasProducts, loading: productsLoading } = useTenantHasProducts(profile?.tenantId)
  const active = tenant ? isSubscriptionActive(tenant.subscriptionEndsAt) : false

  useEffect(() => {
    if (
      !tenant ||
      !profile ||
      !active ||
      profile.uid !== tenant.ownerUid ||
      tenant.onepayPaymentsEnabled !== true ||
      !firebaseConfigured
    ) {
      return
    }
    let cancelled = false
    setOnepayBalancePreviewLoading(true)
    ;(async () => {
      try {
        const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayMerchantBalance')
        const res = (await fn({})) as { data: { balance_label?: string } }
        const bl = res.data?.balance_label
        if (!cancelled) {
          setOnepayBalancePreview(typeof bl === 'string' && bl.trim() ? bl.trim() : null)
        }
      } catch {
        if (!cancelled) setOnepayBalancePreview(null)
      } finally {
        if (!cancelled) setOnepayBalancePreviewLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenant, profile, active])

  if (!tenant || !profile) {
    return (
      <div className="mc-shell">
        <p className="ios-subhead">Cargando tu tienda…</p>
      </div>
    )
  }

  const publicUrl = `${window.location.origin}/c/${tenant.slug}`
  const plan = billingPlanOf(tenant)
  const hoyLabel = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="mc-shell space-y-10">
      <section className="border border-neutral-200/50 bg-[var(--cat-surface)] px-6 py-8 sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cat-muted)]">Tu tienda</p>
            <h1 className="mt-2 text-[1.75rem] font-medium leading-[1.15] tracking-tighter text-[var(--cat-text)] sm:text-[2rem]">
              {tenant.nombreTienda}
            </h1>
            <p className="mt-3 text-[15px] text-[var(--cat-muted)]">
              <span className="font-medium text-[var(--cat-text)]">
                {profile.displayName?.trim() || firebaseUser?.email || '—'}
              </span>
            </p>
            <p className="mt-2 text-[13px] capitalize leading-relaxed text-[var(--cat-muted)]">{hoyLabel}</p>
          </div>
          <span
            className={`inline-flex shrink-0 self-start border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${
              plan === 'expert'
                ? 'border-[color-mix(in_srgb,var(--cat-text)_15%,transparent)] text-[var(--cat-text)]'
                : 'border-neutral-200/70 text-[var(--cat-muted)]'
            }`}
          >
            {plan === 'expert' ? 'Expert' : 'Free'}
          </span>
        </div>
      </section>

      {!active && (
        <div className="border border-neutral-200/60 bg-neutral-50/50 px-5 py-4 text-[13px] leading-relaxed text-[var(--cat-text)]">
          Tu membresía expiró. Renová para que el catálogo público siga activo.
        </div>
      )}

      {!productsLoading && !hasProducts && (
        <section>
          <Link
            to="/app/inventario"
            className="mc-btn-cat flex w-full items-center justify-center py-4 text-[15px] font-semibold uppercase tracking-[0.12em]"
          >
            EMPIEZA A VENDER
          </Link>
        </section>
      )}

      {active && profile?.uid === tenant.ownerUid && tenant.onepayPaymentsEnabled !== true && (
        <section aria-label="Pagos con pasarela">
          <Link
            to="/app/pagos-pasarela"
            className="group relative flex w-full overflow-hidden border border-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] bg-gradient-to-br from-[var(--cat-surface)] via-[var(--cat-surface)] to-[color-mix(in_srgb,var(--cat-accent)_14%,var(--cat-surface))] px-5 py-6 text-left shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_6%,transparent)] transition duration-300 hover:border-[color-mix(in_srgb,var(--cat-accent)_55%,transparent)] hover:shadow-[0_14px_40px_-28px_color-mix(in_srgb,var(--cat-text)_45%,transparent)] sm:px-7 sm:py-7"
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_22%,transparent)] blur-2xl"
              aria-hidden
            />
            <div className="relative flex w-full items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] bg-[var(--cat-surface)] text-[var(--cat-text)] shadow-sm">
                <IconBankCard size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
                  Nuevo · Cobros online
                </p>
                <p className="mt-1.5 text-[17px] font-medium leading-snug tracking-tight text-[var(--cat-text)]">
                  Habilitar pagos con tarjeta, Nequi y PSE
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--cat-muted)]">
                  Solicitá tu cuenta OnePay desde acá. Te guiamos paso a paso; la pasarela en el catálogo queda activa cuando
                  esté aprobada y vincules tu clave en Cuenta.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Tarjeta', 'Nequi', 'PSE'].map((m) => (
                    <span
                      key={m}
                      className="border border-[color-mix(in_srgb,var(--cat-text)_10%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_88%,var(--cat-accent))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-text)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
                {tenant.onepayKybStatus === 'pending' && (
                  <p className="mt-3 border border-amber-200/50 bg-amber-50/30 px-2.5 py-1.5 text-[12px] font-medium text-amber-950">
                    Solicitud en revisión · te avisamos para el siguiente paso
                  </p>
                )}
                {tenant.onepayKybStatus === 'approved' && (
                  <p className="mt-3 border border-emerald-200/50 bg-emerald-50/35 px-2.5 py-1.5 text-[12px] font-medium text-emerald-950">
                    Aprobada · completá la vinculación en Cuenta
                  </p>
                )}
              </div>
              <IconChevronRight
                size={18}
                className="relative shrink-0 text-[var(--cat-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
              />
            </div>
          </Link>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border border-neutral-200/50 bg-[var(--cat-surface)] p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200/60 text-[var(--cat-text)]">
              <IconCoins size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--cat-muted)]">Vendido hoy</p>
              {sales.loading ? (
                <div className="mt-3 h-9 w-36 animate-pulse rounded-sm bg-neutral-100" />
              ) : (
                <p className="mt-2 break-words text-[1.5rem] font-medium tabular-nums leading-none tracking-tighter text-[var(--cat-text)] sm:text-[1.65rem]">
                  {formatCop(sales.today)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="border border-neutral-200/50 bg-[var(--cat-surface)] p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200/60 text-[var(--cat-text)]">
              <IconCalendar size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                {sales.periodLabel}
              </p>
              {sales.loading ? (
                <div className="mt-3 h-9 w-36 animate-pulse rounded-sm bg-neutral-100" />
              ) : (
                <p className="mt-2 break-words text-[1.5rem] font-medium tabular-nums leading-none tracking-tighter text-[var(--cat-text)] sm:text-[1.65rem]">
                  {formatCop(sales.periodTotal)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {active && profile?.uid === tenant.ownerUid && tenant.onepayPaymentsEnabled === true && (
        <section aria-label="Dinero en pasarela">
          <Link
            to="/app/pagos-pasarela/onepay"
            className="group flex w-full items-start gap-4 border border-neutral-200/55 bg-[var(--cat-surface)] px-5 py-6 text-left shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_5%,transparent)] transition duration-200 hover:border-[color-mix(in_srgb,var(--cat-text)_14%,transparent)] hover:bg-neutral-50/40 sm:px-7 sm:py-7"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--cat-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_90%,var(--cat-accent))] text-[var(--cat-text)]">
              <IconBankCard size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Pasarela OnePay</p>
              <p className="mt-1.5 text-[17px] font-medium leading-snug tracking-tight text-[var(--cat-text)]">
                Dinero en pasarela
              </p>
              {onepayBalancePreviewLoading ? (
                <div className="mt-3 h-8 w-40 max-w-[70%] animate-pulse rounded-sm bg-neutral-100" />
              ) : (
                <p className="mt-2 break-words text-[1.35rem] font-medium tabular-nums leading-none tracking-tight text-[var(--cat-text)]">
                  {onepayBalancePreview ?? 'Ver balance y cobros'}
                </p>
              )}
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--cat-muted)]">
                Balance en OnePay y listado de cobros. Tocá para el detalle.
              </p>
            </div>
            <IconChevronRight
              size={18}
              className="relative mt-1 shrink-0 text-[var(--cat-muted)] opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100"
            />
          </Link>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-[15px] font-medium tracking-tight text-[var(--cat-text)]">Acciones rápidas</h2>
        <div className="grid grid-cols-1 divide-y divide-neutral-200/50 border border-neutral-200/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <Link
            to="/app/inventario"
            className="group flex items-center gap-4 bg-[var(--cat-surface)] px-5 py-5 transition duration-200 ease-in-out hover:bg-neutral-50/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200/60 text-[var(--cat-text)] transition duration-200 ease-in-out group-hover:border-neutral-300/80">
              <IconPlusCircle size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium tracking-tight text-[var(--cat-text)]">Inventario</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cat-muted)]">Agregar o editar artículos</p>
            </div>
            <IconChevronRight size={17} className="shrink-0 text-[var(--cat-muted)] opacity-60 transition group-hover:opacity-100" />
          </Link>
          <Link
            to="/app/pedidos"
            className="group flex items-center gap-4 bg-[var(--cat-surface)] px-5 py-5 transition duration-200 ease-in-out hover:bg-neutral-50/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200/60 text-[var(--cat-text)]">
              <IconClipboard size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium tracking-tight text-[var(--cat-text)]">Ventas</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cat-muted)]">Catálogo y pedidos manuales</p>
            </div>
            <IconChevronRight size={17} className="shrink-0 text-[var(--cat-muted)] opacity-60 transition group-hover:opacity-100" />
          </Link>
        </div>
      </section>

      {active && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-4 border border-neutral-200/50 bg-[var(--cat-accent)] px-5 py-5 text-[var(--cat-accent-text)] transition duration-200 ease-in-out hover:opacity-90"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/25 text-[var(--cat-accent-text)]">
            <IconLink size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium tracking-tight">Ver catálogo público</p>
            <p className="mt-1 break-all text-[12px] leading-relaxed opacity-90">{publicUrl}</p>
          </div>
          <IconChevronRight size={17} className="shrink-0 opacity-70 transition group-hover:opacity-100" />
        </a>
      )}

      <div className="border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-4 text-[13px] leading-relaxed text-[var(--cat-muted)]">
        <p>
          Membresía hasta{' '}
          <strong className="font-medium text-[var(--cat-text)]">
            {new Date(tenant.subscriptionEndsAt).toLocaleDateString('es-CO')}
          </strong>
        </p>
        {tenant.whatsappNumero && (
          <p className="mt-1.5">
            WhatsApp pedidos:{' '}
            <strong className="font-medium text-[var(--cat-text)]">{tenant.whatsappNumero}</strong>
          </p>
        )}
      </div>

      {isMcSuperAdminUser(profile) && (
        <Link
          to="/superadmin"
          className="block border border-neutral-200/60 bg-[var(--cat-surface)] px-5 py-4 text-center text-[15px] font-medium text-[var(--cat-text)] transition duration-200 ease-in-out hover:bg-neutral-50/60"
        >
          Panel súper admin
        </Link>
      )}
    </div>
  )
}
