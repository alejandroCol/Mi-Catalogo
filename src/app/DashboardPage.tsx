import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { billingPlanOf } from '@/lib/catalogTheme'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import {
  explicitCheckoutVentasModo,
  hasCheckoutVentasModoSelected,
} from '@/lib/checkoutVentasModo'
import { CatalogPublishPanel } from '@/components/catalog/CatalogPublishPanel'
import { CatalogPublishStatusBadge } from '@/components/catalog/CatalogPublishStatusBadge'
import { isCatalogPubliclyAccessible } from '@/lib/catalogPublish'
import { hasExpertFeatureAccess, hasLiveFeatureAccess, ownerPlanEleganceLabel } from '@/lib/billingAccess'
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
  IconLive,
  IconMagicBrush,
  IconNetwork,
  IconPlusCircle,
  IconPosTerminal,
} from '@/icons/McIcons'
import { CheckoutEnvioRequiredModal } from '@/app/CheckoutEnvioRequiredModal'
import { CheckoutVentasRequiredModal } from '@/app/CheckoutVentasRequiredModal'
import { NewStoreExpertBanner } from '@/components/onboarding/NewStoreExpertBanner'
import { NewStoreReadyToShareCard } from '@/components/onboarding/NewStoreReadyToShareCard'
import { NewStoreSetupChecklist } from '@/components/onboarding/NewStoreSetupChecklist'
import { OnboardingExpertRewardCard } from '@/components/onboarding/OnboardingExpertRewardCard'
import { CompartirMiTiendaButton } from '@/components/dashboard/CompartirMiTiendaButton'
import { AdminWhatsNewPromo } from '@/components/admin/AdminWhatsNewPromo'
import { MobilePullToRefresh } from '@/components/MobilePullToRefresh'
import { mcSupportWhatsappUrl } from '@/lib/mcSupportContact'
import { useOnboardingRewardWindow } from '@/hooks/useOnboardingRewardWindow'
import { DASHBOARD_RETURN_NAV, type ConfigSubpageNavState } from '@/app/configuraciones/configSubpageNav'
import {
  isNewStoreChecklistEligible,
  isNewStoreExpertPromoBannerVisible,
  isNewStoreExpertPromoEnabled,
  shouldShowNewStoreReadyToSharePrompt,
} from '@/lib/newStoreOnboarding'

export function DashboardPage() {
  const { profile, tenant, loading, effectiveTenantId, isActingAsStoreOwner } = useMcAuth()
  const location = useLocation()
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
  const catalogoPublico = tenant ? isCatalogPubliclyAccessible(tenant) : false
  const masterLive = hasLiveFeatureAccess(tenant)
  const expertPaused =
    tenant &&
    hasExpertFeatureAccess(tenant) === false &&
    (tenant.billingPlan === 'expert' || tenant.billingPlan === 'master') &&
    tenant.catalogPublished === true &&
    !catalogoPublico &&
    !tenant.catalogPublishGrandfathered

  const loadOnepayBalancePreview = useCallback(async () => {
    const modo = explicitCheckoutVentasModo(tenant)
    if (
      !tenant ||
      !profile ||
      !isActingAsStoreOwner ||
      !isTenantMembershipActive(tenant) ||
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
    if (
      modo === 'pasarela_micatalogo' &&
      (!platformSettingsReady || platformSettings?.pasarelaMicatalogoActiva !== true)
    ) {
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
  }, [tenant, profile, isActingAsStoreOwner, platformSettings, platformSettingsReady])

  useEffect(() => {
    void loadOnepayBalancePreview()
  }, [loadOnepayBalancePreview])

  useEffect(() => {
    const state = (location.state ?? null) as ConfigSubpageNavState | null
    const targetId = state?.scrollTo
    if (!targetId) return

    const timer = window.setTimeout(() => {
      const el = document.getElementById(targetId)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('mc-publish-return-highlight')
      window.setTimeout(() => el.classList.remove('mc-publish-return-highlight'), 2400)
    }, 120)

    return () => window.clearTimeout(timer)
  }, [location.key, location.state])

  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      reloadSales(),
      reloadTodayVisits(),
      reloadPlatformSettings(),
      loadOnepayBalancePreview(),
    ])
  }, [reloadSales, reloadTodayVisits, reloadPlatformSettings, loadOnepayBalancePreview])

  const { nowMs } = useOnboardingRewardWindow(tenant)

  if (loading || !tenant || !profile) {
    return (
      <div className="mc-shell flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900" aria-hidden />
        <p className="ios-subhead text-mc-600">Cargando tu tienda…</p>
      </div>
    )
  }

  const publicUrl = buildStorePublicUrl(tenant.slug)
  const plan = billingPlanOf(tenant)
  const planBadgeClass =
    plan === 'free'
      ? 'border-neutral-200/70 text-[var(--cat-muted)]'
      : 'border-[color-mix(in_srgb,var(--cat-text)_15%,transparent)] text-[var(--cat-text)]'
  const hoyLabel = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const checkoutModo = explicitCheckoutVentasModo(tenant)
  const saldoPath =
    checkoutModo === 'pasarela' || checkoutModo === 'pasarela_micatalogo' ? '/app/mi-saldo' : null
  const showOnepayEnableCta =
    isActingAsStoreOwner && !hasCheckoutVentasModoSelected(tenant)

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
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cat-muted)]">
          Tu tienda
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[1.65rem] font-medium leading-[1.15] tracking-tighter text-[var(--cat-text)] sm:text-[2rem]">
              {tenant.nombreTienda}
            </h1>
            <p className="mt-2 text-[13px] capitalize leading-relaxed text-[var(--cat-muted)]">
              {hoyLabel}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
            <span
              className={`inline-flex border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] sm:px-3 sm:py-1 sm:text-[11px] ${planBadgeClass}`}
            >
              {ownerPlanEleganceLabel(tenant, platformSettings)}
            </span>
            <AdminWhatsNewPromo tenant={tenant} />
          </div>
        </div>
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

      {expertPaused ? (
        <div className="border border-amber-200/60 bg-amber-50/50 px-5 py-4 text-[13px] leading-relaxed text-amber-950">
          Tu membresía Expert venció y tu tienda fue despublicada. Renová el plan para volver a publicar.
        </div>
      ) : null}

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
            className="mc-dash-tile group"
          >
            <div className="relative flex w-full items-start gap-3.5">
              <span className="mc-dash-tile-icon mc-dash-tile-icon--pay">
                <IconBankCard size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="mc-dash-tile-kicker">
                  <span className="mc-dash-tile-kicker-dot" aria-hidden />
                  Cobros online
                </p>
                <p className="ios-headline mt-1 leading-snug">
                  Habilitar pagos con tarjeta, Nequi y PSE
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--cat-muted)]">
                  Elegí cómo querés cobrar: pasarela con tarjeta, Nequi y PSE, pasarela Mi Catálogo o WhatsApp.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['Tarjeta', 'Nequi', 'PSE'].map((m) => (
                    <span key={m} className="mc-dash-tile-chip">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <IconChevronRight size={16} className="mc-dash-tile-chevron mt-2" />
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
        <Link to="/app/estadisticas" className="mc-dash-tile group">
          <div className="relative flex w-full items-center gap-3.5">
            <span className="mc-dash-tile-icon mc-dash-tile-icon--stats">
              <IconChartBars size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="ios-headline leading-snug">Visitas a tu catálogo</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cat-muted)]">
                Actividad de hoy en tu tienda
              </p>
            </div>
            <div className="shrink-0 text-right">
              {visitsLoading ? (
                <div className="ml-auto h-8 w-10 animate-pulse rounded-md bg-[#f3f0ea]" />
              ) : (
                <>
                  <p className="text-[1.65rem] font-semibold tabular-nums leading-none tracking-tighter text-[var(--cat-text)]">
                    {todayVisits ?? 0}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[var(--cat-muted)]">hoy</p>
                </>
              )}
            </div>
            <IconChevronRight size={16} className="mc-dash-tile-chevron" />
          </div>
        </Link>
      </section>

      {isActingAsStoreOwner &&
        isTenantMembershipActive(tenant) &&
        ((checkoutModo === 'pasarela_micatalogo' &&
          platformSettingsReady &&
          platformSettings?.pasarelaMicatalogoActiva === true) ||
          (checkoutModo === 'pasarela' && tenant.onepayPaymentsEnabled === true)) && (
        <section aria-label="Dinero en pasarela">
          <Link
            to={checkoutModo === 'pasarela_micatalogo' ? '/app/mi-saldo' : '/app/pagos-pasarela/onepay'}
            className="mc-dash-tile group"
          >
            <div className="relative flex w-full items-center gap-3.5">
              <span className="mc-dash-tile-icon mc-dash-tile-icon--pay">
                <IconBankCard size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="mc-dash-tile-kicker">
                  {checkoutModo === 'pasarela_micatalogo' ? 'Pasarela Mi Catálogo' : 'Pasarela OnePay'}
                </p>
                <p className="ios-headline mt-0.5 leading-snug">
                  {checkoutModo === 'pasarela_micatalogo' ? 'Saldo de tus ventas' : 'Dinero en pasarela'}
                </p>
              </div>
              <div className="min-w-0 max-w-[45%] shrink-0 text-right">
                {onepayBalancePreviewLoading ? (
                  <div className="ml-auto h-7 w-24 animate-pulse rounded-md bg-[#f3f0ea]" />
                ) : (
                  <p className="break-words text-[1.15rem] font-semibold tabular-nums leading-tight tracking-tight text-[var(--cat-text)]">
                    {onepayBalancePreview ?? 'Ver cobros'}
                  </p>
                )}
              </div>
              <IconChevronRight size={16} className="mc-dash-tile-chevron" />
            </div>
          </Link>
        </section>
      )}

      <Link to="/pos/admin" className="mc-dash-tile group">
        <div className="relative flex w-full items-center gap-3.5">
          <span className="mc-dash-tile-icon mc-dash-tile-icon--pos">
            <IconPosTerminal size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="ios-headline leading-snug">Mi Catálogo POS</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cat-muted)]">
              Punto de venta, caja, sedes y reportes
            </p>
          </div>
          <IconChevronRight size={16} className="mc-dash-tile-chevron" />
        </div>
      </Link>

      {masterLive ? (
        <Link
          to="/app/live"
          className="group flex items-center gap-4 border border-neutral-200/50 bg-gradient-to-r from-[#1c1b1f] to-[#2a2930] px-5 py-5 no-underline transition duration-200 ease-in-out hover:opacity-95"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
            <IconLive size={22} />
            <span className="mc-live-pulse-dot absolute -right-0.5 -top-0.5 scale-75" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium tracking-tight text-white">Vender en vivo</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-white/65">
              Transmití y vendé en tiempo real con chat interactivo
            </p>
          </div>
          <IconChevronRight size={17} className="shrink-0 text-white/50 transition group-hover:text-white/80" />
        </Link>
      ) : null}

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
        <Link
          to="/app/proveedores"
          className="group flex items-center gap-4 border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-5 no-underline transition duration-200 ease-in-out hover:border-neutral-300/70 hover:bg-neutral-50/50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200/60 text-[var(--cat-text)]">
            <IconNetwork size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium tracking-tight text-[var(--cat-text)]">Proveedores</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cat-muted)]">
              Importá sin stock o vendé a otras tiendas
            </p>
          </div>
          <IconChevronRight size={17} className="shrink-0 text-[var(--cat-muted)] opacity-60 transition group-hover:opacity-100" />
        </Link>
      </section>

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

      <section
        id="publicar-tienda"
        className="space-y-3 border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-5 transition-shadow duration-700 sm:px-6 sm:py-6"
        aria-label="Publicar tu tienda"
      >
        {catalogoPublico ? (
          <>
            <CatalogPublishStatusBadge tenant={tenant} />
            <CompartirMiTiendaButton storeUrl={publicUrl} />
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-4 border border-neutral-200/45 bg-[var(--cat-accent)] px-4 py-4 text-[var(--cat-accent-text)] no-underline transition duration-200 ease-in-out hover:opacity-90 sm:px-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/25 text-[var(--cat-accent-text)]">
                <IconLink size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium tracking-tight">Ver tienda publicada</p>
                <p className="mt-0.5 break-all text-[11px] leading-relaxed opacity-90">{publicUrl}</p>
              </div>
              <IconChevronRight size={16} className="shrink-0 opacity-70 transition group-hover:opacity-100" />
            </a>
          </>
        ) : (
          <CatalogPublishPanel
            tenant={tenant}
            platformSettings={platformSettings}
            catalogoUrl={publicUrl}
            variant="home"
          />
        )}
      </section>

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
          href={mcSupportWhatsappUrl('Hola, tengo una duda sobre mi tienda en Mi Catálogo')}
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
