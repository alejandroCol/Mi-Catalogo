import { Resend } from 'resend';
function formatCopEs(n) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(Math.round(n));
}
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/** Alineado con `src/lib/catalogTheme.ts` (catálogo público + expert). */
const PRESETS = {
    ios: {
        accent: '#1d4ed8',
        accentText: '#eff6ff',
        bg: '#e8edf5',
        surface: '#ffffff',
        text: '#0f172a',
        muted: '#64748b',
    },
    morning: {
        accent: '#171717',
        accentText: '#fafaf9',
        bg: '#f4f3f0',
        surface: '#ffffff',
        text: '#0a0a0a',
        muted: '#737373',
    },
    minimal: {
        accent: '#854d0e',
        accentText: '#fffbeb',
        bg: '#f8f5ee',
        surface: '#f2ebe0',
        text: '#1c1917',
        muted: '#78716c',
    },
    bold: {
        accent: '#ea580c',
        accentText: '#fff7ed',
        bg: '#ecfeff',
        surface: '#ffffff',
        text: '#0e7490',
        muted: '#0d9488',
    },
    boutique: {
        accent: '#be185d',
        accentText: '#fdf2f8',
        bg: '#fdf2f8',
        surface: '#ffffff',
        text: '#831843',
        muted: '#9d174d',
    },
};
function pickDefined(patch) {
    if (!patch)
        return {};
    const o = {};
    for (const k of Object.keys(patch)) {
        const v = patch[k];
        if (typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v)) {
            o[k] = v;
        }
    }
    return o;
}
const FREE_PUBLIC_THEME = {
    accent: '#171717',
    accentText: '#fafaf9',
    bg: '#f4f3f0',
    surface: '#ffffff',
    text: '#0a0a0a',
    muted: '#737373',
};
export function resolveEmailCatalogThemeColors(tenant) {
    const expert = tenant?.billingPlan === 'expert';
    if (!expert) {
        return FREE_PUBLIC_THEME;
    }
    const rawPreset = tenant?.catalogTheme?.preset;
    const preset = rawPreset && rawPreset in PRESETS ? rawPreset : 'morning';
    const base = PRESETS[preset];
    const custom = pickDefined(tenant?.catalogTheme?.colors);
    return { ...base, ...custom };
}
function buildLineRows(lineas, rowBorderColor) {
    return (Array.isArray(lineas) ? lineas : [])
        .map((l) => {
        const nombre = escapeHtml(l.nombre ?? 'Ítem');
        const cant = Math.max(0, Math.round(Number(l.cantidad) || 0));
        const pu = Math.max(0, Math.round(Number(l.precioUnitarioCop) || 0));
        const sub = pu * cant;
        return `<tr>
  <td style="padding:10px 12px;border-bottom:1px solid ${rowBorderColor};font-size:14px">${nombre}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${rowBorderColor};font-size:14px;text-align:right;white-space:nowrap">${cant}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${rowBorderColor};font-size:14px;text-align:right;white-space:nowrap">${formatCopEs(pu)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${rowBorderColor};font-size:14px;text-align:right;white-space:nowrap;font-weight:600">${formatCopEs(sub)}</td>
</tr>`;
    })
        .join('');
}
function buildEmailHtml(opts) {
    const c = opts.colors;
    const mutedBorder = '#cbd5e1';
    const lineRows = buildLineRows(opts.lineas, mutedBorder);
    const headline = opts.variant === 'customer'
        ? '¡Compra confirmada!'
        : 'Nueva venta pagada';
    const intro = opts.variant === 'customer'
        ? `<p style="margin:0 0 16px;font-size:15px">Tu pago fue <strong>aprobado</strong>. Este es el resumen de tu pedido en <strong>${escapeHtml(opts.nombreTienda)}</strong>.</p>`
        : `<p style="margin:0 0 16px;font-size:15px">Se registró un <strong>pago aprobado</strong> en <strong>${escapeHtml(opts.nombreTienda)}</strong>.</p>`;
    const clienteBits = opts.variant === 'customer'
        ? [
            opts.clienteNombre &&
                `<p style="margin:0 0 6px"><span style="color:${c.muted}">Nombre</span><br /><strong>${escapeHtml(opts.clienteNombre)}</strong></p>`,
            opts.clienteTelefono &&
                `<p style="margin:0 0 6px"><span style="color:${c.muted}">Teléfono</span><br /><strong>${escapeHtml(opts.clienteTelefono)}</strong></p>`,
            opts.envioCiudad &&
                `<p style="margin:0 0 6px"><span style="color:${c.muted}">Ciudad</span><br /><strong>${escapeHtml(opts.envioCiudad)}</strong></p>`,
            opts.envioDireccion &&
                `<p style="margin:0"><span style="color:${c.muted}">Dirección de envío</span><br /><strong>${escapeHtml(opts.envioDireccion)}</strong></p>`,
            opts.notaCliente &&
                `<p style="margin:12px 0 0"><span style="color:${c.muted}">Tu nota</span><br />${escapeHtml(opts.notaCliente)}</p>`,
        ]
            .filter(Boolean)
            .join('')
        : [
            opts.clienteNombre &&
                `<p style="margin:8px 0"><strong>Cliente:</strong> ${escapeHtml(opts.clienteNombre)}</p>`,
            opts.clienteTelefono &&
                `<p style="margin:8px 0"><strong>Teléfono:</strong> ${escapeHtml(opts.clienteTelefono)}</p>`,
            opts.clienteEmail &&
                `<p style="margin:8px 0"><strong>Correo:</strong> ${escapeHtml(opts.clienteEmail)}</p>`,
            opts.envioCiudad &&
                `<p style="margin:8px 0"><strong>Ciudad:</strong> ${escapeHtml(opts.envioCiudad)}</p>`,
            opts.envioDireccion &&
                `<p style="margin:8px 0"><strong>Dirección:</strong> ${escapeHtml(opts.envioDireccion)}</p>`,
            opts.notaCliente &&
                `<p style="margin:8px 0"><strong>Nota:</strong> ${escapeHtml(opts.notaCliente)}</p>`,
        ]
            .filter(Boolean)
            .join('');
    const summaryBox = opts.variant === 'customer'
        ? `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:16px 0;background:${c.bg};border-radius:10px;border:1px solid ${mutedBorder}">
  <tr>
    <td style="padding:16px 18px">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${c.muted}">Datos del envío</p>
      ${clienteBits || `<p style="margin:0;color:${c.muted}">Sin datos de envío registrados.</p>`}
    </td>
  </tr>
</table>`
        : clienteBits
            ? `<div style="margin:16px 0;padding:16px 18px;background:${c.bg};border-radius:10px;border:1px solid ${mutedBorder};font-size:14px">${clienteBits}</div>`
            : '';
    const trackingBox = opts.variant === 'customer' && opts.seguimientoUrl
        ? `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:16px 0 0;background:${c.bg};border-radius:10px;border:1px solid ${mutedBorder}">
  <tr>
    <td style="padding:16px 18px">
      <p style="margin:0;font-size:13px;line-height:1.55;color:${c.muted}">Para ver el estado de tu pedido y la guía de envío cuando esté despachado, usá el <strong>número de pedido</strong> de arriba en la tienda, en <strong>Seguir mi pedido</strong>.</p>
    </td>
  </tr>
</table>`
        : '';
    const cta = opts.variant === 'customer' && (opts.seguimientoUrl || opts.catalogUrl)
        ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px">
  <tr>
    <td style="padding-right:8px">
      ${opts.seguimientoUrl
            ? `<a href="${escapeHtml(opts.seguimientoUrl)}" style="display:inline-block;background:${c.accent};color:${c.accentText};text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:9999px">Seguir mi pedido</a>`
            : ''}
    </td>
    <td>
      ${opts.catalogUrl
            ? `<a href="${escapeHtml(opts.catalogUrl)}" style="display:inline-block;border:1px solid ${mutedBorder};color:${c.text};text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:9999px">Volver a la tienda</a>`
            : ''}
    </td>
  </tr>
</table>`
        : '';
    const footer = opts.variant === 'customer'
        ? `<p style="margin:20px 0 0;font-size:13px;color:${c.muted}">Gracias por tu compra. Si tenés alguna consulta sobre tu pedido, contactá a <strong>${escapeHtml(opts.nombreTienda)}</strong> por los medios que publica en su catálogo.</p>`
        : `<p style="margin:20px 0 0;font-size:13px;color:${c.muted}">Podés gestionar el pedido en el panel de Mi Catálogo → Pedidos.</p>`;
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:${c.bg};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.bg};padding:28px 14px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:${c.surface};border-radius:14px;overflow:hidden;border:1px solid ${mutedBorder};box-shadow:0 10px 40px rgba(15,23,42,0.06)">
          <tr>
            <td style="background:${c.accent};color:${c.accentText};padding:22px 26px 26px">
              <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;margin-bottom:8px">${escapeHtml(opts.nombreTienda)}</div>
              <div style="font-size:22px;font-weight:700;line-height:1.25">${headline}</div>
              <div style="margin-top:10px;font-size:15px;opacity:0.95">Total · <strong>${formatCopEs(opts.totalCop)}</strong></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 22px 28px;color:${c.text};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
              ${intro}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;font-size:14px">
                <tr>
                  <td style="padding:6px 0;color:${c.muted}">N.º de pedido</td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;word-break:break-all">${escapeHtml(opts.orderId)}</td>
                </tr>
              </table>
              ${summaryBox}
              ${trackingBox}
              <p style="margin:20px 0 8px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${c.muted}">Detalle</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px">
                <thead>
                  <tr style="background:${c.bg}">
                    <th align="left" style="padding:10px 12px;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:0.04em">Producto</th>
                    <th align="right" style="padding:10px 12px;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:0.04em">Cant.</th>
                    <th align="right" style="padding:10px 12px;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:0.04em">P. unit.</th>
                    <th align="right" style="padding:10px 12px;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:0.04em">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${lineRows}</tbody>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px">
                <tr>
                  <td style="padding-top:12px;border-top:2px solid ${c.accent};font-size:17px;font-weight:700;text-align:right">Total · ${formatCopEs(opts.totalCop)}</td>
                </tr>
              </table>
              ${cta}
              ${footer}
              <p style="margin:24px 0 0;padding-top:18px;border-top:1px solid ${mutedBorder};font-size:11px;color:${c.muted}">Enviado automáticamente por Mi Catálogo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
async function sendResendHtml(opts) {
    const resend = new Resend(opts.resendApiKey);
    try {
        const r = await resend.emails.send({
            from: opts.from,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
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
export async function sendCatalogSalePaidEmail(opts) {
    const html = buildEmailHtml({
        variant: 'owner',
        colors: opts.themeColors,
        nombreTienda: opts.nombreTienda,
        orderId: opts.orderId,
        totalCop: opts.totalCop,
        lineas: opts.lineas,
        clienteNombre: opts.clienteNombre,
        clienteTelefono: opts.clienteTelefono,
        clienteEmail: opts.clienteEmail,
        envioCiudad: opts.envioCiudad,
        envioDireccion: opts.envioDireccion,
        notaCliente: opts.notaCliente,
    });
    return sendResendHtml({
        resendApiKey: opts.resendApiKey,
        from: opts.from,
        to: opts.to,
        subject: `Venta pagada · ${opts.nombreTienda.slice(0, 60)} · ${formatCopEs(opts.totalCop)}`,
        html,
    });
}
function looksLikeEmail(s) {
    const t = s.trim();
    return t.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
export async function sendCatalogCustomerPurchaseConfirmationEmail(opts) {
    if (!looksLikeEmail(opts.to)) {
        return { ok: false, error: 'invalid_email' };
    }
    const html = buildEmailHtml({
        variant: 'customer',
        colors: opts.themeColors,
        nombreTienda: opts.nombreTienda,
        orderId: opts.orderId,
        totalCop: opts.totalCop,
        lineas: opts.lineas,
        clienteNombre: opts.clienteNombre,
        clienteTelefono: opts.clienteTelefono,
        clienteEmail: opts.clienteEmail,
        envioCiudad: opts.envioCiudad,
        envioDireccion: opts.envioDireccion,
        notaCliente: opts.notaCliente,
        catalogUrl: opts.catalogUrl,
        seguimientoUrl: opts.seguimientoUrl,
    });
    return sendResendHtml({
        resendApiKey: opts.resendApiKey,
        from: opts.from,
        to: opts.to.trim(),
        subject: `¡Compra confirmada! · ${opts.nombreTienda.slice(0, 52)} · ${formatCopEs(opts.totalCop)}`,
        html,
    });
}
