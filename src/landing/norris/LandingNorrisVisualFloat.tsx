import { useNorrisSectionProgress } from '@/landing/norris/useNorrisSectionProgress'
import { StorePreviewFrame } from '@/landing/components/StorePreviewFrame'
import { storeExamples } from '@/landing/landingContent'

export function LandingNorrisVisualFloat() {
  const { ref, progress } = useNorrisSectionProgress()
  const phoneY = (0.5 - progress) * 80
  const phoneRotate = (0.5 - progress) * 6
  const glowScale = 0.9 + progress * 0.2

  return (
    <section ref={ref} className="mc-norris-stage mc-norris-stage--float" aria-label="Vista previa">
      <div className="mc-norris-stage__sticky">
        <div className="mc-norris-float">
          <div
            className="mc-norris-float__glow"
            style={{ transform: `scale(${glowScale})` }}
            aria-hidden
          />
          <div
            className="mc-norris-float__phone mc-norris-float__phone--main"
            style={{ transform: `translateY(${phoneY}px) rotate(${phoneRotate}deg)` }}
          >
            <StorePreviewFrame store={storeExamples[0]} />
          </div>
          <div
            className="mc-norris-float__phone mc-norris-float__phone--secondary"
            style={{
              transform: `translateY(${-phoneY * 0.6}px) rotate(${-phoneRotate * 0.5}deg)`,
              opacity: 0.55 + progress * 0.35,
            }}
            aria-hidden
          >
            <StorePreviewFrame store={storeExamples[1]} compact />
          </div>

          <div className="mc-norris-float__chips" style={{ opacity: Math.min(1, progress * 2) }}>
            <span className="mc-norris-float__chip">Catálogo</span>
            <span className="mc-norris-float__chip">WhatsApp</span>
            <span className="mc-norris-float__chip">Checkout</span>
            <span className="mc-norris-float__chip">Envíos</span>
          </div>
        </div>
      </div>
    </section>
  )
}
