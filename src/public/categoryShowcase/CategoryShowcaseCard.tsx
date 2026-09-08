import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { IconCart, IconEye } from '@/icons/McIcons'
import { formatCop } from '@/lib/formatCop'
import { productoPrecioVentaDesde, productoTieneDescuento } from '@/lib/productoDescuento'
import type { CategoryShowcaseCardModel } from '@/lib/categoryShowcase'

type Props = {
  model: CategoryShowcaseCardModel
  productPath: (productId: string) => string
  preview?: boolean
  onQuickBuy?: (productId: string, sourceEl: HTMLElement) => void
}

export function CategoryShowcaseCard({ model, productPath, preview, onQuickBuy }: Props) {
  const { product, primaryImage, secondaryImage, sizeLabels } = model
  const href = productPath(product.id)
  const price = productoPrecioVentaDesde(product)
  const onSale = productoTieneDescuento(product)
  const canHoverSwap = Boolean(primaryImage && secondaryImage)

  function handleQuickBuy(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (preview) return
    onQuickBuy?.(product.id, e.currentTarget)
  }

  return (
    <article className="mc-cat-showcase-card group">
      <div className="mc-cat-showcase-card__media">
        <Link to={href} className="mc-cat-showcase-card__photo" aria-label={`Ver ${product.nombre}`}>
          {primaryImage ? (
            <>
              <img
                src={primaryImage}
                alt={product.nombre}
                loading="lazy"
                draggable={false}
                className="mc-cat-showcase-card__img mc-cat-showcase-card__img--front"
              />
              {canHoverSwap ? (
                <img
                  src={secondaryImage}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  draggable={false}
                  className="mc-cat-showcase-card__img mc-cat-showcase-card__img--back"
                />
              ) : null}
            </>
          ) : (
            <span className="mc-cat-showcase-card__empty">Sin foto</span>
          )}
        </Link>

        <div className="mc-cat-showcase-card__overlay">
          <Link
            to={href}
            className="mc-cat-showcase-card__eye"
            aria-label={`Vista rápida de ${product.nombre}`}
          >
            <IconEye size={16} />
          </Link>
          {sizeLabels.length > 0 ? (
            <p className="mc-cat-showcase-card__sizes">{sizeLabels.join(', ')}</p>
          ) : null}
          <button
            type="button"
            className="mc-cat-showcase-card__cta"
            onClick={handleQuickBuy}
          >
            <IconCart size={15} />
            Compra Rápida
          </button>
        </div>
      </div>

      <Link to={href} className="mc-cat-showcase-card__meta">
        <h3 className="mc-cat-showcase-card__name">{product.nombre}</h3>
        <p className="mc-cat-showcase-card__price">
          {formatCop(price)}
          {onSale ? <span className="mc-cat-showcase-card__sale">Oferta</span> : null}
        </p>
      </Link>
    </article>
  )
}
