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
      <rect x="5" y="6" width="10" height="32" rx="5" fill={mark} />
      <rect x="20" y="14" width="10" height="24" rx="5" fill={mark} />
      <rect x="35" y="6" width="10" height="32" rx="5" fill={mark} />
      <rect x="0" y="19" width="56" height="6" rx="3" fill={accent} />
    </svg>
  )
}
