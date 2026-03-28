/** Lista en env (coma separada). Solo UI gate; Firestore valida isSuperAdmin en el documento. */
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

/** Si hay al menos un email en VITE_MC_SUPERADMIN_EMAILS, la UI exige coincidencia. Si la variable está vacía, basta con isSuperAdmin en Firestore. */
export function superAdminEnvGateEnabled(): boolean {
  return superAdminEmails().size > 0
}
