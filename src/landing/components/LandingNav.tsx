import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { LandingBrandLogo } from '@/landing/components/LandingBrandLogo'
import { landingNavLinks } from '@/landing/landingContent'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header
      className={clsx(
        'mc-landing-nav',
        scrolled && 'mc-landing-nav--scrolled',
        menuOpen && 'mc-landing-nav--open',
      )}
    >
      <div className="mc-landing-container mc-landing-nav__inner">
        <Link to="/" className="mc-landing-nav__brand" aria-label="mi catálogo — inicio">
          <LandingBrandLogo />
        </Link>

        <nav className="mc-landing-nav__links" aria-label="Secciones">
          {landingNavLinks.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="mc-landing-nav__link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="mc-landing-nav__actions">
          <Link to="/login" className="mc-landing-nav__login">
            Ingresar
          </Link>
          <LandingRegisterButton variant="nav" />
        </div>

        <button
          type="button"
          className="mc-landing-nav__menu-btn"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="mc-landing-nav__menu-icon" aria-hidden />
        </button>
      </div>

      {menuOpen ? (
        <div className="mc-landing-nav__mobile">
          <nav className="mc-landing-nav__mobile-links">
            {landingNavLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className="mc-landing-nav__mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              className="mc-landing-nav__mobile-link"
              onClick={() => setMenuOpen(false)}
            >
              Ingresar
            </Link>
          </nav>
          <LandingRegisterButton variant="primary" fullWidth />
        </div>
      ) : null}
    </header>
  )
}
