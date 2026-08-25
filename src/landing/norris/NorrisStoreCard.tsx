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
  const peekEnter = morph < 0.08
  const enterY = peekEnter ? Math.round((1 - enter) * 42) : 0
  const enterScale = peekEnter ? 0.88 + enter * 0.12 : 1
  const opacity = layout.opacity * (peekEnter ? 0.35 + enter * 0.65 : 1)

  const transform =
    enterY || enterScale !== 1
      ? `${layout.transform} translate3d(0, ${enterY}px, 0) scale(${enterScale})`
      : layout.transform

  return (
    <article
      className={clsx('mc-norris-store-card', 'mc-norris-store-card--morph', isActive && 'mc-norris-store-card--active')}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: layout.width,
        transform,
        opacity,
        zIndex: layout.zIndex,
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
