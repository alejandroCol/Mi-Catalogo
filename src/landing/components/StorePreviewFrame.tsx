import clsx from 'clsx'
import {
  catalogColorsToCssVars,
  defaultColorsForPreset,
  publicCatalogPresetClass,
} from '@/lib/catalogTheme'
import type { LandingStoreExample, LandingStoreProduct } from '@/landing/landingContent'
import { StoreProductImage } from '@/landing/components/StoreProductImage'

type Props = {
  store: LandingStoreExample
  compact?: boolean
  className?: string
}

function ProductPhoto({
  product,
  className,
  wrapClassName,
}: {
  product: LandingStoreProduct
  className?: string
  wrapClassName?: string
}) {
  return (
    <StoreProductImage
      src={product.imageUrl}
      alt={product.name}
      hue={product.hue}
      className={className}
      wrapClassName={wrapClassName}
    />
  )
}

export function StorePreviewFrame({ store, compact = false, className = '' }: Props) {
  const colors = defaultColorsForPreset(store.preset)
  const vars = catalogColorsToCssVars(colors)
  const presetClass = publicCatalogPresetClass(store.preset)

  return (
    <div className={clsx('mc-landing-phone', `mc-landing-phone--${store.preset}`, className)}>
      <div className="mc-landing-phone__bezel">
        <div className="mc-landing-phone__notch" aria-hidden />
        <div
          className={clsx(
            'mc-public-catalog-page mc-landing-phone__screen',
            presetClass,
            compact && 'mc-landing-phone__screen--compact',
          )}
          style={vars}
        >
          <header className="mc-landing-phone__header">
            <span className="mc-landing-phone__store-name mc-pc-display">{store.storeName}</span>
            <span className="mc-landing-phone__store-cat mc-pc-muted">{store.category}</span>
          </header>

          <div className="mc-landing-phone__products">
            {store.preset === 'minimal' ? (
              <div className="mc-landing-phone__minimal-list">
                {store.products.map((p) => (
                  <article key={p.name} className="mc-landing-phone__minimal-row">
                    <ProductPhoto
                      product={p}
                      wrapClassName="mc-landing-phone__product-img"
                    />
                    <div className="mc-landing-phone__product-info">
                      <span className="mc-landing-phone__product-name">{p.name}</span>
                      <span className="mc-landing-phone__product-price">{p.price}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : store.preset === 'bold' ? (
              <div className="mc-landing-phone__bold-list">
                {store.products.map((p) => (
                  <article key={p.name} className="mc-landing-phone__bold-card mc-pc-card">
                    <ProductPhoto product={p} wrapClassName="mc-landing-phone__bold-img" />
                    <div className="mc-landing-phone__bold-meta">
                      <span className="mc-landing-phone__product-name">{p.name}</span>
                      <span className="mc-landing-phone__product-price">{p.price}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : store.preset === 'boutique' ? (
              <div className="mc-landing-phone__boutique-grid">
                {store.products.map((p) => (
                  <article key={p.name} className="mc-landing-phone__boutique-card mc-pc-card">
                    <ProductPhoto product={p} wrapClassName="mc-landing-phone__boutique-img" />
                    <div className="mc-landing-phone__boutique-meta">
                      <span className="mc-landing-phone__product-name">{p.name}</span>
                      <span className="mc-landing-phone__product-price">{p.price}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : store.preset === 'ios' ? (
              <div className="mc-landing-phone__ios-grid">
                {store.products.map((p) => (
                  <article key={p.name} className="mc-landing-phone__ios-card mc-pc-card">
                    <div className="mc-landing-phone__ios-row">
                      <ProductPhoto product={p} wrapClassName="mc-landing-phone__ios-img" />
                      <div className="mc-landing-phone__ios-meta">
                        <span className="mc-landing-phone__product-name">{p.name}</span>
                        <span className="mc-landing-phone__product-price">{p.price}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mc-landing-phone__morning-list">
                {store.products.map((p) => (
                  <article key={p.name} className="mc-landing-phone__morning-card mc-pc-rey-card">
                    <ProductPhoto product={p} wrapClassName="mc-landing-phone__morning-img" />
                    <div className="mc-landing-phone__morning-meta">
                      <span className="mc-landing-phone__product-name">{p.name}</span>
                      <span className="mc-landing-phone__product-price">{p.price}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mc-landing-phone__cart-bar">
            <span className="mc-landing-phone__cart-label">Carrito</span>
            <span
              className="mc-landing-phone__cart-btn"
              style={{ background: colors.accent, color: colors.accentText }}
            >
              Ver pedido
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
