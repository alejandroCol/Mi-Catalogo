import { useMcAuth } from '@/auth/McAuthContext'
import { isMcPosVendorUser } from '@/lib/mcUserFromFirestore'
import type { McUser } from '@/types/mc'

/** Sede fijada: override explícito o sede del vendedor POS. */
export function getPosLockedSedeId(
  profile: McUser | null | undefined,
  sedeIdOverride?: string | null,
): string | null {
  if (sedeIdOverride) return sedeIdOverride
  if (isMcPosVendorUser(profile) && profile?.posSedeId) return profile.posSedeId
  return null
}

/** Sede asignada al vendedor POS; oculta selectores de sede en módulos de caja. */
export function usePosVendorSedeOverride(): string | null {
  const { profile } = useMcAuth()
  return getPosLockedSedeId(profile)
}
