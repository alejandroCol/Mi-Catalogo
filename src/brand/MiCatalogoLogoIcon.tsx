import { mcBrandColors, type McBrandTone } from '@/brand/mcBrand'

type Props = {
  tone?: McBrandTone
  className?: string
}

/** Isotipo: tres barras + trazo dorado. */
export function MiCatalogoLogoIcon({ tone = 'onLight', className }: Props) {
  const { mark, accent } = mcBrandColors(tone)

  return (
    <svg
      viewBox="0 0 56 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="4" y="6" width="10" height="32" rx="5" fill={mark} />
      <rect x="23" y="14" width="10" height="24" rx="5" fill={mark} />
      <rect x="42" y="6" width="10" height="32" rx="5" fill={mark} />
      <rect x="0" y="18" width="56" height="8" rx="4" fill={accent} />
    </svg>
  )
}
