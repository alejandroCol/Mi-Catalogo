import type { McPlatformSettings } from '@/types/mc'

export const SUPER_ADMIN_FOLLOW_UP_STORE_PLACEHOLDER = '{{tienda}}'

export const DEFAULT_SUPER_ADMIN_FOLLOW_UP_WHATSAPP_MESSAGE = [
  'Hola 👋 Soy Lina de Mi Catálogo.',
  '',
  `Vimos que creaste ${SUPER_ADMIN_FOLLOW_UP_STORE_PLACEHOLDER} con nosotros y queríamos saber cómo te ha ido 🌱`,
  '',
  '¿Hay algo en lo que podamos ayudarte? Si te sirve, podemos:',
  '• Agendar unos minutos con un ingeniero de nuestro equipo',
  '• Enviarte un video tutorial para sacarle más provecho a tu catálogo',
  '',
  '¡Contanos con confianza! Estamos para apoyarte 😊',
].join('\n')

export function resolveSuperAdminFollowUpMessageTemplate(
  settings: McPlatformSettings | null | undefined,
): string {
  const custom = settings?.superAdminFollowUpWhatsappMessage?.trim()
  return custom && custom.length > 0 ? custom : DEFAULT_SUPER_ADMIN_FOLLOW_UP_WHATSAPP_MESSAGE
}

export function buildSuperAdminFollowUpMessage(
  storeName: string,
  settings?: McPlatformSettings | null,
): string {
  const template = resolveSuperAdminFollowUpMessageTemplate(settings)
  const name = storeName.trim() || 'tu tienda'
  return template.split(SUPER_ADMIN_FOLLOW_UP_STORE_PLACEHOLDER).join(name)
}
