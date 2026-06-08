import type { McUser, McUserRole } from '@/types/mc'

/** Acepta boolean, número o string (p. ej. edición manual en consola) → boolean estable en la app. */
export function parseIsSuperAdmin(raw: unknown): boolean {
  if (raw === true) return true
  if (raw === 1) return true
  if (typeof raw === 'string' && raw.toLowerCase() === 'true') return true
  return false
}

export function parseMcUserRole(raw: unknown): McUserRole {
  if (raw === 'sales_rep') return 'sales_rep'
  return 'owner'
}

export function mapFirestoreDataToMcUser(uid: string, data: unknown): McUser {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  return {
    uid,
    email: typeof d.email === 'string' ? d.email : '',
    displayName: typeof d.displayName === 'string' ? d.displayName : '',
    tenantId: typeof d.tenantId === 'string' ? d.tenantId : '',
    isSuperAdmin: parseIsSuperAdmin(d.isSuperAdmin),
    role: parseMcUserRole(d.role),
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
    active: d.active !== false,
  }
}

export function isMcSuperAdminUser(profile: McUser | null | undefined): boolean {
  if (!profile) return false
  return profile.isSuperAdmin === true
}

export function isMcSalesRepUser(profile: McUser | null | undefined): boolean {
  if (!profile) return false
  if (profile.isSuperAdmin) return false
  return profile.role === 'sales_rep' && profile.active !== false
}

export function isMcStoreOwnerUser(profile: McUser | null | undefined): boolean {
  if (!profile) return false
  if (isMcSalesRepUser(profile)) return false
  return true
}

/** Ruta de inicio según rol del usuario (login, landing, verificación de email). */
export function resolveMcHomePath(profile: McUser | null | undefined): string {
  if (isMcSalesRepUser(profile)) return '/vendedor'
  if (isMcSuperAdminUser(profile)) return '/superadmin'
  return '/app'
}
