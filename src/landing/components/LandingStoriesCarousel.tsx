import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { successStories } from '@/landing/landingContent'
import { LandingReveal } from '@/landing/components/LandingReveal'

export function LandingStoriesCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const onScroll = () => {
      const cards = track.querySelectorAll<HTMLElement>('[data-story-card]')
      if (!cards.length) return
      const trackRect = track.getBoundingClientRect()
      const center = trackRect.left + trackRect.width / 2
      let closest = 0
      let minDist = Infinity
      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect()
        const cardCenter = rect.left + rect.width / 2
        const dist = Math.abs(center - cardCenter)
        if (dist < minDist) {
          minDist = dist
          closest = i
        }
      })
      setActiveIndex(closest)
    }

    track.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => track.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (index: number) => {
    const track = trackRef.current
    const card = track?.querySelector<HTMLElement>(`[data-story-card="${index}"]`)
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  return (
    <section className="mc-landing-stories" aria-labelledby="landing-stories-title">
      <div className="mc-landing-container">
        <LandingReveal>
          <p className="mc-landing-eyebrow">Historias reales</p>
          <h2 id="landing-stories-title" className="mc-landing-title">
            Emprendedores que ya venden
            <span className="mc-landing-title__accent"> con Mi Catálogo</span>
          </h2>
        </LandingReveal>
      </div>

      <div className="mc-landing-stories__track-wrap">
        <div ref={trackRef} className="mc-landing-stories__track" role="list">
          {successStories.map((story, i) => (
            <article
              key={story.id}
              data-story-card={i}
              role="listitem"
              className={clsx(
                'mc-landing-stories__card',
                activeIndex === i && 'mc-landing-stories__card--active',
              )}
            >
              <blockquote className="mc-landing-stories__quote">"{story.quote}"</blockquote>
              <div className="mc-landing-stories__meta">
                <div>
                  <span className="mc-landing-stories__name">{story.name}</span>
                  <span className="mc-landing-stories__role">{story.role}</span>
                </div>
                <div className="mc-landing-stories__result">
                  <span className="mc-landing-stories__result-label">{story.resultLabel}</span>
                  <span className="mc-landing-stories__result-value">{story.resultValue}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mc-landing-stories__dots" aria-hidden>
        {successStories.map((story, i) => (
          <button
            key={story.id}
            type="button"
            className={clsx('mc-landing-stories__dot', activeIndex === i && 'mc-landing-stories__dot--active')}
            onClick={() => scrollTo(i)}
            aria-label={`Historia ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
