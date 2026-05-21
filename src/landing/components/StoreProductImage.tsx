import clsx from 'clsx'

type Props = {
  src: string
  alt: string
  className?: string
  wrapClassName?: string
  /** Fallback hue when image fails to load */
  hue?: number
}

function productGradient(hue: number) {
  return `linear-gradient(135deg, hsl(${hue} 45% 88%) 0%, hsl(${hue} 35% 72%) 100%)`
}

export function StoreProductImage({
  src,
  alt,
  className = '',
  wrapClassName = '',
  hue = 330,
}: Props) {
  return (
    <div className={clsx('mc-landing-phone__photo-wrap', wrapClassName)}>
      <img
        src={src}
        alt={alt}
        className={clsx('mc-landing-phone__photo', className)}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={(e) => {
          const img = e.currentTarget
          img.style.display = 'none'
          const wrap = img.parentElement
          if (wrap) {
            wrap.style.background = productGradient(hue)
          }
        }}
      />
    </div>
  )
}
