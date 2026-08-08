import { deleteField } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { firebaseStorageConfigured, getStorageApp } from '@/lib/firebase'
import { mcUpdateCategoria } from '@/lib/mcWrites'

export const CATEGORIA_IMAGE_SPECS = {
  compressionMaxEdgePx: 480,
  jpegQuality: 0.86,
} as const

export function categoriaImageStoragePath(tenantId: string, categoriaId: string): string {
  return `mc_tenants/${tenantId}/categorias/${categoriaId}.jpg`
}

/** Comprime, sube y guarda `imageUrl` en la categoría. */
export async function uploadCategoriaImage(
  tenantId: string,
  categoriaId: string,
  file: File,
): Promise<string> {
  const optimized = await compressImageForUpload(file, {
    maxEdgePx: CATEGORIA_IMAGE_SPECS.compressionMaxEdgePx,
    jpegQuality: CATEGORIA_IMAGE_SPECS.jpegQuality,
  })
  const storage = getStorageApp()
  const pathRef = ref(storage, categoriaImageStoragePath(tenantId, categoriaId))
  await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
  const url = await getDownloadURL(pathRef)
  await mcUpdateCategoria(tenantId, categoriaId, { imageUrl: url })
  return url
}

export async function removeCategoriaImage(
  tenantId: string,
  categoriaId: string,
  existingUrl?: string | null,
): Promise<void> {
  if (firebaseStorageConfigured && existingUrl) {
    try {
      await deleteObject(ref(getStorageApp(), categoriaImageStoragePath(tenantId, categoriaId)))
    } catch {
      /* ya ausente */
    }
  }
  await mcUpdateCategoria(tenantId, categoriaId, { imageUrl: deleteField() })
}

export function mapCategoriaImageError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
  if (code === 'permission-denied' || code === 'storage/unauthorized') {
    return 'Sin permiso para guardar la imagen. Recargá e intentá de nuevo.'
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Sin conexión estable. Revisá tu internet e intentá otra vez.'
  }
  return 'No se pudo guardar la imagen. Intentá de nuevo.'
}
