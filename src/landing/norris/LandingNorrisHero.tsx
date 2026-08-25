import { Link } from 'react-router-dom'
import { norrisHero } from '@/landing/norris/norrisContent'
import { LandingNorrisHeroForm } from '@/landing/norris/LandingNorrisHeroForm'
import { LandingNorrisBrandLogo } from '@/landing/norris/LandingNorrisBrandLogo'
import { LandingNorrisHeroBackground } from '@/landing/norris/LandingNorrisHeroBackground'
import { LandingNorrisTypewriter } from '@/landing/norris/LandingNorrisTypewriter'

type Props = {
  scrollProgress: number
}

export function LandingNorrisHero({ scrollProgress }: Props) {
  const opacity = 1 - scrollProgress
  const translateY = scrollProgress * -48
  const scale = 1 - scrollProgress * 0.04

  return (
    <section className="mc-norris-hero" aria-label="Inicio">
      <LandingNorrisHeroBackground />

      <header className="mc-norris-hero__top">
        <LandingNorrisBrandLogo />
        <Link to="/login" className="mc-norris-hero__login">
          Ingresar
        </Link>
      </header>

      <div
        className="mc-norris-hero__content"
        style={{
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        <h1 className="mc-norris-hero__title">
          <span className="sr-only">Crea tu tienda virtual en Colombia con Mi Catálogo. </span>
          <LandingNorrisTypewriter />
        </h1>
        <LandingNorrisHeroForm variant="hero" />
      </div>

      <div
        className="mc-norris-hero__scroll-hint"
        style={{ opacity: Math.max(0, 1 - scrollProgress * 2.2) }}
        aria-hidden
      >
        <span>{norrisHero.scrollHint}</span>
        <span className="mc-norris-hero__scroll-line" />
      </div>
    </section>
  )
}
