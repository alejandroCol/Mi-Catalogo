import {
  explicitCheckoutVentasModo,
  isCatalogoVendedorListo,
  isCheckoutVentasConfigured,
} from '@/lib/checkoutVentasModo'
import { isEnvioCheckoutConfigured } from '@/lib/checkoutShipping'
import type { McPlatformSettings, McTenant } from '@/types/mc'

/** Ventana para obtener Expert gratis al completar la tienda. */
export const MC_ONBOARDING_EXPERT_REWARD_MS = 24 * 60 * 60 * 1000

export type NewStoreChecklistItemId = 'productos' | 'ventas' | 'envio' | 'listo'

export type NewStoreChecklistItem = {
  id: NewStoreChecklistItemId
  title: string
  description: string
  done: boolean
  href: string
  /** Evita parpadeo mientras cargan ajustes de plataforma necesarios para el ítem. */
  loading?: boolean
}

type OnboardingTenantPick = Pick<
  McTenant,
  | 'createdAt'
  | 'onboardingSetupCompletedAt'
  | 'onboardingExpertRewardCode'
  | 'checkoutVentasModo'
  | 'onepayPaymentsEnabled'
  | 'whatsappNumero'
  | 'envioEstimadoCop'
  | 'envioPorCiudad'
  | 'envioUsarTarifasMicatalogo'
  | 'billingPlan'
>

/** Tienda nueva: aún no completó el checklist y sigue en plan Free. */
export function isNewStoreForOnboarding(tenant: OnboardingTenantPick | null | undefined): boolean {
  if (!tenant) return false
  if (tenant.onboardingSetupCompletedAt) return false
  return tenant.billingPlan !== 'expert'
}

export function isWithinOnboardingExpertRewardWindow(
  tenant: Pick<McTenant, 'createdAt'>,
  nowMs = Date.now(),
): boolean {
  return nowMs - tenant.createdAt <= MC_ONBOARDING_EXPERT_REWARD_MS
}

export function onboardingExpertRewardDeadlineMs(tenant: Pick<McTenant, 'createdAt'>): number {
  return tenant.createdAt + MC_ONBOARDING_EXPERT_REWARD_MS
}

export function buildNewStoreChecklist(
  tenant: OnboardingTenantPick | null | undefined,
  platformSettings: McPlatformSettings | null | undefined,
  hasProducts: boolean,
  options?: { platformSettingsReady?: boolean },
): NewStoreChecklistItem[] {
  const platformSettingsReady = options?.platformSettingsReady ?? platformSettings !== null
  const checkoutModo = explicitCheckoutVentasModo(tenant)
  const ventasNeedsPlatform =
    checkoutModo === 'pasarela_micatalogo' && !platformSettingsReady
  const ventasOk = ventasNeedsPlatform
    ? false
    : isCheckoutVentasConfigured(tenant, platformSettings)
  const envioOk = isEnvioCheckoutConfigured(tenant, platformSettings)
  const listoOk = isCatalogoVendedorListo(tenant, platformSettings)

  return [
    {
      id: 'productos',
      title: 'Agregá tu primer producto',
      description: 'Publicá al menos un artículo en tu inventario.',
      done: hasProducts,
      href: '/app/inventario',
    },
    {
      id: 'ventas',
      title: 'Elegí cómo cobrás',
      description: 'WhatsApp, pasarela propia o pasarela Mi Catálogo.',
      done: ventasOk,
      loading: ventasNeedsPlatform,
      href: '/app/cuenta/checkout-ventas',
    },
    {
      id: 'envio',
      title: 'Configurá el envío',
      description: 'Definí tarifas para que el checkout calcule el total.',
      done: envioOk,
      href: '/app/cuenta/envio',
    },
    {
      id: 'listo',
      title: 'Compartí tu catálogo',
      description: 'Con cobro y envío listos, ya podés vender online.',
      done: listoOk && hasProducts,
      href: '/app/cuenta/tienda',
    },
  ]
}

export function isNewStoreChecklistComplete(items: NewStoreChecklistItem[]): boolean {
  return items.length > 0 && items.every((item) => item.done)
}

export function newStoreChecklistProgress(items: NewStoreChecklistItem[]): {
  done: number
  total: number
  percent: number
} {
  const total = items.length
  const done = items.filter((item) => item.done).length
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
}
