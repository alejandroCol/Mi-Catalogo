import clsx from 'clsx'
import { norrisPinnedStores } from '@/landing/norris/norrisContent'
import type { StoreCardLayout } from '@/landing/norris/norrisStoreLayout'
import { useNorrisStoreEnter } from '@/landing/norris/useNorrisStoreEnter'

export function NorrisStoreCard({
  store,
  layout,
  index,
  morph,
  isActive,
  eager,
}: {
  store: (typeof norrisPinnedStores)[number]
  layout: StoreCardLayout
  index: number
  morph: number
  isActive: boolean
  eager?: boolean
}) {
  const enter = useNorrisStoreEnter(index, morph)
  const atLoad = morph < 0.02
  const enterY = atLoad ? Math.round((1 - enter) * 28) : 0

  const transform = `${layout.transform} translate3d(0, ${enterY}px, 0)`

  return (
    <article
      className={clsx('mc-norris-store-card', 'mc-norris-store-card--morph', isActive && 'mc-norris-store-card--active')}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: layout.width,
        transform,
        opacity: layout.opacity,
        zIndex: layout.zIndex,
        pointerEvents: 'none',
      }}
    >
      <img
        src={store.image}
        alt={store.name}
        className="mc-norris-store-card__img"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <div className="mc-norris-store-card__meta">
        <span className="mc-norris-store-card__name">{store.name}</span>
        <span className="mc-norris-store-card__cat">{store.category}</span>
      </div>
    </article>
  )
}
