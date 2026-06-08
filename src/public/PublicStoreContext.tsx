import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import {
  buildStorePublicPath,
  buildStorePublicUrl,
  mcStoreUrlMode,
  parseStoreSlugFromHostname,
  resolveAppSurface,
  type McAppSurface,
  type McStoreUrlMode,
} from '@/lib/storePublicUrl'

type PublicStoreContextValue = {
  slug: string
  surface: McAppSurface
  mode: McStoreUrlMode
  pathBase: string
  to: (path?: string) => string
  storePublicUrl: (path?: string) => string
}

const PublicStoreContext = createContext<PublicStoreContextValue | null>(null)

type ProviderProps = {
  children: ReactNode
  /** Slug explícito (ruta legada /c/:slug en modo path). */
  slugOverride?: string | null
}

export function PublicStoreProvider({ children, slugOverride }: ProviderProps) {
  const { slug: slugParam } = useParams<{ slug?: string }>()

  const value = useMemo((): PublicStoreContextValue | null => {
    const hostnameSlug =
      typeof window !== 'undefined' ? parseStoreSlugFromHostname(window.location.hostname) : null
    const slug = (slugOverride ?? hostnameSlug ?? slugParam)?.trim().toLowerCase()
    if (!slug) return null

    const surface: McAppSurface = hostnameSlug ? 'store' : resolveAppSurface()
    const mode = mcStoreUrlMode()
    const pathBase = buildStorePublicPath(slug, '/', { surface, mode })

    return {
      slug,
      surface,
      mode,
      pathBase,
      to: (path = '/') => buildStorePublicPath(slug, path, { surface, mode }),
      storePublicUrl: (path = '/') => buildStorePublicUrl(slug, path, mode),
    }
  }, [slugOverride, slugParam])

  if (!value) {
    return null
  }

  return <PublicStoreContext.Provider value={value}>{children}</PublicStoreContext.Provider>
}

export function usePublicStore(): PublicStoreContextValue {
  const ctx = useContext(PublicStoreContext)
  if (!ctx) {
    throw new Error('usePublicStore debe usarse dentro de PublicStoreProvider')
  }
  return ctx
}

/** Slug del catálogo; null si el contexto aún no está listo. */
export function usePublicStoreSlug(): string | undefined {
  return useContext(PublicStoreContext)?.slug
}
