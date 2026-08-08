import clsx from 'clsx'
import { useCatalogFavorites } from '@/public/CatalogFavoritesContext'

type Props = {
  productId: string
  className?: string
  size?: 'sm' | 'md'
  /** Sobre fotos de producto (corazón claro). En botones blancos usar false. */
  onMedia?: boolean
}

/** Path suave (Heroicons) — se rasteriza limpio en retina. */
const HEART_D =
  'M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z'

export function CatalogHeartGlyph({
  filled,
  size = 22,
  className,
  onMedia = false,
}: {
  filled: boolean
  size?: number
  className?: string
  /** Sobre fotos: corazón blanco suave, sin borde. */
  onMedia?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={clsx('block shrink-0 overflow-visible', className)}
      aria-hidden
    >
      <path
        d={HEART_D}
        fill={filled ? 'currentColor' : onMedia ? 'rgba(255,255,255,0.95)' : 'none'}
        stroke={filled || onMedia ? 'none' : 'currentColor'}
        strokeWidth={filled || onMedia ? 0 : 1.65}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={
          onMedia && !filled
            ? { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.18))' }
            : undefined
        }
      />
    </svg>
  )
}

export function CatalogFavoriteButton({ productId, className, size = 'md', onMedia = true }: Props) {
  const { isFavorite, toggleFavorite } = useCatalogFavorites()
  const active = isFavorite(productId)
  const px = size === 'sm' ? 20 : 22

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(productId)
      }}
      aria-label={active ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center justify-center p-1 transition duration-200 ease-out active:scale-95',
        active ? 'text-[var(--cat-accent)]' : 'text-[var(--cat-text)]',
        active && 'mc-pc-fav-pop',
        className,
      )}
    >
      <CatalogHeartGlyph filled={active} size={px} onMedia={onMedia} />
    </button>
  )
}
