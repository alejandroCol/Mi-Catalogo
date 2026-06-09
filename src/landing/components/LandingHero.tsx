import { heroContent, storeExamples } from '@/landing/landingContent'
import { LandingDemoStoreButton } from '@/landing/components/LandingDemoStoreButton'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'
import { StorePreviewFrame } from '@/landing/components/StorePreviewFrame'

export function LandingHero() {
  const featured = storeExamples[0]

  return (
    <section className="mc-landing-hero">
      <div className="mc-landing-hero__bg" aria-hidden />
      <div className="mc-landing-container mc-landing-hero__grid">
        <div className="mc-landing-hero__visual">
          <div className="mc-landing-hero__phone-stage">
            <div className="mc-landing-hero__phone-main">
              <StorePreviewFrame store={featured} />
            </div>
            <div className="mc-landing-hero__phone-secondary" aria-hidden>
              <StorePreviewFrame store={storeExamples[2]} compact />
            </div>
            <div className="mc-landing-hero__glow" aria-hidden />
          </div>
        </div>

        <div className="mc-landing-hero__copy">
          <p className="mc-landing-eyebrow">{heroContent.eyebrow}</p>
          <h1 className="mc-landing-hero__title">
            {heroContent.headline}
            <span className="mc-landing-hero__accent">{heroContent.headlineAccent}</span>
          </h1>
          <p className="mc-landing-hero__sub">{heroContent.subheadline}</p>

          <div className="mc-landing-hero__ctas">
            <LandingRegisterButton />
            <LandingDemoStoreButton />
            <a href="#tiendas" className="mc-landing-btn-ghost mc-landing-hero__examples-link">
              Ver ejemplos de diseño
            </a>
          </div>

          <p className="mc-landing-hero__trust">
            <span className="mc-landing-hero__trust-dot" aria-hidden />
            {heroContent.trustLine}
          </p>
        </div>
      </div>
    </section>
  )
}
