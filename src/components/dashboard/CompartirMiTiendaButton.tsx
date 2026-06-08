import { useState } from 'react'
import { IconClipboard } from '@/icons/McIcons'

type Props = {
  storeUrl: string
  className?: string
}

export function CompartirMiTiendaButton({ storeUrl, className = '' }: Props) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCopy() {
    if (!storeUrl || !navigator.clipboard?.writeText) {
      setError('No se pudo copiar. Copiá el enlace manualmente.')
      return
    }
    setError(null)
    try {
      await navigator.clipboard.writeText(storeUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setError('No se pudo copiar. Copiá el enlace manualmente.')
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!storeUrl}
        className="group relative flex w-full overflow-hidden border border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] bg-gradient-to-br from-[var(--cat-surface)] via-[var(--cat-surface)] to-[color-mix(in_srgb,var(--cat-accent)_10%,var(--cat-surface))] px-5 py-5 text-left shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_5%,transparent)] transition duration-300 hover:border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)] hover:shadow-[0_16px_40px_-28px_color-mix(in_srgb,var(--cat-text)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-7 sm:py-6"
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_18%,transparent)] blur-2xl"
          aria-hidden
        />
        <div className="relative flex w-full items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[color-mix(in_srgb,var(--cat-text)_10%,transparent)] bg-white/60 text-[var(--cat-text)] shadow-sm">
            <IconClipboard size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-medium leading-snug tracking-tight text-[var(--cat-text)]">
              {copied ? '¡Enlace copiado!' : 'Compartir mi tienda'}
            </p>
            <p className="mt-1.5 break-all text-[12px] leading-relaxed text-[var(--cat-muted)]">
              {storeUrl}
            </p>
          </div>
          <span className="relative shrink-0 rounded-sm border border-neutral-200/70 bg-white/70 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-text)] transition group-hover:border-neutral-300">
            {copied ? 'Listo' : 'Copiar'}
          </span>
        </div>
      </button>
      {error && <p className="mt-2 text-[13px] text-red-800">{error}</p>}
    </div>
  )
}
