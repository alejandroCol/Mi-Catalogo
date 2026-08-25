import { norrisCloseSection } from '@/landing/norris/norrisContent'
import { useNorrisSectionProgress } from '@/landing/norris/useNorrisSectionProgress'
import { LandingNorrisHeroForm } from '@/landing/norris/LandingNorrisHeroForm'

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

export function LandingNorrisCloseStage() {
  const { ref, progress } = useNorrisSectionProgress()
  const eased = smoothstep(progress)

  return (
    <section ref={ref} className="mc-norris-stage mc-norris-stage--close" aria-label="Creá tu tienda">
      <div className="mc-norris-stage__sticky mc-norris-close">
        <div className="mc-norris-close__glow" aria-hidden />

        <p
          className="mc-norris-kicker"
          style={{ opacity: 0.4 + eased * 0.6 }}
        >
          {norrisCloseSection.kicker}
        </p>
        <h2
          className="mc-norris-close__title"
          style={{
            opacity: 0.45 + eased * 0.55,
            transform: `translateY(${(1 - eased) * 20}px)`,
          }}
        >
          {norrisCloseSection.title}
        </h2>

        <ul className="mc-norris-close__perks" style={{ opacity: 0.4 + eased * 0.6 }}>
          {norrisCloseSection.perks.map((perk, i) => (
            <li
              key={perk.label}
              className="mc-norris-close__perk"
              style={{ transform: `translateY(${(1 - Math.min(1, eased * 1.2 - i * 0.12)) * 20}px)` }}
            >
              <span className="mc-norris-close__perk-value">{perk.value}</span>
              <span className="mc-norris-close__perk-label">{perk.label}</span>
            </li>
          ))}
        </ul>

        <div
          className="mc-norris-close__cta"
          style={{
            opacity: Math.min(1, Math.max(0, (eased - 0.28) * 1.6)),
            transform: `translateY(${(1 - Math.min(1, Math.max(0, (eased - 0.28) * 1.6))) * 16}px)`,
          }}
        >
          <LandingNorrisHeroForm variant="hero" />
        </div>
      </div>
    </section>
  )
}
