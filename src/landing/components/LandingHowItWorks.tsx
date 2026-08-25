import { howItWorksSteps } from '@/landing/landingContent'
import { LandingSection } from '@/landing/components/LandingSection'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'
import { LandingReveal } from '@/landing/components/LandingReveal'

export function LandingHowItWorks() {
  return (
    <LandingSection id="como-funciona">
      <LandingReveal className="mc-landing-steps__head">
        <p className="mc-landing-eyebrow">Simple y rápido</p>
        <h2 className="mc-landing-title">
          De la idea a tu primera venta
          <span className="mc-landing-title__accent"> en tres pasos</span>
        </h2>
      </LandingReveal>

      <ol className="mc-landing-steps">
        {howItWorksSteps.map((step, i) => (
          <LandingReveal key={step.id} as="li" delay={i * 100} className="mc-landing-steps__item">
            <span className="mc-landing-steps__number" aria-hidden>
              {step.step}
            </span>
            <div>
              <h3 className="mc-landing-steps__title">{step.title}</h3>
              <p className="mc-landing-steps__desc">{step.description}</p>
            </div>
          </LandingReveal>
        ))}
      </ol>

      <LandingReveal className="mc-landing-steps__cta" delay={320}>
        <LandingRegisterButton />
      </LandingReveal>
    </LandingSection>
  )
}
