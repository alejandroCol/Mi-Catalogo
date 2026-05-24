import { getDownloadURL, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'
import { compressImageForUpload } from '@/lib/compressImageForUpload'

/** Imagen del producto en borrador (existente en Storage o archivo local pendiente de subir). */
export type ProductoImagenDraft =
  | { id: string; kind: 'existing'; url: string }
  | { id: string; kind: 'new'; file: File; previewUrl: string }

export function createImagenDraftFromFile(file: File): ProductoImagenDraft {
  return {
    id: crypto.randomUUID(),
    kind: 'new',
    file,
    previewUrl: URL.createObjectURL(file),
  }
}

export function imagenDraftFromProducto(product: {
  imageUrl?: string
  galeriaImagenes?: string[]
}): { items: ProductoImagenDraft[]; coverId: string | null } {
  const items: ProductoImagenDraft[] = []
  let coverId: string | null = null

  if (product.imageUrl) {
    const id = crypto.randomUUID()
    items.push({ id, kind: 'existing', url: product.imageUrl })
    coverId = id
  }

  const seen = new Set(product.imageUrl ? [product.imageUrl] : [])
  for (const url of product.galeriaImagenes ?? []) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    items.push({ id: crypto.randomUUID(), kind: 'existing', url })
  }

  if (items.length > 0 && !coverId) coverId = items[0]!.id
  return { items, coverId }
}

export function getImagenDraftSrc(item: ProductoImagenDraft): string {
  return item.kind === 'existing' ? item.url : item.previewUrl
}

export function revokeImagenDraftPreviews(items: ProductoImagenDraft[]) {
  for (const item of items) {
    if (item.kind === 'new') URL.revokeObjectURL(item.previewUrl)
  }
}

async function uploadNewImagen(
  storage: FirebaseStorage,
  tenantId: string,
  productId: string,
  file: File,
  asCover: boolean,
): Promise<string> {
  const optimized = await compressImageForUpload(file)
  const pathRef = asCover
    ? ref(storage, `mc_tenants/${tenantId}/productos/${productId}.jpg`)
    : ref(storage, `mc_tenants/${tenantId}/productos/${productId}_g_${crypto.randomUUID()}.jpg`)
  await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
  return getDownloadURL(pathRef)
}

/**
 * Resuelve borradores a URLs finales: la portada va en `imageUrl`, el resto en `galeriaImagenes`.
 */
export async function uploadProductoImagenes(
  storage: FirebaseStorage,
  tenantId: string,
  productId: string,
  items: ProductoImagenDraft[],
  coverId: string | null,
): Promise<{ imageUrl?: string; galeriaImagenes?: string[] }> {
  if (items.length === 0) return {}

  const effectiveCoverId = coverId && items.some((i) => i.id === coverId) ? coverId : items[0]!.id
  const resolved: { id: string; url: string }[] = []

  for (const item of items) {
    const isCover = item.id === effectiveCoverId
    if (item.kind === 'existing') {
      resolved.push({ id: item.id, url: item.url })
    } else {
      const url = await uploadNewImagen(storage, tenantId, productId, item.file, isCover)
      resolved.push({ id: item.id, url })
    }
  }

  const cover = resolved.find((r) => r.id === effectiveCoverId)
  if (!cover) return {}

  const galeria = resolved.filter((r) => r.id !== effectiveCoverId).map((r) => r.url)
  return {
    imageUrl: cover.url,
    ...(galeria.length > 0 ? { galeriaImagenes: galeria } : {}),
  }
}

export async function uploadVarianteImagen(
  storage: FirebaseStorage,
  tenantId: string,
  productId: string,
  varianteId: string,
  file: File,
): Promise<string> {
  const optimized = await compressImageForUpload(file)
  const pathRef = ref(storage, `mc_tenants/${tenantId}/productos/${productId}_v_${varianteId}.jpg`)
  await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
  return getDownloadURL(pathRef)
}
