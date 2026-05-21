import { finalCtaContent } from '@/landing/landingContent'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'

export function LandingFinalCta() {
  return (
    <section className="mc-landing-final">
      <div className="mc-landing-container mc-landing-final__inner">
        <h2 className="mc-landing-final__title">{finalCtaContent.headline}</h2>
        <p className="mc-landing-final__sub">{finalCtaContent.subheadline}</p>
        <LandingRegisterButton className="mc-landing-final__btn" />
      </div>
    </section>
  )
}
