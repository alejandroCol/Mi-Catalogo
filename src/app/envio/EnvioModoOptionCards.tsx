import { Link } from 'react-router-dom'
import type { ConfigSubpageNavState } from '@/app/configuraciones/configSubpageNav'
import { IconChevronRight, IconShipping } from '@/icons/McIcons'
import type { EnvioModo } from '@/lib/envioModo'
import { ENVIO_MODOS } from '@/lib/envioModoDisplay'

function RadioIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition ${
        selected
          ? 'border-[var(--cat-text)] bg-[var(--cat-text)]'
          : 'border-neutral-300 bg-white group-hover:border-neutral-400'
      }`}
      aria-hidden
    >
      {selected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
    </span>
  )
}

export function EnvioModoOptionCards({
  value,
  navState,
}: {
  value: EnvioModo | null
  navState?: ConfigSubpageNavState
}) {
  return (
    <div className="grid gap-3 sm:gap-3.5" role="radiogroup" aria-label="Método de envío">
      {ENVIO_MODOS.map((modo) => {
        const selected = value === modo.id
        return (
          <Link
            key={modo.id}
            to={modo.href}
            state={navState}
            role="radio"
            aria-checked={selected}
            className={`group w-full overflow-hidden rounded-2xl border-2 bg-[var(--cat-surface)] text-left no-underline shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_4%,transparent)] transition duration-200 ${
              selected
                ? 'border-[var(--cat-text)] shadow-[0_8px_28px_-16px_rgba(0,0,0,0.35)]'
                : 'border-neutral-200/80 hover:border-neutral-300 hover:shadow-[0_6px_20px_-14px_rgba(0,0,0,0.18)] active:scale-[0.995]'
            }`}
          >
            <div className="flex items-start gap-3.5 px-4 py-4 sm:px-5 sm:py-4">
              <RadioIndicator selected={selected} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                      selected
                        ? 'border-neutral-200 bg-neutral-50'
                        : 'border-neutral-200/70 bg-neutral-50/60 group-hover:bg-neutral-50'
                    }`}
                  >
                    <IconShipping
                      size={20}
                      className={selected ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)]'}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-[15px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-[16px]">
                        {modo.title}
                      </p>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {modo.recommended ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-800">
                            Recomendado
                          </span>
                        ) : null}
                        {selected ? (
                          <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-text)]">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--cat-muted)] opacity-0 transition group-hover:opacity-100">
                            Configurar
                            <IconChevronRight size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">{modo.summary}</p>
                  </div>
                </div>

                <ul className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
                  {modo.highlights.map((line) => (
                    <li key={line} className="flex gap-2 text-[12px] leading-snug text-[var(--cat-text)]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
