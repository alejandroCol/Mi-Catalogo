/**
 * @deprecated La app ya no filtra /superadmin por email; usá `isSuperAdmin` en Firestore (`mc_users`).
 * Estas funciones quedan por si algún script externo las reutiliza.
 */
export function superAdminEmails(): Set<string> {
  const raw = import.meta.env.VITE_MC_SUPERADMIN_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function isEnvSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return superAdminEmails().has(email.toLowerCase())
}

/** Indica si hay emails listados en env (legado; la app no bloquea la UI con esto). */
export function superAdminEnvGateEnabled(): boolean {
  return superAdminEmails().size > 0
}
