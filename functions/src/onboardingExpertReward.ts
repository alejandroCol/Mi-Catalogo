import { randomBytes } from 'node:crypto'
import { db } from './firebaseAdmin.js'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { normalizeDiscountCode } from './billingSubscription/discountCodes.js'

const MC_ONBOARDING_EXPERT_REWARD_MS = 24 * 60 * 60 * 1000

type TenantSlice = {
  ownerUid?: string
  createdAt?: number
  onboardingSetupCompletedAt?: number
  onboardingExpertRewardCode?: string
  onboardingExpertRewardCodeId?: string
  checkoutVentasModo?: string
  onepayPaymentsEnabled?: boolean
  whatsappNumero?: string
  envioEstimadoCop?: number
  envioPorCiudad?: { ciudad?: string; cop?: number }[]
  envioUsarTarifasMicatalogo?: boolean
  envioCotizarAutomatico?: boolean
  envioOrigenDepartamento?: string
  envioOrigenCiudad?: string
  envioOrigenDireccion?: string
  envioOrigenTelefono?: string
  envioEmpaquePesoKg?: number
  envioEmpaqueLargoCm?: number
  envioEmpaqueAnchoCm?: number
  envioEmpaqueAltoCm?: number
  billingPlan?: string
}

function isEnvioCotizacionAutomaticaConfigured(tenant: TenantSlice): boolean {
  if (tenant.envioCotizarAutomatico !== true) return false
  if (!tenant.envioOrigenDepartamento?.trim()) return false
  if (!tenant.envioOrigenCiudad?.trim()) return false
  if (!tenant.envioOrigenDireccion?.trim()) return false
  if (!tenant.envioOrigenTelefono?.replace(/\D/g, '')) return false
  const peso = tenant.envioEmpaquePesoKg
  const largo = tenant.envioEmpaqueLargoCm
  const ancho = tenant.envioEmpaqueAnchoCm
  const alto = tenant.envioEmpaqueAltoCm
  return (
    typeof peso === 'number' &&
    peso > 0 &&
    typeof largo === 'number' &&
    largo > 0 &&
    typeof ancho === 'number' &&
    ancho > 0 &&
    typeof alto === 'number' &&
    alto > 0
  )
}

type PlatformSlice = {
  pasarelaMicatalogoActiva?: boolean
  envioMicatalogoEstimadoCop?: number
  envioMicatalogoPorCiudad?: { ciudad?: string; cop?: number }[]
}

function isCheckoutVentasConfigured(tenant: TenantSlice, platform: PlatformSlice | null): boolean {
  const modo = tenant.checkoutVentasModo
  if (modo === 'whatsapp') {
    const wa = tenant.whatsappNumero?.replace(/\D/g, '') ?? ''
    return wa.length >= 10 && wa.length <= 15
  }
  if (modo === 'pasarela') return tenant.onepayPaymentsEnabled === true
  if (modo === 'pasarela_micatalogo') return platform?.pasarelaMicatalogoActiva === true
  return false
}

function isEnvioCheckoutConfigured(tenant: TenantSlice, _platform: PlatformSlice | null): boolean {
  if (isEnvioCotizacionAutomaticaConfigured(tenant)) return true
  if (tenant.envioCotizarAutomatico !== true) {
    return (tenant.envioPorCiudad?.length ?? 0) > 0
  }
  return false
}

function isCatalogoVendedorListo(tenant: TenantSlice, platform: PlatformSlice | null): boolean {
  return isCheckoutVentasConfigured(tenant, platform) && isEnvioCheckoutConfigured(tenant, platform)
}

async function tenantHasProducts(tenantId: string): Promise<boolean> {
  const snap = await db.collection(`mc_tenants/${tenantId}/productos`).limit(1).get()
  return snap.docs.length > 0
}

async function resolveTenantOwner(uid: string): Promise<{ tenantId: string; tenant: TenantSlice }> {
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  const tenantId = (userSnap.data() as { tenantId?: string }).tenantId
  if (!tenantId) throw new HttpsError('failed-precondition', 'Sin tienda asociada.')
  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')
  const tenant = tenantSnap.data() as TenantSlice
  if (tenant.ownerUid !== uid) {
    throw new HttpsError('permission-denied', 'Solo el dueño puede completar el onboarding.')
  }
  return { tenantId, tenant }
}

function generateRewardCode(): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase()
  return `EXPERT-${suffix}`
}

async function createOnboardingRewardCode(
  tenantId: string,
  freeMonths: number,
): Promise<{ code: string; codeId: string }> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRewardCode()
    const norm = normalizeDiscountCode(code)
    const existing = await db
      .collection('mc_billing_discount_codes')
      .where('codeNormalized', '==', norm)
      .limit(1)
      .get()
    if (!existing.empty) continue

    const ref = await db.collection('mc_billing_discount_codes').add({
      code: norm,
      codeNormalized: norm,
      active: true,
      priceCop: 0,
      freeMonths,
      billingPeriod: 'monthly',
      restrictedTenantId: tenantId,
      requiresPaymentMethod: true,
      maxRedemptions: 1,
      redemptionCount: 0,
      label: 'Recompensa onboarding tienda nueva',
      updatedAt: Date.now(),
    })
    return { code: norm, codeId: ref.id }
  }
  throw new HttpsError('internal', 'No se pudo generar un código único.')
}

/**
 * Marca el checklist como completado y emite código Expert (solo dentro de 24 h desde el registro).
 */
export const mcFinalizeNewStoreOnboarding = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')

  const { tenantId, tenant } = await resolveTenantOwner(uid)
  const now = Date.now()

  if (tenant.onboardingSetupCompletedAt) {
    return {
      ok: true as const,
      alreadyCompleted: true,
      rewardCode: tenant.onboardingExpertRewardCode ?? null,
      rewardEligible: Boolean(tenant.onboardingExpertRewardCode),
    }
  }

  const platformSnap = await db.doc('mc_platform/settings').get()
  const platform = platformSnap.exists ? (platformSnap.data() as PlatformSlice) : null
  const hasProducts = await tenantHasProducts(tenantId)

  if (!hasProducts) {
    throw new HttpsError('failed-precondition', 'Agregá al menos un producto para completar la tienda.')
  }
  if (!isCatalogoVendedorListo(tenant, platform)) {
    throw new HttpsError(
      'failed-precondition',
      'Completá cómo cobrás y el envío antes de finalizar.',
    )
  }

  const withinRewardWindow =
    typeof tenant.createdAt === 'number' &&
    now - tenant.createdAt <= MC_ONBOARDING_EXPERT_REWARD_MS

  let rewardCode: string | null = null
  let rewardCodeId: string | null = null

  if (withinRewardWindow) {
    const issued = await createOnboardingRewardCode(tenantId, 1)
    rewardCode = issued.code
    rewardCodeId = issued.codeId
  }

  await db.doc(`mc_tenants/${tenantId}`).set(
    {
      onboardingSetupCompletedAt: now,
      ...(rewardCode ? { onboardingExpertRewardCode: rewardCode } : {}),
      ...(rewardCodeId ? { onboardingExpertRewardCodeId: rewardCodeId } : {}),
      updatedAt: now,
    },
    { merge: true },
  )

  return {
    ok: true as const,
    alreadyCompleted: false,
    rewardCode,
    rewardEligible: withinRewardWindow,
  }
})
