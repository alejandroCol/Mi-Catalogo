import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'
import type { McWishlist, McWishlistItem } from '@/types/mc'

export type WishlistUpsertRequest = {
  slug: string
  sessionToken: string
  wishlistId?: string
  titulo: string
  mensaje?: string
  creadorNombre: string
  destinatarioNombre: string
  destinatarioTelefono?: string
  envioDepartamento: string
  envioCiudad: string
  envioDireccion: string
  envioReferencia?: string
  items: McWishlistItem[]
  estado?: 'activa' | 'cerrada'
}

export type WishlistUpsertResponse = {
  ok: true
  wishlistId: string
  sharePath: string
  managePath?: string
}

export type WishlistPublicView = Omit<McWishlist, 'sessionToken'> & { id: string }

export type WishlistGetResult = {
  wishlist: WishlistPublicView
  canManage: boolean
}

export async function upsertCatalogWishlist(input: WishlistUpsertRequest): Promise<WishlistUpsertResponse> {
  const fn = httpsCallable<WishlistUpsertRequest, WishlistUpsertResponse>(
    getFirebaseFunctions(),
    'mcCatalogWishlistUpsert',
  )
  const res = await fn(input)
  return res.data
}

export async function getCatalogWishlist(
  slug: string,
  wishlistId: string,
  sessionToken?: string,
): Promise<WishlistPublicView> {
  const result = await getCatalogWishlistDetailed(slug, wishlistId, sessionToken)
  return result.wishlist
}

export async function getCatalogWishlistDetailed(
  slug: string,
  wishlistId: string,
  sessionToken?: string,
): Promise<WishlistGetResult> {
  const fn = httpsCallable<
    { slug: string; wishlistId: string; sessionToken?: string },
    { ok: true; wishlist: WishlistPublicView; canManage?: boolean }
  >(getFirebaseFunctions(), 'mcCatalogWishlistGet')
  const res = await fn({
    slug,
    wishlistId,
    ...(sessionToken && sessionToken.length >= 16 ? { sessionToken } : {}),
  })
  return {
    wishlist: res.data.wishlist,
    canManage: res.data.canManage === true,
  }
}

export async function recordWishlistPurchase(slug: string, orderId: string): Promise<{ ok: true; updated: boolean }> {
  const fn = httpsCallable<{ slug: string; orderId: string }, { ok: true; updated: boolean }>(
    getFirebaseFunctions(),
    'mcCatalogWishlistRecordPurchase',
  )
  const res = await fn({ slug, orderId })
  return res.data
}

export function wishlistCallableErrorMessage(e: unknown, fallback = 'No se pudo guardar la lista.'): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return fallback
}
