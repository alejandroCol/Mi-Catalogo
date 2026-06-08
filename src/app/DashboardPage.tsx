import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { billingPlanOf } from '@/lib/catalogTheme'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import {
  catalogoVendedorGate,
  explicitCheckoutVentasModo,
  hasCheckoutVentasModoSelected,
  isCatalogoVendedorListo,
} from '@/lib/checkoutVentasModo'
import { isTenantMembershipActive, membershipExpiryLabel } from '@/lib/subscription'
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
  IconMagicBrush,
  IconPlusCircle,
} from '@/icons/McIcons'
import { CheckoutEnvioRequiredModal } from '@/app/CheckoutEnvioRequiredModal'
import { CheckoutVentasRequiredModal } from '@/app/CheckoutVentasRequiredModal'
import { NewStoreExpertBanner } from '@/components/onboarding/NewStoreExpertBanner'
import { NewStoreReadyToShareCard } from '@/components/onboarding/NewStoreReadyToShareCard'
import { NewStoreSetupChecklist } from '@/components/onboarding/NewStoreSetupChecklist'
import { OnboardingExpertRewardCard } from '@/components/onboarding/OnboardingExpertRewardCard'
import { CompartirMiTiendaButton } from '@/components/dashboard/CompartirMiTiendaButton'
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh'
import { useOnboardingRewardWindow } from '@/hooks/useOnboardingRewardWindow'
import { DASHBOARD_RETURN_NAV } from '@/app/configuraciones/configSubpageNav'
import {
  isNewStoreChecklistEligible,
  isNewStoreExpertPromoBannerVisible,
  isNewStoreExpertPromoEnabled,
  shouldShowNewStoreReadyToSharePrompt,
} from '@/lib/newStoreOnboarding'

export function DashboardPage() {
  const { profile, tenant, loading, effectiveTenantId, isActingAsStoreOwner } = useMcAuth()
  const { platformSettings, ready: platformSettingsReady, reload: reloadPlatformSettings } =
    usePlatformSettings()
  const [onepayBalancePreview, setOnepayBalancePreview] = useState<string | null>(null)
  const [onepayBalancePreviewLoading, setOnepayBalancePreviewLoading] = useState(false)
  const [ventasRequiredModalOpen, setVentasRequiredModalOpen] = useState(false)
  const [envioRequiredModalOpen, setEnvioRequiredModalOpen] = useState(false)
  const summaryPeriod = tenant?.salesSummaryPeriod === 'fortnight' ? 'fortnight' : 'week'
  const {
    loading: salesLoading,
    reload: reloadSales,
    today: salesToday,
    periodTotal: salesPeriodTotal,
    periodLabel: salesPeriodLabel,
  } = useTenantPedidosSales(effectiveTenantId, summaryPeriod)
  const { hasProducts, loading: productsLoading } = useTenantHasProducts(effectiveTenantId)
  const { visits: todayVisits, loading: visitsLoading, reload: reloadTodayVisits } =
    useTenantTodayVisits(effectiveTenantId)
  const active = tenant ? isTenantMembershipActive(tenant) : false

  const loadOnepayBalancePreview = useCallback(async () => {
    const modo = explicitCheckoutVentasModo(tenant)
    if (
      !tenant ||
      !profile ||
      !active ||
      !isActingAsStoreOwner ||
      (modo !== 'pasarela' && modo !== 'pasarela_micatalogo') ||
      !firebaseConfigured
    ) {
      setOnepayBalancePreview(null)
      setOnepayBalancePreviewLoading(false)
      return
    }
    if (modo === 'pasarela' && tenant.onepayPaymentsEnabled !== true) {
      setOnepayBalancePreview(null)
      setOnepayBalancePreviewLoading(false)
      return
    }
    setOnepayBalancePreviewLoading(true)
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
      setOnepayBalancePreview(typeof preview === 'string' && preview.trim() ? preview.trim() : null)
    } catch {
      setOnepayBalancePreview(null)
    } finally {
      setOnepayBalancePreviewLoading(false)
    }
  }, [tenant, profile, active])

  useEffect(() => {
    void loadOnepayBalancePreview()
  }, [loadOnepayBalancePreview])

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      reloadSales(),
      reloadTodayVisits(),
      reloadPlatformSettings(),
      loadOnepayBalancePreview(),
    ])
  }, [reloadSales, reloadTodayVisits, reloadPlatformSettings, loadOnepayBalancePreview])

  if (loading || !tenant || !profile) {
    return (
      <div className="mc-shell flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900" aria-hidden />
        <p className="ios-subhead text-mc-600">Cargando tu tienda…</p>
      </div>
    )
  }

  const publicUrl = buildStorePublicUrl(tenant.slug)
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
    active && isActingAsStoreOwner && !hasCheckoutVentasModoSelected(tenant)

  const { nowMs } = useOnboardingRewardWindow(tenant)
  const showNewStoreChecklist = isNewStoreChecklistEligible(tenant)
  const showReadyToSharePrompt = shouldShowNewStoreReadyToSharePrompt(tenant)
  const showExpertPromoBanner =
    platformSettingsReady && isNewStoreExpertPromoBannerVisible(tenant, platformSettings, nowMs)
  const expertPromoEnabled = platformSettingsReady && isNewStoreExpertPromoEnabled(platformSettings)

  return (
    <MobilePullToRefresh onRefresh={refreshDashboard}>
    {showExpertPromoBanner && <NewStoreExpertBanner tenant={tenant} />}
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

      {showNewStoreChecklist && (
        <NewStoreSetupChecklist
          tenant={tenant}
          platformSettings={platformSettings}
          platformSettingsReady={platformSettingsReady}
          hasProducts={hasProducts}
          expertPromoEnabled={expertPromoEnabled}
        />
      )}

      {showReadyToSharePrompt && <NewStoreReadyToShareCard />}

      {!showNewStoreChecklist && !showReadyToSharePrompt && (
        <OnboardingExpertRewardCard tenant={tenant} />
      )}

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
            to="/app/cuenta/checkout-ventas/seleccion"
            state={DASHBOARD_RETURN_NAV}
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
                  Elegí cómo querés cobrar: pasarela con tarjeta, Nequi y PSE, pasarela Mi Catálogo o WhatsApp.
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
          loading={salesLoading}
          amount={salesToday}
        />
        <SaldoCard
          saldoPath={saldoPath}
          periodo="semana"
          label={salesPeriodLabel}
          loading={salesLoading}
          amount={salesPeriodTotal}
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
        isActingAsStoreOwner &&
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

      {active && (
        <section className="space-y-3" aria-label="Catálogo público">
          <CompartirMiTiendaButton storeUrl={publicUrl} />
          {catalogoListo ? (
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
                <p className="font-medium tracking-tight">Ver tienda como cliente</p>
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
                <p className="font-medium tracking-tight">Ver tienda como cliente</p>
                <p className="mt-1 break-all text-[12px] leading-relaxed opacity-90">{publicUrl}</p>
              </div>
              <IconChevronRight size={17} className="shrink-0 opacity-70 transition group-hover:opacity-100" />
            </button>
          )}
          <Link
            to="/app/personalizar"
            className="group flex items-center gap-4 border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-5 no-underline transition duration-200 ease-in-out hover:border-neutral-300/70 hover:bg-neutral-50/50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-200/70 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-50 text-violet-700 shadow-[0_1px_3px_rgba(91,33,182,0.12)] transition group-hover:from-violet-200/80 group-hover:to-fuchsia-100/80">
              <IconMagicBrush size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium tracking-tight text-[var(--cat-text)]">Personalizar mi tienda</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cat-muted)]">
                Banner, logo y estilo del catálogo
              </p>
            </div>
            <IconChevronRight size={17} className="shrink-0 text-[var(--cat-muted)] opacity-60 transition group-hover:opacity-100" />
          </Link>
        </section>
      )}

      <footer className="space-y-2 pb-1 text-center">
        {plan === 'expert' && (
          <p className="text-[12px] leading-relaxed text-[var(--cat-muted)]">
            Membresía Expert hasta{' '}
            <span className="font-medium text-[var(--cat-text)]">
              {membershipExpiryLabel(tenant)}
            </span>
          </p>
        )}
        <a
          href="https://wa.me/573054411568"
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[12px] text-[var(--cat-muted)] underline decoration-neutral-300/80 underline-offset-[3px] transition hover:text-[var(--cat-text)] hover:decoration-neutral-400"
        >
          ¿Tienes dudas? Escríbenos
        </a>
      </footer>

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
        tenantId={effectiveTenantId}
        platformSettings={platformSettings}
      />
      <CheckoutEnvioRequiredModal
        open={envioRequiredModalOpen}
        onClose={() => setEnvioRequiredModalOpen(false)}
      />
    </div>
    </MobilePullToRefresh>
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
