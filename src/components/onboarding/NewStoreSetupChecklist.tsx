import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { DASHBOARD_RETURN_NAV } from '@/app/configuraciones/configSubpageNav'
import {
  buildNewStoreChecklist,
  isNewStoreChecklistComplete,
  newStoreChecklistProgress,
} from '@/lib/newStoreOnboarding'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import type { McPlatformSettings, McTenant } from '@/types/mc'
import { IconChevronRight } from '@/icons/McIcons'

type Props = {
  tenant: McTenant
  platformSettings: McPlatformSettings | null
  platformSettingsReady?: boolean
  hasProducts: boolean
  expertPromoEnabled?: boolean
  onCompleted?: (rewardCode: string | null) => void
}

export function NewStoreSetupChecklist({
  tenant,
  platformSettings,
  platformSettingsReady = platformSettings !== null,
  hasProducts,
  expertPromoEnabled = true,
  onCompleted,
}: Props) {
  const items = useMemo(
    () =>
      buildNewStoreChecklist(tenant, platformSettings, hasProducts, {
        platformSettingsReady,
      }),
    [tenant, platformSettings, hasProducts, platformSettingsReady],
  )
  const progress = newStoreChecklistProgress(items)
  const allDone = isNewStoreChecklistComplete(items)
  const [finalizing, setFinalizing] = useState(false)
  const [rewardCode, setRewardCode] = useState<string | null>(tenant.onboardingExpertRewardCode ?? null)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const finalizeAttempted = useRef(false)

  useEffect(() => {
    if (!allDone || finalizeAttempted.current || !firebaseConfigured) return
    finalizeAttempted.current = true
    setFinalizing(true)
    setFinalizeError(null)
    void (async () => {
      try {
        const fn = httpsCallable(getFirebaseFunctions(), 'mcFinalizeNewStoreOnboarding')
        const res = await fn({})
        const data = res.data as {
          rewardCode?: string | null
          rewardEligible?: boolean
        }
        const code = data.rewardCode ?? null
        setRewardCode(code)
        onCompleted?.(code)
      } catch (e) {
        finalizeAttempted.current = false
        setFinalizeError((e as { message?: string }).message ?? 'No se pudo guardar el progreso.')
      } finally {
        setFinalizing(false)
      }
    })()
  }, [allDone, onCompleted])

  return (
    <section
      id="new-store-checklist"
      aria-label="Checklist para empezar a vender"
      className="scroll-mt-4 overflow-hidden rounded-2xl border border-neutral-200/60 bg-[var(--cat-surface)] shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_4%,transparent)]"
    >
      <div className="border-b border-neutral-200/50 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
              Primeros pasos
            </p>
            <h2 className="mt-1 text-[1.1rem] font-medium tracking-tight text-[var(--cat-text)] sm:text-[1.2rem]">
              Checklist para empezar a vender
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)] sm:text-[13px]">
              {expertPromoEnabled
                ? 'Completá los 4 pasos. Si terminás en 24 h, desbloqueás Expert gratis.'
                : 'Completá los 4 pasos para dejar tu tienda lista para vender.'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[22px] font-medium tabular-nums leading-none tracking-tight text-[var(--cat-text)] sm:text-[1.35rem]">
              {progress.done}
              <span className="text-[14px] text-[var(--cat-muted)]">/{progress.total}</span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[var(--cat-muted)]">{progress.percent}%</p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <ol className="divide-y divide-neutral-200/50">
        {items.map((item, index) => (
          <li key={item.id}>
            {item.loading ? (
              <div
                className="flex items-center gap-3.5 px-4 py-3.5 sm:px-6 sm:py-4"
                aria-busy="true"
                aria-label={`Verificando ${item.title.toLowerCase()}`}
              >
                <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-neutral-100" aria-hidden />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3.5 w-36 max-w-full animate-pulse rounded-sm bg-neutral-100" />
                  <div className="h-3 w-48 max-w-full animate-pulse rounded-sm bg-neutral-100/80" />
                </div>
              </div>
            ) : (
              <Link
                to={item.href}
                state={DASHBOARD_RETURN_NAV}
                className={`group flex items-center gap-3.5 px-4 py-3.5 transition sm:px-6 sm:py-4 ${
                  item.done ? 'bg-emerald-50/35' : 'hover:bg-neutral-50/80 active:bg-neutral-50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition ${
                    item.done
                      ? 'bg-emerald-500 text-white'
                      : 'border border-neutral-200 bg-[var(--cat-surface)] text-[var(--cat-muted)] group-hover:border-neutral-300'
                  }`}
                  aria-hidden
                >
                  {item.done ? (
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6.2 4.8 8.5 9.5 3.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[14px] font-medium tracking-tight sm:text-[15px] ${
                      item.done ? 'text-emerald-900' : 'text-[var(--cat-text)]'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--cat-muted)] sm:text-[13px]">
                    {item.description}
                  </p>
                </div>
                <IconChevronRight
                  size={16}
                  className={`shrink-0 transition ${
                    item.done
                      ? 'text-emerald-600/50'
                      : 'text-[var(--cat-muted)] opacity-35 group-hover:translate-x-0.5 group-hover:opacity-70'
                  }`}
                />
              </Link>
            )}
          </li>
        ))}
      </ol>

      {allDone && (
        <div className="border-t border-emerald-200/45 bg-emerald-50/50 px-4 py-4 sm:px-6 sm:py-5">
          {finalizing ? (
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
              <p className="text-[13px] font-medium text-emerald-950">Guardando tu progreso…</p>
            </div>
          ) : rewardCode ? (
            <div className="space-y-3">
              <p className="text-[15px] font-medium text-emerald-950 sm:text-[16px]">¡Tu tienda está lista para vender!</p>
              <p className="text-[12px] leading-relaxed text-emerald-900/85 sm:text-[13px]">
                Tu código Expert exclusivo ya está disponible. Activá el plan: el primer mes queda en $0.
              </p>
              <div className="inline-flex items-center rounded-lg border border-emerald-200/70 bg-white/80 px-3 py-2 font-mono text-[13px] font-semibold tracking-wide text-emerald-900 sm:text-[14px]">
                {rewardCode}
              </div>
              <div>
                <Link
                  to={`/app/plan?code=${encodeURIComponent(rewardCode)}`}
                  state={DASHBOARD_RETURN_NAV}
                  className="inline-flex mc-btn-primary px-4 py-2.5 text-[13px]"
                >
                  Activar Expert ahora
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed text-emerald-950 sm:text-[13px]">
              {expertPromoEnabled
                ? '¡Listo! Tu tienda ya puede vender. La ventana de 24 h para Expert gratis venció, pero podés mejorar tu plan cuando quieras.'
                : '¡Listo! Tu tienda ya puede vender.'}
            </p>
          )}
          {finalizeError && <p className="mt-2 text-[13px] text-red-800">{finalizeError}</p>}
        </div>
      )}
    </section>
  )
}
