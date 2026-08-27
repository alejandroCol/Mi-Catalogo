import { createPortal } from 'react-dom'
import { norrisPinnedStores } from '@/landing/norris/norrisContent'
import { getStoreCardLayout } from '@/landing/norris/norrisStoreLayout'
import type { NorrisStoreScrollState } from '@/landing/norris/useNorrisStoreScroll'
import { NorrisStoreCard } from '@/landing/norris/NorrisStoreCard'

type Props = NorrisStoreScrollState

export function LandingNorrisStoreCards({ morph, slideIndex, storeSlot, activeIndex, cardsVisible }: Props) {
  const portalRoot = typeof document !== 'undefined' ? document.querySelector('.mc-norris') : null

  if (!cardsVisible) {
    return null
  }

  const nodes = norrisPinnedStores.map((store, i) => {
    const layout = getStoreCardLayout(i, morph, slideIndex, storeSlot)
    const card = (
      <NorrisStoreCard
        key={store.id}
        store={store}
        index={i}
        morph={morph}
        layout={layout}
        isActive={i === activeIndex}
        eager={i === 0}
      />
    )

    if (portalRoot) {
      return createPortal(card, portalRoot)
    }

    return card
  })

  return <>{nodes}</>
}
