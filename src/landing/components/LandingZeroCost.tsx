import { zeroCostContent } from '@/landing/landingContent'
import { LandingSection } from '@/landing/components/LandingSection'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'

export function LandingZeroCost() {
  return (
    <LandingSection dark className="mc-landing-zero">
      <div className="mc-landing-zero__grid">
        <div className="mc-landing-zero__copy">
          <p className="mc-landing-eyebrow mc-landing-eyebrow--light">{zeroCostContent.eyebrow}</p>
          <h2 className="mc-landing-zero__title">{zeroCostContent.headline}</h2>
          <p className="mc-landing-zero__sub">{zeroCostContent.subheadline}</p>
          <LandingRegisterButton variant="light" className="mt-8" />
        </div>

        <ul className="mc-landing-zero__highlights">
          {zeroCostContent.highlights.map((item) => (
            <li key={item.label} className="mc-landing-zero__highlight">
              <span className="mc-landing-zero__check" aria-hidden>
                ✓
              </span>
              <div>
                <span className="mc-landing-zero__highlight-label">{item.label}</span>
                <span className="mc-landing-zero__highlight-detail">{item.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </LandingSection>
  )
}
