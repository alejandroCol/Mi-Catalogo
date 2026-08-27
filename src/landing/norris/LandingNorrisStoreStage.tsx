import { type RefObject } from 'react'
import clsx from 'clsx'
import { norrisStoreSection } from '@/landing/norris/norrisContent'
import { LandingNorrisStoreCards } from '@/landing/norris/LandingNorrisStoreCards'
import type { NorrisStoreScrollState } from '@/landing/norris/useNorrisStoreScroll'

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

type Props = {
  sectionRef: RefObject<HTMLElement | null>
  swipeActive?: boolean
} & NorrisStoreScrollState

export function LandingNorrisStoreStage({
  sectionRef,
  swipeActive,
  ...scroll
}: Props) {
  const { morph } = scroll
  const headReveal = smoothstep(clamp((morph - 0.28) / 0.32, 0, 1))

  return (
    <section
      ref={sectionRef}
      className={clsx('mc-norris-stage mc-norris-stage--stores', swipeActive && 'mc-norris-stage--stores-swipe')}
      aria-label="Tiendas de ejemplo"
    >
      <div className="mc-norris-stage__sticky mc-norris-store-layout">
        <header
          className="mc-norris-store-head"
          style={{
            opacity: headReveal,
          }}
        >
          <p className="mc-norris-kicker mc-norris-kicker--store">{norrisStoreSection.kicker}</p>
          <h2 className="mc-norris-store-head__title">{norrisStoreSection.title}</h2>
        </header>

        <div className="mc-norris-store-stage">
          <LandingNorrisStoreCards {...scroll} />
        </div>
      </div>
    </section>
  )
}
