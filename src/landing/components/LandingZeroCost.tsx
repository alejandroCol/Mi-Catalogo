import { zeroCostContent } from '@/landing/landingContent'
import { LandingSection } from '@/landing/components/LandingSection'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'
import { LandingReveal } from '@/landing/components/LandingReveal'

export function LandingZeroCost() {
  return (
    <LandingSection dark className="mc-landing-zero">
      <div className="mc-landing-zero__grid">
        <LandingReveal className="mc-landing-zero__copy" variant="left">
          <p className="mc-landing-eyebrow mc-landing-eyebrow--light">{zeroCostContent.eyebrow}</p>
          <h2 className="mc-landing-zero__title">{zeroCostContent.headline}</h2>
          <p className="mc-landing-zero__sub">{zeroCostContent.subheadline}</p>
          <LandingRegisterButton variant="light" className="mt-8" />
        </LandingReveal>

        <ul className="mc-landing-zero__highlights">
          {zeroCostContent.highlights.map((item, i) => (
            <LandingReveal key={item.label} as="li" delay={i * 90} variant="right">
              <div className="mc-landing-zero__highlight">
                <span className="mc-landing-zero__check" aria-hidden>
                  ✓
                </span>
                <div>
                  <span className="mc-landing-zero__highlight-label">{item.label}</span>
                  <span className="mc-landing-zero__highlight-detail">{item.detail}</span>
                </div>
              </div>
            </LandingReveal>
          ))}
        </ul>
      </div>
    </LandingSection>
  )
}
