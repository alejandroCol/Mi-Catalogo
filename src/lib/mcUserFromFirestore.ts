import type { McUser } from '@/types/mc'

/** Acepta boolean, número o string (p. ej. edición manual en consola) → boolean estable en la app. */
export function parseIsSuperAdmin(raw: unknown): boolean {
  if (raw === true) return true
  if (raw === 1) return true
  if (typeof raw === 'string' && raw.toLowerCase() === 'true') return true
  return false
}

export function mapFirestoreDataToMcUser(uid: string, data: unknown): McUser {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  return {
    uid,
    email: typeof d.email === 'string' ? d.email : '',
    displayName: typeof d.displayName === 'string' ? d.displayName : '',
    tenantId: typeof d.tenantId === 'string' ? d.tenantId : '',
    isSuperAdmin: parseIsSuperAdmin(d.isSuperAdmin),
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
  }
}

export function isMcSuperAdminUser(profile: McUser | null | undefined): boolean {
  if (!profile) return false
  return profile.isSuperAdmin === true
}
