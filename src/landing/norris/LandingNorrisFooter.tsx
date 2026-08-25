import { Link } from 'react-router-dom'
import { norrisFinal } from '@/landing/norris/norrisContent'
import { LandingBrandLogo } from '@/landing/components/LandingBrandLogo'

export function LandingNorrisFooter() {
  return (
    <footer className="mc-norris-footer">
      <div className="mc-norris-footer__inner">
        <LandingBrandLogo />
        <p className="mc-norris-footer__tagline">{norrisFinal.headline}</p>
        <nav className="mc-norris-footer__nav" aria-label="Enlaces">
          <Link to="/preguntas-frecuentes">Preguntas frecuentes</Link>
          <Link to="/pos">POS</Link>
          <Link to="/login">Ingresar</Link>
          <Link to="/registro">Crear tienda virtual</Link>
        </nav>
        <p className="mc-norris-footer__copy">© {new Date().getFullYear()} mi catálogo</p>
      </div>
    </footer>
  )
}
