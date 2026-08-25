import { finalCtaContent } from '@/landing/landingContent'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'
import { LandingReveal } from '@/landing/components/LandingReveal'

export function LandingFinalCta() {
  return (
    <section className="mc-landing-final">
      <div className="mc-landing-final__bg" aria-hidden />
      <div className="mc-landing-container mc-landing-final__inner">
        <LandingReveal variant="scale">
          <h2 className="mc-landing-final__title">{finalCtaContent.headline}</h2>
          <p className="mc-landing-final__sub">{finalCtaContent.subheadline}</p>
          <LandingRegisterButton className="mc-landing-final__btn" />
        </LandingReveal>
      </div>
    </section>
  )
}
