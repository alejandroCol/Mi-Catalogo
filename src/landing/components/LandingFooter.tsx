import { Link } from 'react-router-dom'
import { LandingBrandLogo } from '@/landing/components/LandingBrandLogo'
import { footerContent, landingNavLinks } from '@/landing/landingContent'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'

export function LandingFooter() {
  return (
    <footer className="mc-landing-footer">
      <div className="mc-landing-container mc-landing-footer__grid">
        <div className="mc-landing-footer__brand">
          <LandingBrandLogo />
          <p className="mc-landing-footer__tagline">{footerContent.tagline}</p>
        </div>

        <nav className="mc-landing-footer__nav" aria-label="Footer">
          {landingNavLinks.map((link) => (
            <a key={link.id} href={link.href} className="mc-landing-footer__link">
              {link.label}
            </a>
          ))}
          <Link to="/login" className="mc-landing-footer__link">
            Ingresar
          </Link>
        </nav>

        <div className="mc-landing-footer__cta">
          <LandingRegisterButton variant="secondary" />
        </div>
      </div>

      <div className="mc-landing-container mc-landing-footer__bottom">
        <p className="mc-landing-footer__copy">{footerContent.copyright}</p>
      </div>
    </footer>
  )
}
