import clsx from 'clsx'
import { norrisPinnedStores } from '@/landing/norris/norrisContent'
import { getStoreCardLayout } from '@/landing/norris/norrisStoreLayout'
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
  layout: ReturnType<typeof getStoreCardLayout>
  index: number
  morph: number
  isActive: boolean
  eager?: boolean
}) {
  const enter = useNorrisStoreEnter(index, morph)
  const enterY = (1 - enter) * 42
  const enterScale = 0.88 + enter * 0.12
  const opacity = layout.opacity * (0.35 + enter * 0.65)

  return (
    <article
      className={clsx('mc-norris-store-card', 'mc-norris-store-card--morph', isActive && 'mc-norris-store-card--active')}
      style={{
        position: 'fixed',
        left: layout.left,
        top: layout.top,
        width: layout.width,
        transform: `${layout.transform} translate3d(0, ${enterY}px, 0) scale(${enterScale})`,
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
