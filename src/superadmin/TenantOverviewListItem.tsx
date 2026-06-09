import { Link } from 'react-router-dom'
import {
  IconChevronRight,
  IconLink,
} from '@/icons/McIcons'
import { billingPlanOf } from '@/lib/catalogTheme'
import { buildStorePublicUrl, formatStorePublicUrlLabel } from '@/lib/storePublicUrl'
import { isTenantMembershipActive } from '@/lib/subscription'
import { formatPlatformTermsVersionLabel } from '@/lib/platformTerms'
import { ASSIGN_PLAN_OPTIONS, type AssignPlanDuration } from '@/superadmin/tenantAdminActions'
import { tenantPlanLabel } from '@/superadmin/tenantDisplayUtils'
import type { TenantOverviewRow } from '@/superadmin/fetchTenantsOverview'

type Props = {
  row: TenantOverviewRow
  busy: boolean
  assigningId: AssignPlanDuration | null
  onAssignPlan: (tenantId: string, duration: AssignPlanDuration) => void
}

export function TenantOverviewListItem({ row, busy, assigningId, onAssignPlan }: Props) {
  const t = row.tenant
  const active = isTenantMembershipActive(t)
  const publicUrl = buildStorePublicUrl(t.slug)
  const urlLabel = formatStorePublicUrlLabel(t.slug)

  return (
    <li>
      <article className="mc-card overflow-hidden transition hover:border-mc-300/60">
        <Link
          to={`/superadmin/tienda/${t.id}`}
          className="flex items-start gap-3 px-4 py-4 no-underline transition hover:bg-mc-50/40 sm:px-5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="ios-headline truncate text-mc-900">{t.nombreTienda}</p>
                <p className="mt-0.5 truncate font-mono text-[12px] text-mc-500">{urlLabel}</p>
              </div>
              <IconChevronRight size={20} className="mt-0.5 shrink-0 text-mc-300" aria-hidden />
            </div>

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
                  billingPlanOf(t) === 'expert'
                    ? 'border-mc-900/25 text-mc-900'
                    : 'border-neutral-200/70 text-mc-600'
                }`}
              >
                {billingPlanOf(t) === 'expert' ? 'Expert' : 'Free'}
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
              <span className="ios-footnote text-mc-600">
                {row.productCount} prod. · {row.pedidosCount} ped.
              </span>
            </div>
          </div>
        </Link>

        <div className="flex flex-col gap-3 border-t border-mc-100/90 bg-mc-50/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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

          <div
            className="flex flex-wrap items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-mc-500">
              Asignar Expert
            </span>
            {ASSIGN_PLAN_OPTIONS.map((option) => {
              const isAssigning = busy && assigningId === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={busy}
                  className="rounded-lg border border-mc-200/90 bg-white px-3 py-1.5 text-[13px] font-medium text-mc-900 transition hover:border-mc-900/20 hover:bg-mc-50 disabled:opacity-50"
                  onClick={() => onAssignPlan(t.id, option.id)}
                >
                  {isAssigning ? '…' : option.label}
                </button>
              )
            })}
          </div>
        </div>
      </article>
    </li>
  )
}
