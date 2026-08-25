import { usePrefersReducedMotion } from '@/public/cart-animation/usePrefersReducedMotion'
import { useNorrisTypewriter } from '@/landing/norris/useNorrisTypewriter'
import { norrisHero } from '@/landing/norris/norrisContent'

export function LandingNorrisTypewriter() {
  const reducedMotion = usePrefersReducedMotion()
  const animatedText = useNorrisTypewriter(norrisHero.headlinePhrases, { enabled: !reducedMotion })
  const text = reducedMotion ? (norrisHero.headlinePhrases[0] ?? '') : animatedText

  return (
    <span className="mc-norris-typewriter">
      <span className="mc-norris-typewriter__text">{text}</span>
      {!reducedMotion ? <span className="mc-norris-typewriter__cursor" aria-hidden /> : null}
    </span>
  )
}
