import { Link } from 'react-router-dom'
import {
  IconChevronRight,
  IconLink,
  IconWhatsApp,
} from '@/icons/McIcons'
import { billingPlanOf } from '@/lib/catalogTheme'
import { isPaidBillingPlan } from '@/lib/billingPlan'
import { buildStorePublicUrl, formatStorePublicUrlLabel } from '@/lib/storePublicUrl'
import { isTenantMembershipActive } from '@/lib/subscription'
import { formatPlatformTermsVersionLabel } from '@/lib/platformTerms'
import { buildSuperAdminFollowUpWhatsappUrl } from '@/superadmin/buildSuperAdminFollowUpWhatsapp'
import {
  ASSIGN_PLAN_OPTIONS,
  type AssignPlanDuration,
  type AssignPlanProduct,
} from '@/superadmin/tenantAdminActions'
import { tenantPlanLabel } from '@/superadmin/tenantDisplayUtils'
import { tenantIsFreePlan } from '@/superadmin/tenantPlanFilters'
import type { TenantOverviewRow } from '@/superadmin/fetchTenantsOverview'
import type { McPlatformSettings } from '@/types/mc'

type Props = {
  row: TenantOverviewRow
  busy: boolean
  assigning: { duration: AssignPlanDuration; product: AssignPlanProduct } | null
  onAssignPlan: (tenantId: string, product: AssignPlanProduct, duration: AssignPlanDuration) => void
  onShowProducts: (row: TenantOverviewRow) => void
  platformSettings: McPlatformSettings | null
}

function AssignPlanButtons({
  product,
  label,
  tenantId,
  busy,
  assigning,
  onAssign,
  buttonClassName,
}: {
  product: AssignPlanProduct
  label: string
  tenantId: string
  busy: boolean
  assigning: Props['assigning']
  onAssign: Props['onAssignPlan']
  buttonClassName: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-mc-500">{label}</span>
      {ASSIGN_PLAN_OPTIONS.map((option) => {
        const isAssigning = busy && assigning?.product === product && assigning.duration === option.id
        return (
          <button
            key={`${product}-${option.id}`}
            type="button"
            disabled={busy}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition disabled:opacity-50 ${buttonClassName}`}
            onClick={() => onAssign(tenantId, product, option.id)}
          >
            {isAssigning ? '…' : option.label}
          </button>
        )
      })}
    </div>
  )
}

export function TenantOverviewListItem({
  row,
  busy,
  assigning,
  onAssignPlan,
  onShowProducts,
  platformSettings,
}: Props) {
  const t = row.tenant
  const active = isTenantMembershipActive(t)
  const publicUrl = buildStorePublicUrl(t.slug)
  const urlLabel = formatStorePublicUrlLabel(t.slug)
  const followUpUrl = tenantIsFreePlan(row)
    ? buildSuperAdminFollowUpWhatsappUrl(t.whatsappNumero, t.nombreTienda, platformSettings)
    : null
  const productLabel = `${row.productCount} producto${row.productCount === 1 ? '' : 's'}`

  return (
    <li>
      <article className="mc-card overflow-hidden transition hover:border-mc-300/60">
        <div className="px-4 py-4 sm:px-5">
          <Link
            to={`/superadmin/tienda/${t.id}`}
            className="flex items-start gap-3 no-underline transition hover:opacity-80"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="ios-headline truncate text-mc-900">{t.nombreTienda}</p>
                  <p className="mt-0.5 truncate font-mono text-[12px] text-mc-500">{urlLabel}</p>
                </div>
                <IconChevronRight size={20} className="mt-0.5 shrink-0 text-mc-300" aria-hidden />
              </div>
            </div>
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                  active ? 'border-neutral-200/80 text-mc-800' : 'border-neutral-200/60 text-mc-500'
                }`}
              >
                {active ? 'Activa' : 'Vencida'}
              </span>
              <span
                className={`border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                  isPaidBillingPlan(billingPlanOf(t))
                    ? billingPlanOf(t) === 'master'
                      ? 'border-violet-300/80 text-violet-900'
                      : 'border-mc-900/25 text-mc-900'
                    : 'border-neutral-200/70 text-mc-600'
                }`}
              >
                {billingPlanOf(t) === 'master'
                  ? 'Master'
                  : billingPlanOf(t) === 'expert'
                    ? 'Expert'
                    : 'Free'}
              </span>
              {t.subscriptionPlan ? (
                <span className="border border-neutral-200/70 px-2 py-0.5 text-[11px] font-medium text-mc-700">
                  {tenantPlanLabel(t.subscriptionPlan)}
                </span>
              ) : null}
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
              {t.platformTermsAcceptedAt ? (
                <span
                  className="border border-violet-200/90 bg-violet-50/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-violet-950"
                  title={`Aceptó T&C ${formatPlatformTermsVersionLabel(t.platformTermsVersion)}`}
                >
                  T&C {formatPlatformTermsVersionLabel(t.platformTermsVersion)}
                </span>
              ) : (
                <span className="border border-neutral-200/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-mc-500">
                  Sin T&C
                </span>
              )}
              <button
                type="button"
                className="ios-footnote rounded-md border border-transparent px-1.5 py-0.5 text-mc-700 underline decoration-mc-300 underline-offset-2 transition hover:border-mc-200/80 hover:bg-mc-50 hover:text-mc-900 disabled:cursor-default disabled:no-underline disabled:opacity-60"
                disabled={row.productCount === 0}
                title={row.productCount > 0 ? 'Ver productos' : undefined}
                onClick={() => {
                  if (row.productCount > 0) onShowProducts(row)
                }}
              >
                {productLabel}
              </button>
              <span className="ios-footnote text-mc-600">
                · {row.pedidosCount} pedido{row.pedidosCount === 1 ? '' : 's'}
              </span>
            </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-mc-100/90 bg-mc-50/30 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="group inline-flex min-w-0 items-center gap-2.5 rounded-lg border border-mc-200/90 bg-white px-3 py-2 text-[13px] font-medium text-mc-900 no-underline shadow-sm transition hover:border-mc-300 hover:bg-mc-50 sm:max-w-[min(100%,22rem)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-mc-900 text-white">
                <IconLink size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">Ver tienda</span>
                <span className="mt-0.5 block truncate font-mono text-[11px] font-normal text-mc-500">
                  {urlLabel}
                </span>
              </span>
            </a>
            {tenantIsFreePlan(row) ? (
              followUpUrl ? (
                <a
                  href={followUpUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex min-w-0 items-center gap-2.5 rounded-lg border border-emerald-300/80 bg-emerald-50/80 px-3 py-2 text-[13px] font-semibold text-emerald-950 no-underline shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100/80 sm:max-w-[min(100%,20rem)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#25D366] text-white">
                    <IconWhatsApp size={16} monochrome />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold">Hacer seguimiento</span>
                    <span className="mt-0.5 block truncate text-[11px] font-normal text-emerald-900/75">
                      WhatsApp · mensaje de Lina
                    </span>
                  </span>
                </a>
              ) : (
                <span
                  className="inline-flex items-center gap-2 rounded-lg border border-mc-200/70 bg-mc-50/60 px-3 py-2 text-[12px] text-mc-500"
                  title="Agregá WhatsApp en la tienda para hacer seguimiento"
                >
                  <IconWhatsApp size={16} className="opacity-40" />
                  Sin WhatsApp
                </span>
              )
            ) : null}
          </div>

          <div
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <AssignPlanButtons
              product="expert"
              label="Expert"
              tenantId={t.id}
              busy={busy}
              assigning={assigning}
              onAssign={onAssignPlan}
              buttonClassName="border-mc-200/90 bg-white text-mc-900 hover:border-mc-900/20 hover:bg-mc-50"
            />
            <AssignPlanButtons
              product="master"
              label="Master"
              tenantId={t.id}
              busy={busy}
              assigning={assigning}
              onAssign={onAssignPlan}
              buttonClassName="border-violet-300/80 bg-violet-50/80 text-violet-950 hover:border-violet-400 hover:bg-violet-100/80"
            />
          </div>
        </div>
      </article>
    </li>
  )
}
