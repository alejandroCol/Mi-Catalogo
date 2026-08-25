import { Link } from 'react-router-dom'
import { LANDING_REGISTER_PATH, landingRegisterCta } from '@/landing/landingContent'

export function LandingPromoBanner() {
  return (
    <div className="mc-landing-promo">
      <div className="mc-landing-promo__inner">
        <p className="mc-landing-promo__text">
          <span className="mc-landing-promo__badge">{landingRegisterCta.highlight}</span>
          Creá tu tienda online sin tarjeta de crédito
        </p>
        <Link to={LANDING_REGISTER_PATH} className="mc-landing-promo__cta">
          {landingRegisterCta.label}
        </Link>
      </div>
    </div>
  )
}
