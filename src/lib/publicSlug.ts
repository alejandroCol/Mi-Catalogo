import { doc, getDoc } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { MC } from '@/lib/mcCollections'

export function slugifyStoreName(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

/**
 * Devuelve un slug disponible para `mc_slugs`, probando sufijos `-2`, `-3`… si hace falta.
 */
export async function resolveAvailablePublicSlug(db: Firestore, nombreTienda: string): Promise<string> {
  const base = slugifyStoreName(nombreTienda)
  if (base.length < 3) {
    throw new Error('slug_too_short')
  }
  for (let n = 0; n < 80; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`
    const slugProbe = await getDoc(doc(db, MC.slugs, candidate))
    if (!slugProbe.exists()) {
      return candidate
    }
    const active = slugProbe.data()?.active === true
    if (!active) {
      return candidate
    }
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`
}
