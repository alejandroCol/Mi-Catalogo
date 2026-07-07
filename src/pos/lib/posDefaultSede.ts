/** Sede por defecto para admin POS: asignada al perfil o la primera activa. */
export function resolvePosDefaultSedeId(
  sedes: { id: string; activa?: boolean }[],
  profileSedeId?: string,
  sedeIdOverride?: string | null,
): string {
  if (sedeIdOverride) return sedeIdOverride
  if (profileSedeId && sedes.some((s) => s.id === profileSedeId)) return profileSedeId
  return sedes.find((s) => s.activa !== false)?.id ?? sedes[0]?.id ?? ''
}
