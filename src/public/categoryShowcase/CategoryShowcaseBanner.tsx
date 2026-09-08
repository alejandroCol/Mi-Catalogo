import { useMemo, useState } from 'react'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import type { CategoriaConId } from '@/lib/catalogCategorias'
import {
  collectProductImageUrls,
  isCategoryShowcaseActive,
  resolveCategoryShowcaseTitle,
  selectCategoryShowcaseProducts,
  toCategoryShowcaseCardModel,
  type CategoryShowcaseCardModel,
} from '@/lib/categoryShowcase'
import { buildSimpleCartLineFromProduct, productNeedsQuickAddOptions } from '@/lib/catalogQuickAdd'
import { useCartAddAnimationOptional } from '@/public/cart-animation/CartAddAnimationContext'
import { CategoryShowcaseCard } from '@/public/categoryShowcase/CategoryShowcaseCard'
import { CategoryShowcaseCarousel } from '@/public/categoryShowcase/CategoryShowcaseCarousel'
import { ShowroomQuickAddSheet } from '@/public/showroom/ShowroomQuickAddSheet'
import type { McProducto, McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant
  products: (McProducto & { id: string })[]
  categorias: CategoriaConId[]
  productPath: (productId: string) => string
  preview?: boolean
  onSelectCategory?: (categoriaId: string) => void
}

export function CategoryShowcaseBanner(props: Props) {
  if (props.preview) return <CategoryShowcaseView {...props} />
  return <CategoryShowcaseLive {...props} />
}

function CategoryShowcaseLive(props: Props) {
  const cart = useCatalogoSimpleCart()
  const fly = useCartAddAnimationOptional()
  const [quickAdd, setQuickAdd] = useState<(McProducto & { id: string }) | null>(null)

  function handleQuickBuy(productId: string, sourceEl: HTMLElement) {
    const product = props.products.find((p) => p.id === productId)
    if (!product) return
    if (productNeedsQuickAddOptions(product)) {
      setQuickAdd(product)
      return
    }
    cart.add(buildSimpleCartLineFromProduct(product))
    fly?.playAddToCartFly({
      sourceEl,
      imageUrl: collectProductImageUrls(product)[0],
    })
  }

  return (
    <>
      <CategoryShowcaseView {...props} onQuickBuy={handleQuickBuy} />
      <ShowroomQuickAddSheet
        product={quickAdd}
        open={quickAdd != null}
        onClose={() => setQuickAdd(null)}
        onAdded={() => setQuickAdd(null)}
      />
    </>
  )
}

function CategoryShowcaseView({
  tenant,
  products,
  categorias,
  productPath,
  preview = false,
  onSelectCategory,
  onQuickBuy,
}: Props & { onQuickBuy?: (productId: string, sourceEl: HTMLElement) => void }) {
  const config = tenant.categoryShowcase
  const active = preview || isCategoryShowcaseActive(tenant, categorias)

  const cards = useMemo<CategoryShowcaseCardModel[]>(() => {
    if (!active || !config?.categoriaId) return []
    return selectCategoryShowcaseProducts(products, config.categoriaId, categorias).map(
      toCategoryShowcaseCardModel,
    )
  }, [active, config?.categoriaId, products, categorias])

  const title = useMemo(() => {
    if (!config?.categoriaId) return ''
    return resolveCategoryShowcaseTitle(config, categorias)
  }, [config, categorias])

  if (!active || !config?.categoriaId || cards.length === 0 || !title) return null

  return (
    <section id="mc-category-showcase" className="mc-cat-showcase" aria-label={title}>
      <div className="mc-cat-showcase__head">
        {onSelectCategory && !preview ? (
          <button
            type="button"
            className="mc-cat-showcase__title"
            onClick={() => onSelectCategory(config.categoriaId)}
          >
            {title}
          </button>
        ) : (
          <h2 className="mc-cat-showcase__title">{title}</h2>
        )}
      </div>

      <CategoryShowcaseCarousel label={title}>
        {cards.map((model) => (
          <li key={model.product.id} className="mc-cat-showcase__slide">
            <CategoryShowcaseCard
              model={model}
              productPath={productPath}
              preview={preview}
              onQuickBuy={onQuickBuy}
            />
          </li>
        ))}
      </CategoryShowcaseCarousel>
    </section>
  )
}
