import { MC_BRAND, mcBrandColors, type McBrandTone } from '@/brand/mcBrand'
import { MiCatalogoLogoIcon } from '@/brand/MiCatalogoLogoIcon'

export type MiCatalogoLogoVariant = 'full' | 'icon'

const SIZE = {
  sm: { icon: 32, full: 120 },
  md: { icon: 40, full: 148 },
  lg: { icon: 52, full: 184 },
} as const

export type MiCatalogoLogoSize = keyof typeof SIZE | number

type Props = {
  variant?: MiCatalogoLogoVariant
  tone?: McBrandTone
  size?: MiCatalogoLogoSize
  className?: string
  title?: string
}

function resolveSize(variant: MiCatalogoLogoVariant, size: MiCatalogoLogoSize) {
  if (typeof size === 'number') return size
  return SIZE[size][variant]
}

/**
 * Logo de la plataforma Mi Catálogo.
 * Usar en panel, auth y super admin — no en cabeceras de catálogos públicos de tiendas.
 */
export function MiCatalogoLogo({
  variant = 'full',
  tone = 'onLight',
  size = 'md',
  className = '',
  title,
}: Props) {
  const px = resolveSize(variant, size)
  const { text } = mcBrandColors(tone)

  if (variant === 'icon') {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center ${className}`}
        style={{ width: px, height: (px * 44) / 56 }}
        role={title ? 'img' : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
      >
        <MiCatalogoLogoIcon tone={tone} className="h-full w-full" />
      </span>
    )
  }

  const iconW = px
  const iconH = (px * 44) / 56
  const fontSize = Math.round(px * 0.19)

  return (
    <span
      className={`inline-flex flex-col items-center gap-[0.35em] ${className}`}
      style={{ width: iconW }}
      role={title ? 'img' : undefined}
      aria-label={title ?? MC_BRAND.wordmark}
    >
      <span className="block w-full" style={{ height: iconH }}>
        <MiCatalogoLogoIcon tone={tone} className="h-full w-full" />
      </span>
      <span
        className="w-full text-center font-sans font-medium lowercase leading-none tracking-tight"
        style={{ fontSize, color: text }}
        aria-hidden={title ? true : undefined}
      >
        {MC_BRAND.wordmark}
      </span>
    </span>
  )
}
