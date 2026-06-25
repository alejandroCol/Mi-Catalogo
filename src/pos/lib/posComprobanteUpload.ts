import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { firebaseStorageConfigured, getStorageApp } from '@/lib/firebase'

export function posComprobanteStoragePath(tenantId: string, movimientoId: string, isPdf: boolean): string {
  return `mc_tenants/${tenantId}/pos_caja_comprobantes/${movimientoId}.${isPdf ? 'pdf' : 'jpg'}`
}

export function isPosComprobantePdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export async function uploadPosComprobante(
  tenantId: string,
  movimientoId: string,
  file: File,
): Promise<string> {
  if (!firebaseStorageConfigured) throw new Error('storage_not_configured')
  const pdf = isPosComprobantePdf(file)
  const blob = pdf ? file : await compressImageForUpload(file, { maxEdgePx: 1600, jpegQuality: 0.85 })
  const storage = getStorageApp()
  const pathRef = ref(storage, posComprobanteStoragePath(tenantId, movimientoId, pdf))
  await uploadBytes(pathRef, blob, { contentType: pdf ? 'application/pdf' : 'image/jpeg' })
  return getDownloadURL(pathRef)
}
