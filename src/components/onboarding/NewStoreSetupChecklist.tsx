import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
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
  onCompleted?: (rewardCode: string | null) => void
}

export function NewStoreSetupChecklist({
  tenant,
  platformSettings,
  platformSettingsReady = platformSettings !== null,
  hasProducts,
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
      aria-label="Checklist para empezar a vender"
      className="overflow-hidden border border-neutral-200/55 bg-[var(--cat-surface)] shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_5%,transparent)]"
    >
      <div className="border-b border-neutral-200/50 px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">
              Primeros pasos
            </p>
            <h2 className="mt-1 text-[1.25rem] font-medium tracking-tight text-[var(--cat-text)]">
              Checklist para empezar a vender
            </h2>
          </div>
          <p className="text-[13px] font-medium tabular-nums text-[var(--cat-muted)]">
            {progress.done}/{progress.total} listo
          </p>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden bg-neutral-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-neutral-200/45">
        {items.map((item, index) => (
          <li key={item.id}>
            {item.loading ? (
              <div
                className="flex items-start gap-4 px-5 py-4 sm:px-7 sm:py-5"
                aria-busy="true"
                aria-label={`Verificando ${item.title.toLowerCase()}`}
              >
                <span className="mt-0.5 h-8 w-8 shrink-0 animate-pulse bg-neutral-100" aria-hidden />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-40 max-w-full animate-pulse rounded-sm bg-neutral-100" />
                  <div className="h-3 w-56 max-w-full animate-pulse rounded-sm bg-neutral-100/80" />
                </div>
              </div>
            ) : (
              <Link
                to={item.href}
                className={`group flex items-start gap-4 px-5 py-4 transition sm:px-7 sm:py-5 ${
                  item.done ? 'bg-emerald-50/35' : 'hover:bg-neutral-50/60'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border text-[13px] font-semibold transition ${
                    item.done
                      ? 'border-emerald-500/40 bg-emerald-500 text-white'
                      : 'border-neutral-300/80 bg-[var(--cat-surface)] text-[var(--cat-muted)]'
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
                    className={`font-medium tracking-tight ${
                      item.done ? 'text-emerald-950' : 'text-[var(--cat-text)]'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">{item.description}</p>
                </div>
                <IconChevronRight
                  size={17}
                  className={`mt-1 shrink-0 transition ${
                    item.done ? 'text-emerald-700/60' : 'text-[var(--cat-muted)] opacity-50 group-hover:opacity-100'
                  }`}
                />
              </Link>
            )}
          </li>
        ))}
      </ul>

      {allDone && (
        <div className="border-t border-emerald-200/50 bg-emerald-50/40 px-5 py-5 sm:px-7">
          {finalizing ? (
            <p className="text-[13px] text-emerald-950">Guardando tu progreso…</p>
          ) : rewardCode ? (
            <div className="space-y-2">
              <p className="text-[15px] font-medium text-emerald-950">¡Tu tienda está lista para vender!</p>
              <p className="text-[13px] leading-relaxed text-emerald-900/80">
                Te enviamos tu código Expert exclusivo abajo en Inicio.
              </p>
              <Link
                to={`/app/plan?code=${encodeURIComponent(rewardCode)}`}
                className="inline-flex mc-btn-primary px-4 py-2.5 text-[13px]"
              >
                Activar Expert ahora
              </Link>
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-emerald-950">
              ¡Listo! Tu tienda ya puede vender. La promo Expert de 24 h venció, pero podés mejorar tu plan cuando
              quieras.
            </p>
          )}
          {finalizeError && <p className="mt-2 text-[13px] text-red-800">{finalizeError}</p>}
        </div>
      )}
    </section>
  )
}
