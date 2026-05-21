import { MC_BRAND } from '@/brand/mcBrand'
import { MiCatalogoLogo } from '@/brand/MiCatalogoLogo'

type Props = {
  className?: string
}

/** Logo horizontal compacto para nav de landing — evita recorte en barras fijas. */
export function LandingBrandLogo({ className = '' }: Props) {
  return (
    <span className={`mc-landing-brand ${className}`} aria-label={MC_BRAND.wordmark}>
      <MiCatalogoLogo variant="icon" size={34} title={MC_BRAND.wordmark} />
      <span className="mc-landing-brand__word" aria-hidden>
        {MC_BRAND.wordmark}
      </span>
    </span>
  )
}
