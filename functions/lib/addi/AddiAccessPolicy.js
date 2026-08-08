import { HttpsError } from 'firebase-functions/v2/https';
import { isMasterBillingPlan } from '../billingPlan.js';
import { isSubscriptionEndsAtActive } from '../subscriptionMs.js';
function hasMasterMembership(tenant, nowMs = Date.now()) {
    if (!isMasterBillingPlan(tenant.billingPlan))
        return false;
    if (isSubscriptionEndsAtActive(tenant.subscriptionEndsAt, nowMs))
        return true;
    const grace = tenant.billingGraceUntilMs;
    return typeof grace === 'number' && grace > nowMs;
}
/**
 * Política de acceso Addi (OCP: reglas centralizadas, no en handlers UI).
 * Por ahora solo Master con membresía activa (o gracia).
 */
export class AddiAccessPolicy {
    static assertMasterTenant(tenant, opts) {
        if (!hasMasterMembership(tenant)) {
            throw new HttpsError('failed-precondition', 'Addi está disponible solo para tiendas con plan Master activo.');
        }
        if (opts?.requireEnabled && tenant.addiPaymentsEnabled !== true) {
            throw new HttpsError('failed-precondition', 'Addi no está habilitado en esta tienda.');
        }
    }
    static canOfferAtCheckout(tenant) {
        if (!tenant)
            return false;
        if (!hasMasterMembership(tenant))
            return false;
        return tenant.addiPaymentsEnabled === true;
    }
}
