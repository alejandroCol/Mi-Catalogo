import clsx from 'clsx'
import { bentoFeatures } from '@/landing/landingContent'
import { LandingSection } from '@/landing/components/LandingSection'
import { LandingReveal } from '@/landing/components/LandingReveal'

function BentoIcon({ id }: { id: string }) {
  const paths: Record<string, string> = {
    catalogo: 'M4 6h16v12H4V6zm2 2v8h12V8H6zm3 2h6v4H9v-4z',
    whatsapp:
      'M12 2C6.48 2 2 6.03 2 10.88c0 2.47 1.19 4.68 3.07 6.15L4 22l5.25-1.37A9.86 9.86 0 0012 19.76C17.52 19.76 22 15.73 22 10.88S17.52 2 12 2zm0 15.5c-1.45 0-2.82-.4-4-1.1l-.29-.17-3.11.81.83-3.03-.19-.3A7.38 7.38 0 014.5 10.88C4.5 7.08 7.86 4 12 4s7.5 3.08 7.5 6.88-3.36 6.62-7.5 6.62z',
    checkout: 'M4 4h16l-1 12H5L4 4zm2 2l.8 8h10.4L18 6H6zm2 14a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z',
    inventario: 'M9 3H5a2 2 0 00-2 2v4h6V3zm10 0h-4v6h6V5a2 2 0 00-2-2zM3 13v4a2 2 0 002 2h4v-6H3zm10 0v6h4a2 2 0 002-2v-4h-6z',
    envios: 'M3 6h11v9H3V6zm13 2h3l2 3v4h-5V8zm-11 11a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z',
    cupones: 'M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2H4zm0 2h16v2a2 2 0 01-2 2h-1.5a3.5 3.5 0 01-7 0H9.5a3.5 3.5 0 01-7 0H4a2 2 0 01-2-2v-2z',
  }
  const d = paths[id] ?? paths.catalogo
  return (
    <svg className="mc-landing-bento__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  )
}

export function LandingBentoFeatures() {
  return (
    <LandingSection id="beneficios" className="mc-landing-bento-section">
      <LandingReveal className="mc-landing-bento__head">
        <p className="mc-landing-eyebrow">Todo incluido</p>
        <h2 className="mc-landing-title">
          Herramientas que necesitás
          <span className="mc-landing-title__accent"> para vender en serio</span>
        </h2>
      </LandingReveal>

      <div className="mc-landing-bento">
        {bentoFeatures.map((feature, i) => (
          <LandingReveal
            key={feature.id}
            as="article"
            delay={i * 70}
            variant="up"
            className={clsx(
              'mc-landing-bento__tile',
              `mc-landing-bento__tile--${feature.size}`,
              `mc-landing-bento__tile--${feature.accent}`,
            )}
          >
            <span className="mc-landing-bento__label">{feature.label}</span>
            <BentoIcon id={feature.id} />
            <h3 className="mc-landing-bento__title">{feature.title}</h3>
            <p className="mc-landing-bento__desc">{feature.description}</p>
          </LandingReveal>
        ))}
      </div>
    </LandingSection>
  )
}
