import { Link } from 'react-router-dom'
import { billingPlanOf } from '@/lib/catalogTheme'
import { formatCop } from '@/lib/formatCop'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import { isCatalogPubliclyAccessible } from '@/lib/catalogPublish'
import { membershipExpiryLabel } from '@/lib/subscription'
import { CatalogPublishStatusBadge } from '@/components/catalog/CatalogPublishStatusBadge'
import { CompartirMiTiendaButton } from '@/components/dashboard/CompartirMiTiendaButton'
import {
  IconBankCard,
  IconChartBars,
  IconChevronRight,
  IconClipboard,
  IconLink,
  IconMagicBrush,
  IconPlusCircle,
} from '@/icons/McIcons'
import { useDemoAdmin } from '@/vendedor/demo-admin/DemoAdminContext'
import { demoAdminPath } from '@/vendedor/demo-admin/demoAdminPaths'

export function DemoAdminDashboardPage() {
  const {
    demo,
    tenant,
    salesToday,
    salesPeriodTotal,
    salesPeriodLabel,
    todayVisits,
    onepayBalancePreview,
  } = useDemoAdmin()

  const publicUrl = buildStorePublicUrl(tenant.slug)
  const plan = billingPlanOf(tenant)
  const catalogoPublico = isCatalogPubliclyAccessible(tenant)
  const hoyLabel = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="mc-shell space-y-6 sm:space-y-8">
      <section className="border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cat-muted)]">Tu tienda</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1 className="min-w-0 text-[1.65rem] font-medium leading-[1.15] tracking-tighter text-[var(--cat-text)] sm:text-[2rem]">
            {tenant.nombreTienda}
          </h1>
          <span
            className={`inline-flex shrink-0 border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] sm:px-3 sm:py-1 sm:text-[11px] ${
              plan === 'expert'
                ? 'border-[color-mix(in_srgb,var(--cat-text)_15%,transparent)] text-[var(--cat-text)]'
                : 'border-neutral-200/70 text-[var(--cat-muted)]'
            }`}
          >
            {plan === 'expert' ? 'Expert' : 'Free'}
          </span>
        </div>
        <p className="mt-2 text-[13px] capitalize leading-relaxed text-[var(--cat-muted)]">{hoyLabel}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        <SaldoCard label="Vendido hoy" amount={salesToday} />
        <SaldoCard label={salesPeriodLabel} amount={salesPeriodTotal} />
      </section>

      <section aria-label="Visitas al catálogo">
        <Link to={demoAdminPath(demo.id, 'estadisticas')} className="mc-dash-tile group">
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
              <p className="text-[1.65rem] font-semibold tabular-nums leading-none tracking-tighter text-[var(--cat-text)]">
                {todayVisits}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[var(--cat-muted)]">hoy</p>
            </div>
            <IconChevronRight size={16} className="mc-dash-tile-chevron" />
          </div>
        </Link>
      </section>

      <section aria-label="Dinero en pasarela">
        <div className="group flex w-full items-start gap-4 border border-neutral-200/55 bg-[var(--cat-surface)] px-5 py-6 text-left shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_5%,transparent)] sm:px-7 sm:py-7">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--cat-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--cat-surface)_90%,var(--cat-accent))] text-[var(--cat-text)]">
            <IconBankCard size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
              Pasarela Mi Catálogo
            </p>
            <p className="mt-1.5 text-[17px] font-medium leading-snug tracking-tight text-[var(--cat-text)]">
              Saldo de tus ventas
            </p>
            <p className="mt-2 break-words text-[1.35rem] font-medium tabular-nums leading-none tracking-tight text-[var(--cat-text)]">
              {onepayBalancePreview}
            </p>
          </div>
          <IconChevronRight size={18} className="relative mt-1 shrink-0 text-[var(--cat-muted)] opacity-40" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[15px] font-medium tracking-tight text-[var(--cat-text)]">Acciones rápidas</h2>
        <div className="grid grid-cols-1 divide-y divide-neutral-200/50 border border-neutral-200/50 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <Link
            to={demoAdminPath(demo.id, 'inventario')}
            className="group flex items-center gap-4 bg-[var(--cat-surface)] px-5 py-5 transition duration-200 ease-in-out hover:bg-neutral-50/50 no-underline"
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
            to={demoAdminPath(demo.id, 'pedidos')}
            className="group flex items-center gap-4 bg-[var(--cat-surface)] px-5 py-5 transition duration-200 ease-in-out hover:bg-neutral-50/50 no-underline"
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

      <div className="group flex items-center gap-4 border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-5 opacity-90">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-200/70 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-50 text-violet-700">
          <IconMagicBrush size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium tracking-tight text-[var(--cat-text)]">Personalizar mi tienda</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cat-muted)]">Banner, logo y estilo del catálogo</p>
        </div>
      </div>

      <section
        id="publicar-tienda"
        className="space-y-3 border border-neutral-200/50 bg-[var(--cat-surface)] px-5 py-5 sm:px-6 sm:py-6"
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
        ) : null}
      </section>

      <footer className="space-y-2 pb-1 text-center">
        {plan === 'expert' && (
          <p className="text-[12px] leading-relaxed text-[var(--cat-muted)]">
            Membresía Expert hasta{' '}
            <span className="font-medium text-[var(--cat-text)]">{membershipExpiryLabel(tenant)}</span>
          </p>
        )}
        <p className="text-[12px] text-[var(--cat-muted)]">
          Demo presencial · volvé al{' '}
          <Link to="/vendedor" className="font-medium text-[var(--cat-text)] underline underline-offset-2">
            panel vendedor
          </Link>
        </p>
      </footer>
    </div>
  )
}

function SaldoCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="border border-neutral-200/50 bg-[var(--cat-surface)] p-5 sm:p-7">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)] sm:text-[13px]">
        {label}
      </p>
      <p className="mt-2 break-words text-[1.45rem] font-medium tabular-nums leading-none tracking-tighter text-[var(--cat-text)] sm:mt-3 sm:text-[2rem]">
        {formatCop(amount)}
      </p>
    </div>
  )
}
