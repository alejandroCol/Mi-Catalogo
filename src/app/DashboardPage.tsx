import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { billingPlanOf } from '@/lib/catalogTheme'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import {
  catalogoVendedorGate,
  explicitCheckoutVentasModo,
  hasCheckoutVentasModoSelected,
  isCatalogoVendedorListo,
} from '@/lib/checkoutVentasModo'
import { isSubscriptionActive } from '@/lib/subscription'
import { useTenantPedidosSales } from '@/hooks/useTenantPedidosSales'
import { useTenantHasProducts } from '@/hooks/useTenantHasProducts'
import { useTenantTodayVisits } from '@/hooks/useTenantAnalytics'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import {
  IconBankCard,
  IconChartBars,
  IconChevronRight,
  IconClipboard,
  IconLink,
  IconPlusCircle,
} from '@/icons/McIcons'
import { CheckoutEnvioRequiredModal } from '@/app/CheckoutEnvioRequiredModal'
import { CheckoutVentasRequiredModal } from '@/app/CheckoutVentasRequiredModal'
import { NewStoreExpertBanner } from '@/components/onboarding/NewStoreExpertBanner'
import { NewStoreSetupChecklist } from '@/components/onboarding/NewStoreSetupChecklist'
import { OnboardingExpertRewardCard } from '@/components/onboarding/OnboardingExpertRewardCard'
import { isNewStoreForOnboarding } from '@/lib/newStoreOnboarding'

export function DashboardPage() {
  const { profile, tenant } = useMcAuth()
  const { platformSettings, ready: platformSettingsReady } = usePlatformSettings()
  const [onepayBalancePreview, setOnepayBalancePreview] = useState<string | null>(null)
  const [onepayBalancePreviewLoading, setOnepayBalancePreviewLoading] = useState(false)
  const [ventasRequiredModalOpen, setVentasRequiredModalOpen] = useState(false)
  const [envioRequiredModalOpen, setEnvioRequiredModalOpen] = useState(false)
  const summaryPeriod = tenant?.salesSummaryPeriod === 'fortnight' ? 'fortnight' : 'week'
  const sales = useTenantPedidosSales(profile?.tenantId, summaryPeriod)
  const { hasProducts, loading: productsLoading } = useTenantHasProducts(profile?.tenantId)
  const { visits: todayVisits, loading: visitsLoading } = useTenantTodayVisits(profile?.tenantId)
  const active = tenant ? isSubscriptionActive(tenant.subscriptionEndsAt) : false

  useEffect(() => {
    const modo = explicitCheckoutVentasModo(tenant)
    if (
      !tenant ||
      !profile ||
      !active ||
      profile.uid !== tenant.ownerUid ||
      (modo !== 'pasarela' && modo !== 'pasarela_micatalogo') ||
      !firebaseConfigured
    ) {
      return
    }
    if (modo === 'pasarela' && tenant.onepayPaymentsEnabled !== true) return
    let cancelled = false
    setOnepayBalancePreviewLoading(true)
    ;(async () => {
      try {
        const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepaySellerSaldoSummary')
        const res = (await fn({})) as {
          data: {
            balance?: { balance_label?: string } | null
            ledger?: { availableNetCop?: number } | null
            modo?: string
          }
        }
        const ledgerAvailable = res.data?.ledger?.availableNetCop
        const preview =
          typeof ledgerAvailable === 'number'
            ? formatCop(ledgerAvailable)
            : res.data?.balance?.balance_label
        if (!cancelled) {
          setOnepayBalancePreview(typeof preview === 'string' && preview.trim() ? preview.trim() : null)
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
  const catalogoListo = isCatalogoVendedorListo(tenant, platformSettings)

  function abrirCatalogoPublico() {
    const gate = catalogoVendedorGate(tenant, platformSettings)
    if (gate === 'ventas') {
      setVentasRequiredModalOpen(true)
      return
    }
    if (gate === 'envio') {
      setEnvioRequiredModalOpen(true)
      return
    }
    window.open(publicUrl, '_blank', 'noopener,noreferrer')
  }
  const plan = billingPlanOf(tenant)
  const planBadgeClass =
    plan === 'expert'
      ? 'border-[color-mix(in_srgb,var(--cat-text)_15%,transparent)] text-[var(--cat-text)]'
      : 'border-neutral-200/70 text-[var(--cat-muted)]'
  const hoyLabel = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const checkoutModo = explicitCheckoutVentasModo(tenant)
  const saldoPath =
    checkoutModo === 'pasarela' || checkoutModo === 'pasarela_micatalogo' ? '/app/mi-saldo' : null
  const showOnepayEnableCta =
    active && profile.uid === tenant.ownerUid && !hasCheckoutVentasModoSelected(tenant)

  const showNewStoreOnboarding = isNewStoreForOnboarding(tenant)

  return (
    <div className="mc-shell space-y-6 sm:space-y-8">
      <section className="border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cat-muted)]">Tu tienda</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 className="min-w-0 text-[1.65rem] font-medium leading-[1.15] tracking-tighter text-[var(--cat-text)] sm:text-[2rem]">
            {tenant.nombreTienda}
          </h1>
          <span
            className={`inline-flex shrink-0 border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] sm:px-3 sm:py-1 sm:text-[11px] ${planBadgeClass}`}
          >
            {plan === 'expert' ? 'Expert' : 'Free'}
          </span>
        </div>
        <p className="mt-2 text-[13px] capitalize leading-relaxed text-[var(--cat-muted)]">{hoyLabel}</p>
      </section>

      {showNewStoreOnboarding && (
        <>
          <NewStoreExpertBanner tenant={tenant} />
          <NewStoreSetupChecklist
            tenant={tenant}
            platformSettings={platformSettings}
            platformSettingsReady={platformSettingsReady}
            hasProducts={hasProducts}
          />
        </>
      )}

      {!showNewStoreOnboarding && <OnboardingExpertRewardCard tenant={tenant} />}

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

      {showOnepayEnableCta && (
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

      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        <SaldoCard
          saldoPath={saldoPath}
          periodo="hoy"
          label="Vendido hoy"
          loading={sales.loading}
          amount={sales.today}
        />
        <SaldoCard
          saldoPath={saldoPath}
          periodo="semana"
          label={sales.periodLabel}
          loading={sales.loading}
          amount={sales.periodTotal}
        />
      </section>

      <section aria-label="Visitas al catálogo">
        <Link
          to="/app/estadisticas"
          className="group relative flex w-full overflow-hidden border border-neutral-200/55 bg-[var(--cat-surface)] px-5 py-6 text-left shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_5%,transparent)] transition duration-200 hover:border-[color-mix(in_srgb,var(--cat-text)_14%,transparent)] hover:bg-neutral-50/40 sm:px-7 sm:py-7"
        >
          <div
            className="pointer-events-none absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_14%,transparent)] blur-2xl"
            aria-hidden
          />
          <div className="relative flex w-full items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--cat-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_92%,var(--cat-accent))] text-[var(--cat-text)]">
              <IconChartBars size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                Estadísticas
              </p>
              <p className="mt-1.5 text-[17px] font-medium leading-snug tracking-tight text-[var(--cat-text)]">
                Visitas a tu catálogo
              </p>
              {visitsLoading ? (
                <div className="mt-3 h-8 w-16 animate-pulse rounded-sm bg-neutral-100" />
              ) : (
                <p className="mt-2 text-[1.35rem] font-medium tabular-nums leading-none tracking-tight text-[var(--cat-text)]">
                  {todayVisits ?? 0}{' '}
                  <span className="text-[13px] font-normal text-[var(--cat-muted)]">hoy</span>
                </p>
              )}
            </div>
            <span className="relative mt-1 shrink-0 rounded-sm border border-neutral-200/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-text)] transition group-hover:border-neutral-300">
              Ver estadísticas
            </span>
          </div>
        </Link>
      </section>

      {active &&
        profile?.uid === tenant.ownerUid &&
        (checkoutModo === 'pasarela_micatalogo' || tenant.onepayPaymentsEnabled === true) && (
        <section aria-label="Dinero en pasarela">
          <Link
            to={checkoutModo === 'pasarela_micatalogo' ? '/app/mi-saldo' : '/app/pagos-pasarela/onepay'}
            className="group flex w-full items-start gap-4 border border-neutral-200/55 bg-[var(--cat-surface)] px-5 py-6 text-left shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_5%,transparent)] transition duration-200 hover:border-[color-mix(in_srgb,var(--cat-text)_14%,transparent)] hover:bg-neutral-50/40 sm:px-7 sm:py-7"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--cat-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_90%,var(--cat-accent))] text-[var(--cat-text)]">
              <IconBankCard size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
                {checkoutModo === 'pasarela_micatalogo' ? 'Pasarela Mi Catálogo' : 'Pasarela OnePay'}
              </p>
              <p className="mt-1.5 text-[17px] font-medium leading-snug tracking-tight text-[var(--cat-text)]">
                {checkoutModo === 'pasarela_micatalogo' ? 'Saldo de tus ventas' : 'Dinero en pasarela'}
              </p>
              {onepayBalancePreviewLoading ? (
                <div className="mt-3 h-8 w-40 max-w-[70%] animate-pulse rounded-sm bg-neutral-100" />
              ) : (
                <p className="mt-2 break-words text-[1.35rem] font-medium tabular-nums leading-none tracking-tight text-[var(--cat-text)]">
                  {onepayBalancePreview ?? 'Ver balance y cobros'}
                </p>
              )}
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

      {active &&
        (catalogoListo ? (
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
        ) : (
          <button
            type="button"
            onClick={abrirCatalogoPublico}
            className="group flex w-full cursor-pointer items-center gap-4 border border-neutral-200/50 bg-[var(--cat-accent)] px-5 py-5 text-left text-[var(--cat-accent-text)] transition duration-200 ease-in-out hover:opacity-90"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/25 text-[var(--cat-accent-text)]">
              <IconLink size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium tracking-tight">Ver catálogo público</p>
              <p className="mt-1 break-all text-[12px] leading-relaxed opacity-90">{publicUrl}</p>
            </div>
            <IconChevronRight size={17} className="shrink-0 opacity-70 transition group-hover:opacity-100" />
          </button>
        ))}

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

      <CheckoutVentasRequiredModal
        open={ventasRequiredModalOpen}
        onClose={() => setVentasRequiredModalOpen(false)}
        context="dashboard"
        tenant={tenant}
        tenantId={profile?.tenantId}
        platformSettings={platformSettings}
      />
      <CheckoutEnvioRequiredModal
        open={envioRequiredModalOpen}
        onClose={() => setEnvioRequiredModalOpen(false)}
      />
    </div>
  )
}

function SaldoCard({
  saldoPath,
  periodo,
  label,
  loading,
  amount,
}: {
  saldoPath: string | null
  periodo: 'hoy' | 'semana'
  label: string
  loading: boolean
  amount: number
}) {
  const inner = (
    <>
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)] sm:text-[13px]">
        {label}
      </p>
      {loading ? (
        <div className="mt-3 h-10 w-full max-w-[9rem] animate-pulse rounded-sm bg-neutral-100 sm:h-11" />
      ) : (
        <p className="mt-2 break-words text-[1.45rem] font-medium tabular-nums leading-none tracking-tighter text-[var(--cat-text)] sm:mt-3 sm:text-[2rem]">
          {formatCop(amount)}
        </p>
      )}
    </>
  )
  const className =
    'border border-neutral-200/50 bg-[var(--cat-surface)] p-5 sm:p-7 transition hover:border-neutral-300/70 hover:bg-neutral-50/40'
  if (saldoPath) {
    return (
      <Link to={`${saldoPath}?periodo=${periodo}`} className={`${className} no-underline`}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}
