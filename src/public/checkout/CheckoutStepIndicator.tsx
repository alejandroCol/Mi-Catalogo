import clsx from 'clsx'
import {
  CHECKOUT_STEPS,
  CHECKOUT_STEP_META,
  checkoutStepIndex,
  type CheckoutStepId,
} from '@/lib/checkoutValidation'

type Props = {
  current: CheckoutStepId
  onStepClick?: (step: CheckoutStepId) => void
}

export function CheckoutStepIndicator({ current, onStepClick }: Props) {
  const currentIdx = checkoutStepIndex(current)

  return (
    <nav aria-label="Pasos del checkout" className="w-full">
      <ol className="flex items-start justify-between gap-1 sm:gap-2">
        {CHECKOUT_STEPS.map((stepId, i) => {
          const isCurrent = stepId === current
          const isDone = i < currentIdx
          const isClickable = onStepClick && isDone && !isCurrent

          const content = (
            <>
              <span
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold tabular-nums transition duration-300 sm:h-9 sm:w-9 sm:text-[13px]',
                  isCurrent &&
                    'border-[var(--cat-accent)] bg-[var(--cat-accent)] text-[var(--cat-accent-text)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cat-accent)_22%,transparent)]',
                  isDone &&
                    !isCurrent &&
                    'border-[color-mix(in_srgb,var(--cat-accent)_55%,var(--cat-muted)_45%)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,var(--cat-surface)_88%)] text-[var(--cat-text)]',
                  !isCurrent &&
                    !isDone &&
                    'border-[color-mix(in_srgb,var(--cat-muted)_35%,transparent)] bg-[var(--cat-surface)] text-[var(--cat-muted)]',
                )}
                aria-hidden
              >
                {isDone && !isCurrent ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path
                      d="M2.5 7.2 5.8 10.5 11.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="mt-2 hidden text-center sm:block">
                <span
                  className={clsx(
                    'block text-[10px] font-semibold uppercase tracking-[0.14em]',
                    isCurrent ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)]',
                  )}
                >
                  {CHECKOUT_STEP_META[stepId].short}
                </span>
              </span>
            </>
          )

          return (
            <li
              key={stepId}
              className={clsx(
                'relative flex min-w-0 flex-1 flex-col items-center',
                i < CHECKOUT_STEPS.length - 1 &&
                  'after:absolute after:left-[calc(50%+1.125rem)] after:top-4 after:h-px after:w-[calc(100%-2.25rem)] after:content-[""] sm:after:top-[1.125rem]',
                i < CHECKOUT_STEPS.length - 1 &&
                  (i < currentIdx
                    ? 'after:bg-[color-mix(in_srgb,var(--cat-accent)_45%,var(--cat-muted)_55%)]'
                    : 'after:bg-[color-mix(in_srgb,var(--cat-muted)_25%,transparent)]'),
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(stepId)}
                  className="flex flex-col items-center rounded-lg px-1 py-0.5 transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cat-accent)]"
                >
                  {content}
                </button>
              ) : (
                <div className="flex flex-col items-center px-1">{content}</div>
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--cat-muted)] sm:hidden">
        Paso {currentIdx + 1} de {CHECKOUT_STEPS.length} · {CHECKOUT_STEP_META[current].short}
      </p>
    </nav>
  )
}
