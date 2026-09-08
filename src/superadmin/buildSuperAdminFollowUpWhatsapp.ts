import { whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'
import { buildSuperAdminFollowUpMessage } from '@/lib/superAdminFollowUpWhatsapp'
import type { McPlatformSettings } from '@/types/mc'

export { buildSuperAdminFollowUpMessage } from '@/lib/superAdminFollowUpWhatsapp'

export function buildSuperAdminFollowUpWhatsappUrl(
  whatsappNumero: string | null | undefined,
  storeName: string,
  platformSettings?: McPlatformSettings | null,
): string | null {
  const digits = whatsappNumero?.trim()
  if (!digits) return null
  return whatsappUrlFromNumber(digits, buildSuperAdminFollowUpMessage(storeName, platformSettings))
}
