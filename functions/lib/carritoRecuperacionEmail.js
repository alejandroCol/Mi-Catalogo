import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { resolveEmailCatalogThemeColors } from './catalogSaleEmail.js';
import { MC_RESEND_FROM } from './mcResend.js';
import { buildStorePublicUrl } from './storePublicUrl.js';
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function formatCopEs(n) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(Math.round(n));
}
function looksLikeEmail(s) {
    const t = s.trim();
    return t.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
function normalizeCuponCodigo(raw) {
    return raw.trim().toUpperCase().replace(/\s+/g, '');
}
function generateRecoveryCouponCode() {
    return `RECUP-${randomBytes(3).toString('hex').toUpperCase()}`;
}
function buildRecoveryEmailHtml(opts) {
    const c = opts.colors;
    const mutedBorder = '#cbd5e1';
    const saludo = opts.clienteNombre?.trim()
        ? `Hola ${escapeHtml(opts.clienteNombre.trim().split(/\s+/)[0] ?? '')}`
        : 'Hola';
    const lineRows = opts.lineas
        .map((l) => {
        const titulo = escapeHtml((typeof l.referencia === 'string' && l.referencia.trim()) || l.titulo || 'Producto');
        const cant = Math.max(0, Math.round(Number(l.cantidad) || 0));
        const pu = Math.max(0, Math.round(Number(l.precioUnitarioCop) || 0));
        return `<tr>
  <td style="padding:10px 12px;border-bottom:1px solid ${mutedBorder};font-size:14px">${titulo}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${mutedBorder};font-size:14px;text-align:right">${cant}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${mutedBorder};font-size:14px;text-align:right;font-weight:600">${formatCopEs(pu * cant)}</td>
</tr>`;
    })
        .join('');
    const discountBlock = opts.descuentoPorcentaje > 0 && opts.cuponCodigo
        ? `<p style="margin:16px 0;padding:14px 16px;background:${c.bg};border-radius:10px;border:1px solid ${mutedBorder};font-size:15px;line-height:1.5">
  Te dejamos un <strong>${opts.descuentoPorcentaje}% de descuento</strong> con el código
  <strong>${escapeHtml(opts.cuponCodigo)}</strong> (ya aplicado en el link).
</p>`
        : '';
    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${c.bg};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.bg};padding:28px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:${c.surface};border-radius:14px;overflow:hidden;border:1px solid ${mutedBorder}">
        <tr>
          <td style="background:${c.accent};color:${c.accentText};padding:22px 26px">
            <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;margin-bottom:8px">${escapeHtml(opts.nombreTienda)}</div>
            <div style="font-size:22px;font-weight:700">¿Terminás tu compra?</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 22px 28px;color:${c.text};font-family:system-ui,-apple-system,sans-serif">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55">${saludo}, dejaste productos en el carrito de <strong>${escapeHtml(opts.nombreTienda)}</strong>. Podés retomar tu pedido cuando quieras.</p>
            ${discountBlock}
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px;margin:8px 0">
              <thead><tr style="background:${c.bg}">
                <th align="left" style="padding:10px 12px;font-size:12px;color:${c.muted}">Producto</th>
                <th align="right" style="padding:10px 12px;font-size:12px;color:${c.muted}">Cant.</th>
                <th align="right" style="padding:10px 12px;font-size:12px;color:${c.muted}">Subtotal</th>
              </tr></thead>
              <tbody>${lineRows}</tbody>
            </table>
            <p style="margin:16px 0 0;font-size:16px;font-weight:700;text-align:right">Subtotal · ${formatCopEs(opts.subtotalCop)}</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px">
              <tr><td>
                <a href="${escapeHtml(opts.recoveryUrl)}" style="display:inline-block;background:${c.accent};color:${c.accentText};text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:9999px">Retomar mi compra</a>
              </td></tr>
            </table>
            <p style="margin:16px 0 0;font-size:12px;color:${c.muted};word-break:break-all">${escapeHtml(opts.recoveryUrl)}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
export async function sendCarritoRecuperacionEmail(opts) {
    if (!looksLikeEmail(opts.to)) {
        return { ok: false, error: 'invalid_email' };
    }
    const colors = resolveEmailCatalogThemeColors(opts.tenant);
    const html = buildRecoveryEmailHtml({
        nombreTienda: opts.nombreTienda,
        clienteNombre: opts.clienteNombre,
        lineas: opts.lineas,
        subtotalCop: opts.subtotalCop,
        recoveryUrl: opts.recoveryUrl,
        descuentoPorcentaje: opts.descuentoPorcentaje,
        cuponCodigo: opts.cuponCodigo,
        colors,
    });
    const resend = new Resend(opts.resendApiKey);
    try {
        const r = await resend.emails.send({
            from: MC_RESEND_FROM,
            to: opts.to.trim(),
            subject: `Tu carrito en ${opts.nombreTienda.slice(0, 48)} · retomá tu compra`,
            html,
        });
        if (r.error) {
            return {
                ok: false,
                error: String(r.error.message ?? r.error),
            };
        }
        const messageId = r.data?.id?.trim();
        if (!messageId) {
            return { ok: false, error: 'resend_no_message_id' };
        }
        return { ok: true, messageId };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'resend_error' };
    }
}
function upsertRecoveryCouponInCatalog(cuponesCatalogo, carritoId, pct, existingCodigo) {
    const prev = Array.isArray(cuponesCatalogo) ? cuponesCatalogo : [];
    const prevRecup = prev.find((c) => c.esRecuperacion === true && c.carritoIniciadoId === carritoId);
    const codigo = normalizeCuponCodigo(existingCodigo?.trim() || prevRecup?.codigo || generateRecoveryCouponCode());
    const cupon = {
        id: prevRecup?.id ?? randomBytes(8).toString('hex'),
        codigo,
        tipo: 'porcentaje',
        valor: pct,
        activo: true,
        esRecuperacion: true,
        carritoIniciadoId: carritoId,
    };
    return {
        codigo,
        cuponesCatalogo: [
            ...prev.filter((c) => !(c.esRecuperacion === true && c.carritoIniciadoId === carritoId)),
            cupon,
        ],
    };
}
function mapResendSendError(error) {
    const blob = error.toLowerCase();
    if (blob.includes('only send testing emails') || blob.includes('verify a domain')) {
        return 'El dominio de correo no está verificado en Resend. Contactá soporte de Mi Catálogo.';
    }
    if (blob.includes('invalid') && blob.includes('from')) {
        return 'El remitente de correo no está configurado correctamente.';
    }
    return 'No pudimos enviar el correo. Probá en unos minutos.';
}
const RECUP_EMAIL_COOLDOWN_MS = 5 * 60 * 1000;
export async function mcSendCarritoRecuperacionEmailHandler(db, uid, dataRaw, resendApiKey, publicOrigin) {
    if (!resendApiKey) {
        throw new HttpsError('failed-precondition', 'Falta configurar RESEND_API_KEY para enviar correos de recuperación.');
    }
    const data = (dataRaw && typeof dataRaw === 'object' ? dataRaw : {});
    const carritoId = typeof data.carritoId === 'string' ? data.carritoId.trim() : '';
    if (!carritoId) {
        throw new HttpsError('invalid-argument', 'Carrito inválido.');
    }
    const pct = Math.min(100, Math.max(0, Math.round(Number(data.descuentoPorcentaje) || 0)));
    const userSnap = await db.doc(`mc_users/${uid}`).get();
    if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'Usuario no encontrado.');
    }
    const tenantId = userSnap.data().tenantId?.trim();
    if (!tenantId) {
        throw new HttpsError('failed-precondition', 'Tienda no encontrada.');
    }
    const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get();
    if (!tenantSnap.exists) {
        throw new HttpsError('not-found', 'Tienda no encontrada.');
    }
    const tenant = tenantSnap.data();
    if (tenant.ownerUid !== uid) {
        throw new HttpsError('permission-denied', 'Solo el dueño puede enviar recordatorios.');
    }
    const slug = tenant.slug?.trim();
    if (!slug) {
        throw new HttpsError('failed-precondition', 'La tienda no tiene URL pública.');
    }
    const carritoRef = db.doc(`mc_tenants/${tenantId}/carritos_iniciados/${carritoId}`);
    const carritoSnap = await carritoRef.get();
    if (!carritoSnap.exists) {
        throw new HttpsError('not-found', 'Carrito no encontrado.');
    }
    const carrito = carritoSnap.data();
    if (carrito.estado !== 'activo') {
        throw new HttpsError('failed-precondition', 'Este carrito ya no está pendiente.');
    }
    const email = carrito.clienteEmail?.trim() ?? '';
    if (!looksLikeEmail(email)) {
        throw new HttpsError('failed-precondition', 'Este carrito no tiene un correo válido del cliente.');
    }
    const throttleRef = db.doc(`mc_carrito_recup_email_throttle/${tenantId}_${carritoId}`);
    const throttleSnap = await throttleRef.get();
    const lastSent = throttleSnap.data()?.lastSentAt ?? 0;
    const now = Date.now();
    if (lastSent > 0 && now - lastSent < RECUP_EMAIL_COOLDOWN_MS) {
        throw new HttpsError('resource-exhausted', 'Esperá unos minutos antes de reenviar el correo.');
    }
    let codigo = carrito.cuponCodigo?.trim() ?? '';
    if (pct > 0) {
        const upserted = upsertRecoveryCouponInCatalog(tenant.cuponesCatalogo, carritoId, pct, codigo);
        codigo = upserted.codigo;
        await db.doc(`mc_tenants/${tenantId}`).update({ cuponesCatalogo: upserted.cuponesCatalogo });
    }
    const recoveryUrl = buildStorePublicUrl(publicOrigin, slug, `/checkout?r=${encodeURIComponent(carritoId)}${pct > 0 && codigo ? `&cupon=${encodeURIComponent(codigo)}` : ''}`);
    const sent = await sendCarritoRecuperacionEmail({
        resendApiKey,
        to: email,
        nombreTienda: tenant.nombreTienda?.trim() || 'Tu tienda',
        clienteNombre: carrito.clienteNombre,
        lineas: Array.isArray(carrito.lineas) ? carrito.lineas : [],
        subtotalCop: Math.max(0, Math.round(Number(carrito.subtotalCop) || 0)),
        recoveryUrl,
        descuentoPorcentaje: pct,
        cuponCodigo: pct > 0 ? codigo : undefined,
        tenant,
    });
    if (!sent.ok) {
        console.error('[mcSendCarritoRecuperacionEmail]', sent.error, { tenantId, carritoId, to: email });
        throw new HttpsError('internal', mapResendSendError(sent.error ?? 'resend_error'));
    }
    console.info('[mcSendCarritoRecuperacionEmail] sent', {
        tenantId,
        carritoId,
        to: email,
        messageId: sent.messageId,
        descuentoPorcentaje: pct,
    });
    await carritoRef.update({
        ...(codigo ? { cuponCodigo: codigo } : {}),
        descuentoPorcentaje: pct,
        recordatorioEnviadoAt: now,
        updatedAt: now,
    });
    await throttleRef.set({ lastSentAt: now, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
}
