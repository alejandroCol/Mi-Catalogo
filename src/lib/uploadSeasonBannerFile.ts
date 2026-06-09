import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { getStorageApp } from '@/lib/firebase'

export async function uploadSeasonBannerFile(
  storagePath: string,
  file: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const storage = getStorageApp()
  const storageRef = ref(storage, storagePath)
  const task = uploadBytesResumable(storageRef, file, { contentType })

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        onProgress?.(pct)
      },
      reject,
      () => resolve(),
    )
  })

  return getDownloadURL(storageRef)
}
