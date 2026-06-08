import { getAuth } from 'firebase-admin/auth';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { Resend } from 'resend';
import { db } from './firebaseAdmin.js';
import { buildStorePublicUrl } from './storePublicUrl.js';
import { MC_RESEND_FROM } from './mcResend.js';
const resendApiKey = defineSecret('RESEND_API_KEY');
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/** Aviso al correo configurado en súper admin cuando se crea una tienda. */
export const mcOnTenantCreatedNotify = onDocumentCreated({
    document: 'mc_tenants/{tenantId}',
    secrets: [resendApiKey],
}, async (event) => {
    const tenantId = event.params.tenantId;
    const data = event.data?.data();
    if (!data)
        return;
    const settingsSnap = await db.doc('mc_platform/settings').get();
    const notifyEmail = String(settingsSnap.data()?.newStoreNotifyEmail ?? '').trim();
    if (!notifyEmail) {
        console.info('[mcOnTenantCreatedNotify] Sin newStoreNotifyEmail en mc_platform/settings');
        return;
    }
    const key = resendApiKey.value()?.trim();
    if (!key) {
        console.warn('[mcOnTenantCreatedNotify] RESEND_API_KEY no configurada');
        return;
    }
    const nombreTienda = String(data.nombreTienda ?? 'Sin nombre');
    const slug = String(data.slug ?? '');
    const whatsapp = String(data.whatsappNumero ?? '');
    const ownerUid = String(data.ownerUid ?? '');
    const createdAtMs = typeof data.createdAt === 'number' ? data.createdAt : Date.now();
    let ownerEmail = '';
    let ownerName = nombreTienda;
    if (ownerUid) {
        const userSnap = await db.doc(`mc_users/${ownerUid}`).get();
        if (userSnap.exists) {
            ownerEmail = String(userSnap.data()?.email ?? '');
            ownerName = String(userSnap.data()?.displayName ?? ownerName);
        }
        if (!ownerEmail) {
            try {
                const authUser = await getAuth().getUser(ownerUid);
                ownerEmail = authUser.email ?? '';
            }
            catch {
                /* best-effort */
            }
        }
    }
    const createdLabel = new Date(createdAtMs).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Bogota',
    });
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;max-width:560px">
<p><strong>Nueva tienda registrada en Mi Catálogo</strong></p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
<tr><td style="padding:8px 0;color:#64748b;width:38%">Tienda</td><td style="padding:8px 0"><strong>${escapeHtml(nombreTienda)}</strong></td></tr>
<tr><td style="padding:8px 0;color:#64748b">URL pública</td><td style="padding:8px 0"><code>${escapeHtml(slug ? buildStorePublicUrl('https://micatalogo.io', slug) : '—')}</code></td></tr>
<tr><td style="padding:8px 0;color:#64748b">Dueño</td><td style="padding:8px 0">${escapeHtml(ownerName)}</td></tr>
<tr><td style="padding:8px 0;color:#64748b">Correo</td><td style="padding:8px 0">${escapeHtml(ownerEmail || '—')}</td></tr>
<tr><td style="padding:8px 0;color:#64748b">WhatsApp</td><td style="padding:8px 0">${escapeHtml(whatsapp || '—')}</td></tr>
<tr><td style="padding:8px 0;color:#64748b">Registro</td><td style="padding:8px 0">${escapeHtml(createdLabel)}</td></tr>
<tr><td style="padding:8px 0;color:#64748b">Tenant ID</td><td style="padding:8px 0;font-size:12px;word-break:break-all">${escapeHtml(tenantId)}</td></tr>
</table>
<p style="font-size:13px;color:#64748b">Podés ver analíticas desglosadas en el panel súper admin → Analíticas.</p>
</body></html>`;
    const resend = new Resend(key);
    const sent = await resend.emails.send({
        from: MC_RESEND_FROM,
        to: notifyEmail,
        subject: `Nueva tienda · ${nombreTienda}`,
        html,
    });
    if (sent.error) {
        console.error('[mcOnTenantCreatedNotify]', sent.error);
    }
});
