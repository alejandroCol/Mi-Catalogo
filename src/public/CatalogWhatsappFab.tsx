import clsx from 'clsx'
import { IconWhatsApp } from '@/icons/McIcons'
import type { CatalogWhatsappFabAppearance } from '@/lib/catalogWhatsappFab'
import { resolveCatalogWhatsappFab, resolveCatalogWhatsappFabAppearance } from '@/lib/catalogWhatsappFab'
import type { McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant | null | undefined
  /** Vista previa en Personalizar: no navega y no exige número. */
  preview?: boolean
}

const STYLE_CLASS: Record<CatalogWhatsappFabAppearance['style'], string> = {
  classic:
    'h-14 w-14 rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_-8px_rgba(37,211,102,0.75)]',
  pill: 'h-12 gap-2 rounded-full bg-[#25D366] px-4 text-white shadow-[0_10px_28px_-8px_rgba(37,211,102,0.75)]',
  outline:
    'h-12 w-12 rounded-full bg-[var(--cat-surface,#fff)] text-[#25D366] shadow-[0_10px_28px_-10px_rgba(15,15,15,0.28)] ring-1 ring-black/5',
  dark: 'h-14 w-14 rounded-full bg-neutral-950 text-white shadow-[0_10px_28px_-8px_rgba(0,0,0,0.5)]',
}

function FabFace({ appearance }: { appearance: CatalogWhatsappFabAppearance }) {
  const iconSize = appearance.style === 'pill' || appearance.style === 'outline' ? 20 : 26
  return (
    <>
      {appearance.style === 'classic' ? (
        <span className="mc-pc-wa-fab__pulse" aria-hidden />
      ) : null}
      <IconWhatsApp
        monochrome
        size={iconSize}
        className={clsx(appearance.style === 'classic' && 'relative')}
      />
      {appearance.showLabel ? (
        <span className="relative text-[13px] font-semibold tracking-tight">{appearance.label}</span>
      ) : null}
    </>
  )
}

export function CatalogWhatsappFab({ tenant, preview = false }: Props) {
  const live = preview ? null : resolveCatalogWhatsappFab(tenant)
  const appearance = live ?? resolveCatalogWhatsappFabAppearance(tenant?.catalogWhatsappFab)
  if (!appearance) return null
  if (!preview && !live) return null

  const className = clsx(
    'mc-pc-wa-fab relative inline-flex items-center justify-center',
    STYLE_CLASS[appearance.style],
    preview ? 'pointer-events-none relative' : 'fixed z-[25]',
    !preview && appearance.side === 'right' && 'mc-pc-wa-fab--right',
    !preview && appearance.side === 'left' && 'mc-pc-wa-fab--left',
  )

  if (preview || !live) {
    return (
      <span className={className} aria-hidden>
        <FabFace appearance={appearance} />
      </span>
    )
  }

  return (
    <a
      href={live.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`Escribir a ${tenant?.nombreTienda?.trim() || 'la tienda'} por WhatsApp`}
    >
      <FabFace appearance={appearance} />
    </a>
  )
}
