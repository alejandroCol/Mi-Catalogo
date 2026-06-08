import { getAuth } from 'firebase-admin/auth';
import { Resend } from 'resend';
import { MC_RESEND_FROM } from './mcResend.js';
const VERIFY_PATH = '/verificar-email';
export const AUTH_VERIFY_COOLDOWN_MS = 60_000;
export function buildAuthContinueUrl(publicOrigin) {
    return `${publicOrigin.trim().replace(/\/$/, '')}${VERIFY_PATH}`;
}
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/** Genera el enlace de Firebase y lo envía por Resend (remitente con tu dominio). */
export async function sendVerificationEmailWithResend(opts) {
    const continueUrl = buildAuthContinueUrl(opts.publicOrigin);
    let link;
    try {
        link = await getAuth().generateEmailVerificationLink(opts.email, {
            url: continueUrl,
            handleCodeInApp: false,
        });
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const code = e && typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '';
        return { ok: false, error: msg, firebaseCode: code || undefined };
    }
    const safeLink = escapeHtml(link);
    const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.45;color:#111827;max-width:560px">
<p>Hola,</p>
<p>Para activar tu cuenta en <strong>Mi Catálogo</strong>, confirmá tu correo con este enlace:</p>
<p><a href="${safeLink}" style="display:inline-block;margin:16px 0;padding:12px 20px;background:#111827;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Confirmar correo</a></p>
<p style="font-size:13px;color:#64748b">Si el botón no funciona, copiá y pegá esta dirección en el navegador:<br/><span style="word-break:break-all">${safeLink}</span></p>
<p style="font-size:13px;color:#64748b">Si no creaste una cuenta, podés ignorar este mensaje.</p>
</body></html>`;
    const resend = new Resend(opts.resendApiKey);
    try {
        const r = await resend.emails.send({
            from: MC_RESEND_FROM,
            to: opts.email,
            subject: 'Confirmá tu correo · Mi Catálogo',
            html,
        });
        if (r.error) {
            return { ok: false, error: String(r.error.message ?? r.error) };
        }
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}
