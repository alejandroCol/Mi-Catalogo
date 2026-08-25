import { Link } from 'react-router-dom'
import { MC_BRAND } from '@/brand/mcBrand'
import { MiCatalogoLogoIcon } from '@/brand/MiCatalogoLogoIcon'

export function LandingNorrisBrandLogo() {
  return (
    <Link to="/" className="mc-norris-brand" aria-label={`${MC_BRAND.wordmark} — inicio`}>
      <span className="mc-norris-brand__icon-wrap">
        <span className="mc-norris-brand__icon-glow" aria-hidden />
        <MiCatalogoLogoIcon tone="onLight" className="mc-norris-brand__icon" />
      </span>
      <span className="mc-norris-brand__wordmark" aria-hidden>
        {MC_BRAND.wordmark}
      </span>
    </Link>
  )
}
