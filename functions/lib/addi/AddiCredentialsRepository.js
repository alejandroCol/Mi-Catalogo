import { FieldValue } from 'firebase-admin/firestore';
import { addiCredentialsDocPath, addiWebhookRoutePath } from './config.js';
function keyHint(value) {
    const t = value.replace(/\s/g, '');
    return t.length >= 4 ? t.slice(-4) : '****';
}
export function addiPublicHints(cred) {
    return {
        addiClientIdHint: keyHint(cred.clientId),
        addiAllySlug: cred.allySlug.trim().slice(0, 80),
    };
}
/**
 * Persistencia de credenciales Addi (ISP: solo storage).
 */
export class AddiCredentialsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async get(tenantId) {
        const snap = await this.db.doc(addiCredentialsDocPath(tenantId)).get();
        if (!snap.exists)
            return null;
        const d = snap.data();
        if (!d?.clientId || !d?.clientSecret || !d?.allySlug)
            return null;
        return d;
    }
    async save(tenantId, cred, opts) {
        const credRef = this.db.doc(addiCredentialsDocPath(tenantId));
        await credRef.set({
            clientId: cred.clientId.trim(),
            clientSecret: cred.clientSecret.trim(),
            allySlug: cred.allySlug.trim(),
            sandbox: cred.sandbox === true,
            ...(cred.callbackUser ? { callbackUser: cred.callbackUser } : {}),
            ...(cred.callbackPassword ? { callbackPassword: cred.callbackPassword } : {}),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        await this.db.doc(addiWebhookRoutePath(opts.routeKey)).set({
            tenantId,
            updatedAt: Date.now(),
        });
        await this.db.doc(`mc_tenants/${tenantId}`).update({
            addiPaymentsEnabled: opts.enabled,
            addiLinkedAt: Date.now(),
            addiWebHookK: opts.routeKey,
            addiSandbox: cred.sandbox === true,
            ...addiPublicHints(cred),
        });
    }
    async updateCallbackCredentials(tenantId, user, password) {
        await this.db.doc(addiCredentialsDocPath(tenantId)).set({
            callbackUser: user,
            callbackPassword: password,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    async delete(tenantId, routeKey) {
        if (routeKey) {
            await this.db.doc(addiWebhookRoutePath(routeKey)).delete().catch(() => undefined);
        }
        const credRef = this.db.doc(addiCredentialsDocPath(tenantId));
        const snap = await credRef.get();
        if (snap.exists)
            await credRef.delete();
        await this.db.doc(`mc_tenants/${tenantId}`).update({
            addiPaymentsEnabled: false,
            addiLinkedAt: FieldValue.delete(),
            addiWebHookK: FieldValue.delete(),
            addiClientIdHint: FieldValue.delete(),
            addiAllySlug: FieldValue.delete(),
            addiSandbox: FieldValue.delete(),
        });
    }
}
