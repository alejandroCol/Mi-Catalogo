import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

/** Medidas recomendadas para el logo de tienda (círculo en cabecera del catálogo). */
export const STORE_LOGO_IMAGE_SPECS = {
  recommended: { width: 512, height: 512, ratio: '1:1', label: 'Cuadrado (ideal)' },
  minimum: { width: 256, height: 256 },
  compressionMaxEdgePx: 512,
  jpegQuality: 0.88,
} as const

export function formatStoreLogoDimensions(width: number, height: number): string {
  return `${width.toLocaleString('es')} × ${height.toLocaleString('es')} px`
}

export function storeLogoStoragePath(tenantId: string): string {
  return `mc_tenants/${tenantId}/logo/store.jpg`
}

export type StoreLogoUploadResult = {
  url: string
}

/** Comprime, sube a Storage y persiste `storeLogoUrl` en Firestore. */
export async function uploadStoreLogo(tenantId: string, file: File): Promise<StoreLogoUploadResult> {
  const optimized = await compressImageForUpload(file, {
    maxEdgePx: STORE_LOGO_IMAGE_SPECS.compressionMaxEdgePx,
    jpegQuality: STORE_LOGO_IMAGE_SPECS.jpegQuality,
  })
  const storage = getStorageApp()
  const pathRef = ref(storage, storeLogoStoragePath(tenantId))
  await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
  const url = await getDownloadURL(pathRef)
  await updateDoc(doc(getDb(), MC.tenants, tenantId), { storeLogoUrl: url })
  return { url }
}

/** Elimina el archivo en Storage (si existe) y borra `storeLogoUrl` en Firestore. */
export async function removeStoreLogo(tenantId: string, existingUrl?: string | null): Promise<void> {
  if (firebaseStorageConfigured && existingUrl) {
    try {
      await deleteObject(ref(getStorageApp(), storeLogoStoragePath(tenantId)))
    } catch {
      /* archivo ya ausente */
    }
  }
  await updateDoc(doc(getDb(), MC.tenants, tenantId), { storeLogoUrl: deleteField() })
}

export function mapStoreLogoError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
  if (code === 'permission-denied') {
    return 'Permiso denegado al guardar el logo. Recargá la página e intentá de nuevo. Si la tienda fue creada desde admin, iniciá sesión con el correo del comerciante.'
  }
  if (code === 'storage/unauthorized') {
    return 'Permiso denegado en Storage. Reintentá en unos segundos o volvé a iniciar sesión.'
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Sin conexión estable con el servidor. Revisá tu internet e intentá otra vez.'
  }
  return 'No se pudo guardar el logo. Revisá conexión e intentá de nuevo.'
}
