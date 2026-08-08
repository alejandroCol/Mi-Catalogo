import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  favoritesStorageKey,
  loadFavoriteIds,
  saveFavoriteIds,
  toggleFavoriteId,
} from '@/lib/catalogFavorites'

type Ctx = {
  favoriteIds: string[]
  isFavorite: (productId: string) => boolean
  toggleFavorite: (productId: string) => void
  count: number
}

const CatalogFavoritesContext = createContext<Ctx | null>(null)

export function CatalogFavoritesProvider({
  slug,
  children,
}: {
  slug: string | undefined
  children: ReactNode
}) {
  const key = slug ? favoritesStorageKey(slug) : 'mc_fav'
  const [favoriteIds, setFavoriteIds] = useState(() => loadFavoriteIds(key))

  const toggleFavorite = useCallback(
    (productId: string) => {
      setFavoriteIds((prev) => {
        const next = toggleFavoriteId(prev, productId)
        saveFavoriteIds(key, next)
        return next
      })
    },
    [key],
  )

  const isFavorite = useCallback((productId: string) => favoriteIds.includes(productId), [favoriteIds])

  const value = useMemo(
    () => ({
      favoriteIds,
      isFavorite,
      toggleFavorite,
      count: favoriteIds.length,
    }),
    [favoriteIds, isFavorite, toggleFavorite],
  )

  return <CatalogFavoritesContext.Provider value={value}>{children}</CatalogFavoritesContext.Provider>
}

export function useCatalogFavorites() {
  const ctx = useContext(CatalogFavoritesContext)
  if (!ctx) throw new Error('useCatalogFavorites fuera de provider')
  return ctx
}
