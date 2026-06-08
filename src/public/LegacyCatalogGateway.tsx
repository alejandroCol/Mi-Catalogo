import { useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { buildStorePublicUrl, mcStoreUrlMode } from '@/lib/storePublicUrl'
import { PublicStoreProvider } from '@/public/PublicStoreContext'

/**
 * En producción (modo subdominio), redirige /c/:slug/* → https://:slug.micatalogo.io/*
 * En desarrollo (modo path), renderiza el catálogo en la ruta legada.
 */
export function LegacyCatalogGateway() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const mode = mcStoreUrlMode()

  useEffect(() => {
    if (mode !== 'subdomain' || !slug) return
    const suffix = location.pathname.replace(/^\/c\/[^/]+/, '') || '/'
    const target = buildStorePublicUrl(slug, `${suffix}${location.search}${location.hash}`)
    if (target !== `${window.location.origin}${location.pathname}${location.search}${location.hash}`) {
      window.location.replace(target)
    }
  }, [location.hash, location.pathname, location.search, mode, slug])

  if (mode === 'subdomain') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
        Redirigiendo a tu tienda…
      </div>
    )
  }

  if (!slug) return null

  return (
    <PublicStoreProvider slugOverride={slug}>
      <Outlet />
    </PublicStoreProvider>
  )
}
