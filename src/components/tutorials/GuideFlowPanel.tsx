import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { IconCheck, IconChevronLeft, IconChevronRight } from '@/icons/McIcons'
import type { GuideFlow } from '@/lib/tutorials/guideContent'

type Props = {
  guide: GuideFlow
  onClose: () => void
}

export function GuideFlowPanel({ guide, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = guide.steps[stepIndex]
  const total = guide.steps.length
  const progress = ((stepIndex + 1) / total) * 100
  const isLast = stepIndex >= total - 1

  useEffect(() => {
    setStepIndex(0)
  }, [guide.id])

  if (!step) return null

  return (
    <section
      className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_12px_40px_-28px_rgba(10,10,10,0.45)]"
      aria-labelledby={`guide-panel-${guide.id}`}
    >
      <header className="space-y-4 border-b border-neutral-100 px-4 py-4 sm:px-5">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-mc-600 transition hover:text-mc-900"
          onClick={onClose}
        >
          <IconChevronLeft size={18} />
          Menú de tutoriales
        </button>

        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-mc-500">
            Paso {stepIndex + 1} de {total}
          </p>
          <h2
            id={`guide-panel-${guide.id}`}
            className="mt-1 text-[20px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-[22px]"
          >
            {guide.title}
          </h2>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
          <div
            className="h-full rounded-full bg-mc-900 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ol
          className="flex gap-0 overflow-x-auto border-b border-neutral-100 px-4 py-4 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:px-4 lg:py-5"
          aria-label="Flujo del proceso"
        >
          {guide.steps.map((s, i) => {
            const done = i < stepIndex
            const current = i === stepIndex
            return (
              <li key={`${guide.id}-${i}`} className="flex items-center lg:block">
                <button
                  type="button"
                  className={clsx(
                    'flex min-w-[9.5rem] items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition lg:min-w-0 lg:w-full',
                    current && 'bg-neutral-100',
                    !current && 'hover:bg-neutral-50',
                  )}
                  aria-label={`Paso ${i + 1}: ${s.title}`}
                  aria-current={current ? 'step' : undefined}
                  onClick={() => setStepIndex(i)}
                >
                  <span
                    className={clsx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition',
                      done && 'bg-mc-900 text-white',
                      current && 'bg-white text-mc-900 ring-2 ring-mc-900',
                      !done && !current && 'bg-neutral-100 text-mc-500',
                    )}
                  >
                    {done ? <IconCheck size={14} /> : i + 1}
                  </span>
                  <span
                    className={clsx(
                      'truncate text-[13px] font-semibold',
                      current ? 'text-mc-900' : 'text-mc-500',
                    )}
                  >
                    {s.title}
                  </span>
                </button>
                {i < total - 1 ? (
                  <span
                    className={clsx(
                      'mx-1 h-px w-4 shrink-0 lg:mx-0 lg:ml-6 lg:h-3 lg:w-px',
                      i < stepIndex ? 'bg-mc-900' : 'bg-neutral-200',
                    )}
                    aria-hidden
                  />
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="flex min-h-[280px] flex-col">
          <article
            key={`${guide.id}-${stepIndex}`}
            className="flex flex-1 flex-col gap-3 px-4 py-5 sm:px-6 sm:py-6"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-mc-500">
              Ahora hacé esto
            </p>
            <h3 className="text-[22px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-[24px]">
              {step.title}
            </h3>
            <p className="max-w-xl text-[15px] leading-relaxed text-[var(--cat-muted)]">
              {step.body}
            </p>

            {step.tip ? (
              <div className="mt-1 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3">
                <span className="mt-0.5 shrink-0 rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                  Tip
                </span>
                <p className="text-[13px] leading-relaxed text-amber-950">{step.tip}</p>
              </div>
            ) : null}

            {step.ctaTo && step.ctaLabel ? (
              <Link
                to={step.ctaTo}
                className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-xl bg-mc-900 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-black"
              >
                {step.ctaLabel}
                <IconChevronRight size={16} />
              </Link>
            ) : null}
          </article>

          <footer className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3.5 sm:px-5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-mc-800 transition enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-35"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              <IconChevronLeft size={16} />
              Anterior
            </button>
            {!isLast ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl bg-mc-900 px-3.5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-black"
                onClick={() => setStepIndex((i) => Math.min(total - 1, i + 1))}
              >
                Siguiente
                <IconChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl bg-mc-900 px-3.5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-black"
                onClick={onClose}
              >
                Listo
                <IconCheck size={16} />
              </button>
            )}
          </footer>
        </div>
      </div>
    </section>
  )
}
