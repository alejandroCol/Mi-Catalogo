import { createPortal } from 'react-dom'
import { parseStoreSlugFromHostname } from '@/lib/storePublicUrl'
import { readCachedCatalogBrandLogo, readCachedCatalogBrandRound } from '@/lib/catalogBrandLogoCache'
import {
  CatalogBrandPulseLoader,
  useCatalogBrandPulse,
} from '@/public/CatalogBrandPulseLoader'
import { usePublicStoreSlug } from '@/public/PublicStoreContext'

/** Loader a pantalla completa, centrado, con el logo en la forma de la cabecera. */
export function McPublicPageLoadingFallback() {
  const fromStore = useCatalogBrandPulse()
  const slugFromStore = usePublicStoreSlug()
  const slug =
    slugFromStore ??
    (typeof window !== 'undefined' ? parseStoreSlugFromHostname(window.location.hostname) : null)

  const logoUrl = fromStore?.logoUrl || readCachedCatalogBrandLogo(slug)
  const storeName = fromStore?.storeName || slug
  const round = fromStore?.round ?? readCachedCatalogBrandRound(slug) ?? true

  const node = (
    <div className="mc-brand-pulse-screen">
      <CatalogBrandPulseLoader logoUrl={logoUrl} storeName={storeName} round={round} />
    </div>
  )

  if (typeof document === 'undefined') return node
  const host =
    document.querySelector('.mc-public-catalog-page') ?? document.body
  return createPortal(node, host)
}
