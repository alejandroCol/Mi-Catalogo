import clsx from 'clsx'
import { norrisPowerFeatures } from '@/landing/norris/norrisContent'
import { useNorrisSectionProgress } from '@/landing/norris/useNorrisSectionProgress'

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function PowerCloud({ className }: { className: string }) {
  return (
    <div className={clsx('mc-norris-power__cloud', className)}>
      <span className="mc-norris-power__puff mc-norris-power__puff--a" />
      <span className="mc-norris-power__puff mc-norris-power__puff--b" />
      <span className="mc-norris-power__puff mc-norris-power__puff--c" />
      <span className="mc-norris-power__puff mc-norris-power__puff--d" />
    </div>
  )
}

export function LandingNorrisPowerStage() {
  const { ref, progress } = useNorrisSectionProgress(160)
  const focus = easeOutCubic(clamp((progress - 0.02) / 0.22, 0, 1))

  return (
    <section ref={ref} className="mc-norris-stage mc-norris-stage--power" aria-label="Funcionalidades">
      <div className="mc-norris-power__sky" aria-hidden>
        <div className="mc-norris-power__glow mc-norris-power__glow--left" />
        <div className="mc-norris-power__glow mc-norris-power__glow--right" />
        <PowerCloud className="mc-norris-power__cloud--1" />
        <PowerCloud className="mc-norris-power__cloud--2" />
        <PowerCloud className="mc-norris-power__cloud--3" />
      </div>

      <div className="mc-norris-stage__sticky mc-norris-power">
        <header
          className="mc-norris-power__head"
          style={{
            opacity: 0.62 + focus * 0.38,
            transform: `translateY(${(1 - focus) * 12}px)`,
          }}
        >
          <p className="mc-norris-kicker mc-norris-kicker--store">Más que un catálogo</p>
          <h2 className="mc-norris-power__title">
            Un link. <span className="mc-norris-power__title-accent">Todo tu negocio.</span>
          </h2>
        </header>

        <div className="mc-norris-power__grid">
          {norrisPowerFeatures.map((feature, i) => {
            const stagger = i * 0.025
            const reveal = easeOutCubic(clamp((progress - 0.04 - stagger) / 0.32, 0, 1))
            const y = (1 - reveal) * 18

            return (
              <article
                key={feature.id}
                className={clsx(
                  'mc-norris-power__card',
                  feature.size === 'large' && 'mc-norris-power__card--lead',
                )}
                style={{
                  opacity: 0.5 + reveal * 0.5,
                  transform: `translate3d(0, ${y}px, 0) scale(${0.94 + reveal * 0.06})`,
                }}
              >
                <span className="mc-norris-power__card-label">{feature.label}</span>
                <h3 className="mc-norris-power__card-title">{feature.title}</h3>
                <p className="mc-norris-power__card-desc">{feature.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
