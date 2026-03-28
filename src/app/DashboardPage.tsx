import { Link } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { billingPlanOf } from '@/lib/catalogTheme'
import { formatCop } from '@/lib/formatCop'
import { isSubscriptionActive } from '@/lib/subscription'
import { useTenantPedidosSales } from '@/hooks/useTenantPedidosSales'
import { IconCalendar, IconChevronRight, IconClipboard, IconCoins, IconLink, IconPlusCircle } from '@/icons/McIcons'

export function DashboardPage() {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const summaryPeriod = tenant?.salesSummaryPeriod === 'fortnight' ? 'fortnight' : 'week'
  const sales = useTenantPedidosSales(profile?.tenantId, summaryPeriod)

  if (!tenant || !profile) {
    return (
      <div className="mc-shell">
        <p className="ios-subhead">Cargando tu tienda…</p>
      </div>
    )
  }

  const active = isSubscriptionActive(tenant.subscriptionEndsAt)
  const publicUrl = `${window.location.origin}/c/${tenant.slug}`
  const plan = billingPlanOf(tenant)
  const hoyLabel = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="mc-shell space-y-6 pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[22px] border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] bg-gradient-to-br from-[color-mix(in_srgb,var(--cat-accent)_14%,var(--cat-bg)_86%)] via-[var(--cat-surface)] to-[color-mix(in_srgb,var(--cat-bg)_92%,var(--cat-muted)_8%)] px-5 py-6 shadow-[0_8px_30px_color-mix(in_srgb,var(--cat-text)_6%,transparent)] sm:px-7 sm:py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[var(--cat-muted)]">Tu tienda</p>
            <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[var(--cat-text)] sm:text-[30px]">
              {tenant.nombreTienda}
            </h1>
            <p className="mt-2 text-[15px] text-[var(--cat-muted)]">
              Hola, <span className="font-semibold text-[var(--cat-text)]">{profile.displayName || firebaseUser?.email}</span>
            </p>
            <p className="mt-1 text-[13px] capitalize text-[var(--cat-muted)]">{hoyLabel}</p>
          </div>
          <span
            className={`inline-flex shrink-0 self-start rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-wide ${
              plan === 'expert'
                ? 'bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] text-[var(--cat-accent)]'
                : 'bg-[color-mix(in_srgb,var(--cat-muted)_16%,var(--cat-surface)_84%)] text-[var(--cat-text)]'
            }`}
          >
            {plan === 'expert' ? 'Expert' : 'Free'}
          </span>
        </div>
      </section>

      {!active && (
        <div className="rounded-[14px] border border-ios-orange/35 bg-ios-orange/10 px-4 py-3.5 ios-footnote text-[var(--cat-text)]">
          Tu membresía expiró. Renová para que el catálogo público siga activo.
        </div>
      )}

      {/* Ventas */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <h2 className="text-[17px] font-bold tracking-tight text-[var(--cat-text)]">Resumen de ventas</h2>
          <Link
            to="/app/cuenta"
            className="text-[12px] font-semibold text-[var(--cat-accent)] hover:underline"
            title="Cambiar semana o quincena en Cuenta"
          >
            Período: {summaryPeriod === 'week' ? 'Semana' : 'Quincena'}
          </Link>
        </div>
        <p className="px-0.5 text-[13px] leading-snug text-[var(--cat-muted)]">
          Suma del <strong className="font-semibold text-[var(--cat-text)]">Total COP</strong> en pedidos anotados. Configurá
          semana o quincena en <Link to="/app/cuenta" className="font-semibold text-[var(--cat-accent)]">Cuenta</Link>.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-[18px] border border-[color-mix(in_srgb,var(--cat-accent)_22%,var(--cat-muted)_20%)] bg-[var(--cat-surface)] p-5 shadow-sm">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_12%,transparent)] blur-2xl" />
            <div className="relative flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--cat-accent)_16%,var(--cat-surface)_84%)] text-[var(--cat-accent)]">
                <IconCoins size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--cat-muted)]">Vendido hoy</p>
                {sales.loading ? (
                  <div className="mt-3 h-9 w-36 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--cat-muted)_15%,transparent)]" />
                ) : (
                  <p className="mt-2 break-words text-[26px] font-bold tabular-nums leading-none tracking-tight text-[var(--cat-text)] sm:text-[28px]">
                    {formatCop(sales.today)}
                  </p>
                )}
                <p className="mt-2 text-[12px] text-[var(--cat-muted)]">Desde medianoche (hora del dispositivo)</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[18px] border border-[color-mix(in_srgb,var(--cat-muted)_28%,transparent)] bg-[var(--cat-surface)] p-5 shadow-sm">
            <div className="absolute -left-4 -bottom-8 h-28 w-28 rounded-full bg-[color-mix(in_srgb,var(--cat-muted)_10%,transparent)] blur-2xl" />
            <div className="relative flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--cat-muted)_14%,var(--cat-surface)_86%)] text-[var(--cat-text)]">
                <IconCalendar size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
                  {sales.periodLabel}
                </p>
                {sales.loading ? (
                  <div className="mt-3 h-9 w-36 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--cat-muted)_15%,transparent)]" />
                ) : (
                  <p className="mt-2 break-words text-[26px] font-bold tabular-nums leading-none tracking-tight text-[var(--cat-text)] sm:text-[28px]">
                    {formatCop(sales.periodTotal)}
                  </p>
                )}
                <p className="mt-2 text-[12px] leading-snug text-[var(--cat-muted)]">{sales.periodSub}</p>
              </div>
            </div>
          </div>
        </div>

        {!sales.loading && sales.today === 0 && sales.periodTotal === 0 && (
          <p className="rounded-[12px] border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_35%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_70%,var(--cat-surface)_30%)] px-3 py-2.5 text-[12px] leading-relaxed text-[var(--cat-muted)]">
            Aún no hay montos registrados. En <Link to="/app/pedidos" className="font-semibold text-[var(--cat-accent)]">Pedidos</Link>{' '}
            completá <strong className="text-[var(--cat-text)]">Total COP</strong> al guardar cada venta.
          </p>
        )}
      </section>

      {/* Acciones rápidas */}
      <section className="space-y-2">
        <h2 className="px-0.5 text-[15px] font-bold text-[var(--cat-text)]">Acciones rápidas</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Link
            to="/app/inventario"
            className="group flex items-center gap-4 rounded-[16px] border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] bg-[var(--cat-surface)] px-4 py-4 shadow-sm transition active:scale-[0.99] hover:border-[color-mix(in_srgb,var(--cat-accent)_35%,var(--cat-muted)_65%)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--cat-accent)_14%,var(--cat-surface)_86%)] text-[var(--cat-accent)] transition group-hover:bg-[color-mix(in_srgb,var(--cat-accent)_20%,var(--cat-surface)_80%)]">
              <IconPlusCircle size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--cat-text)]">Inventario</p>
              <p className="text-[13px] text-[var(--cat-muted)]">Agregar o editar artículos</p>
            </div>
            <IconChevronRight size={18} className="shrink-0 text-[var(--cat-muted)]" />
          </Link>
          <Link
            to="/app/pedidos"
            className="group flex items-center gap-4 rounded-[16px] border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] bg-[var(--cat-surface)] px-4 py-4 shadow-sm transition active:scale-[0.99] hover:border-[color-mix(in_srgb,var(--cat-accent)_35%,var(--cat-muted)_65%)]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--cat-muted)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)]">
              <IconClipboard size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--cat-text)]">Pedidos</p>
              <p className="text-[13px] text-[var(--cat-muted)]">Anotar ventas y totales</p>
            </div>
            <IconChevronRight size={18} className="shrink-0 text-[var(--cat-muted)]" />
          </Link>
        </div>
      </section>

      {active && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-4 rounded-[16px] border border-[color-mix(in_srgb,var(--cat-accent)_28%,var(--cat-muted)_20%)] bg-[color-mix(in_srgb,var(--cat-accent)_6%,var(--cat-surface)_94%)] px-4 py-4 shadow-sm transition hover:border-[color-mix(in_srgb,var(--cat-accent)_45%,transparent)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--cat-accent)_15%,var(--cat-surface)_85%)] text-[var(--cat-accent)]">
            <IconLink size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--cat-text)]">Ver catálogo público</p>
            <p className="break-all text-[13px] font-medium text-[var(--cat-accent)]">{publicUrl}</p>
          </div>
          <IconChevronRight size={18} className="shrink-0 text-[var(--cat-accent)]" />
        </a>
      )}

      <div className="rounded-[14px] border border-[color-mix(in_srgb,var(--cat-muted)_20%,transparent)] bg-[var(--cat-surface)] px-4 py-3.5 text-[14px] text-[var(--cat-muted)]">
        <p>
          Membresía hasta{' '}
          <strong className="font-semibold text-[var(--cat-text)]">
            {new Date(tenant.subscriptionEndsAt).toLocaleDateString('es-CO')}
          </strong>
        </p>
        {tenant.whatsappNumero && (
          <p className="mt-1.5">
            WhatsApp pedidos:{' '}
            <strong className="font-semibold text-[var(--cat-text)]">{tenant.whatsappNumero}</strong>
          </p>
        )}
      </div>

      {profile.isSuperAdmin && (
        <Link
          to="/superadmin"
          className="block rounded-[14px] border border-[color-mix(in_srgb,var(--cat-accent)_25%,transparent)] bg-[var(--cat-surface)] px-4 py-3.5 text-center text-[15px] font-semibold text-[var(--cat-accent)] transition hover:bg-[color-mix(in_srgb,var(--cat-accent)_6%,var(--cat-surface)_94%)]"
        >
          Panel súper admin
        </Link>
      )}
    </div>
  )
}
