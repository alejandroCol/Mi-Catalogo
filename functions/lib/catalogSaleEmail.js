import { Resend } from 'resend';
import { isPaidBillingPlan } from './billingPlan.js';
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
function optStr(v) {
    if (typeof v !== 'string')
        return undefined;
    const t = v.trim();
    return t || undefined;
}
function optNum(v) {
    if (typeof v !== 'number' || !Number.isFinite(v))
        return undefined;
    return Math.round(v);
}
function formatDeptoEtiqueta(d) {
    return d
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
function lineaLabel(l) {
    const ref = optStr(l.referencia);
    const nom = optStr(l.nombre) || 'Ítem';
    const sub = optStr(l.subtitulo);
    const main = ref || nom;
    const extra = [ref && nom && ref !== nom ? nom : '', sub].filter(Boolean).join(' · ');
    return extra ? `${main} · ${extra}` : main;
}
function whatsappHref(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.length < 10)
        return undefined;
    return `https://wa.me/${d}`;
}
function medioPagoFromOrder(o) {
    if (o.pagoContraEntrega === true)
        return 'Contraentrega';
    if (o.pagoAddi === true)
        return 'Addi';
    if (o.pagoOnePay === true && o.onepayViaMicatalogo === true)
        return 'Pasarela Mi Catálogo';
    if (o.pagoOnePay === true)
        return 'Pago en línea';
    if (o.onepayViaMicatalogo === true)
        return 'Pasarela Mi Catálogo';
    return undefined;
}
export function catalogSaleOrderSliceFromData(o, fallbackMedioPago) {
    const lineasRaw = Array.isArray(o.lineas) ? o.lineas : [];
    const lineas = lineasRaw.map((raw) => {
        const l = (raw && typeof raw === 'object' ? raw : {});
        return {
            nombre: optStr(l.nombre),
            referencia: optStr(l.referencia),
            subtitulo: optStr(l.subtitulo),
            cantidad: optNum(l.cantidad),
            precioUnitarioCop: optNum(l.precioUnitarioCop),
        };
    });
    return {
        totalCop: optNum(o.totalCop) ?? 0,
        subtotalCop: optNum(o.subtotalCop),
        envioCop: optNum(o.envioCop),
        descuentoCop: optNum(o.descuentoCop),
        cuponCodigo: optStr(o.cuponCodigo),
        numeroReferencia: optStr(o.numeroReferencia),
        medioPago: medioPagoFromOrder(o) ?? optStr(fallbackMedioPago),
        lineas,
        clienteNombre: optStr(o.clienteNombre),
        clienteTelefono: optStr(o.clienteTelefono),
        clienteEmail: optStr(o.clienteEmail),
        clienteTipoDocumento: optStr(o.clienteTipoDocumento),
        clienteDocumentoNumero: optStr(o.clienteDocumentoNumero),
        envioCiudad: optStr(o.envioCiudad),
        envioDepartamento: optStr(o.envioDepartamento),
        envioDireccion: optStr(o.envioDireccion),
        envioReferencia: optStr(o.envioReferencia),
        notaCliente: optStr(o.notaCliente),
    };
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
    const expert = isPaidBillingPlan(tenant?.billingPlan);
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
        const nombre = escapeHtml(lineaLabel(l));
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
function metaRow(label, value, muted) {
    return `<tr>
  <td style="padding:6px 0;color:${muted};vertical-align:top;padding-right:12px">${label}</td>
  <td style="padding:6px 0;text-align:right;font-weight:600;word-break:break-word">${value}</td>
</tr>`;
}
function labeledBit(label, value, muted) {
    return `<p style="margin:0 0 10px"><span style="color:${muted}">${label}</span><br /><strong>${value}</strong></p>`;
}
function buildEmailHtml(opts) {
    const c = opts.colors;
    const mutedBorder = '#cbd5e1';
    const lineRows = buildLineRows(opts.lineas, mutedBorder);
    const orderLabel = opts.variant === 'owner' && opts.numeroReferencia?.trim()
        ? opts.numeroReferencia.trim()
        : opts.orderId;
    const waUrl = opts.variant === 'owner' ? whatsappHref(opts.clienteTelefono) : undefined;
    const depto = opts.envioDepartamento ? formatDeptoEtiqueta(opts.envioDepartamento) : '';
    const documento = [opts.clienteTipoDocumento, opts.clienteDocumentoNumero].filter(Boolean).join(' · ');
    const headline = opts.variant === 'customer'
        ? '¡Compra confirmada!'
        : '¡Hiciste una venta!';
    const intro = opts.variant === 'customer'
        ? `<p style="margin:0 0 16px;font-size:15px">Tu pago fue <strong>aprobado</strong>. Este es el resumen de tu pedido en <strong>${escapeHtml(opts.nombreTienda)}</strong>.</p>`
        : `<p style="margin:0 0 16px;font-size:15px">Acaba de entrar un <strong>pago aprobado</strong> en <strong>${escapeHtml(opts.nombreTienda)}</strong>. Acá tenés los datos para preparar el envío.</p>`;
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
            opts.clienteNombre && labeledBit('Cliente', escapeHtml(opts.clienteNombre), c.muted),
            opts.clienteTelefono &&
                labeledBit('Teléfono', waUrl
                    ? `<a href="${escapeHtml(waUrl)}" style="color:${c.text};text-decoration:underline">${escapeHtml(opts.clienteTelefono)}</a>`
                    : escapeHtml(opts.clienteTelefono), c.muted),
            opts.clienteEmail && labeledBit('Correo', escapeHtml(opts.clienteEmail), c.muted),
            documento && labeledBit('Documento', escapeHtml(documento), c.muted),
            opts.envioCiudad && labeledBit('Ciudad', escapeHtml(opts.envioCiudad), c.muted),
            depto && labeledBit('Departamento', escapeHtml(depto), c.muted),
            opts.envioDireccion && labeledBit('Dirección', escapeHtml(opts.envioDireccion), c.muted),
            opts.envioReferencia && labeledBit('Referencia', escapeHtml(opts.envioReferencia), c.muted),
            opts.notaCliente && labeledBit('Nota del cliente', escapeHtml(opts.notaCliente), c.muted),
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
            ? `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:16px 0;background:${c.bg};border-radius:10px;border:1px solid ${mutedBorder}">
  <tr>
    <td style="padding:16px 18px;font-size:14px">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${c.muted}">Cliente y envío</p>
      ${clienteBits}
    </td>
  </tr>
</table>`
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
        : opts.variant === 'owner' && (opts.pedidosUrl || waUrl)
            ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px">
  <tr>
    <td style="padding-right:8px">
      ${opts.pedidosUrl
                ? `<a href="${escapeHtml(opts.pedidosUrl)}" style="display:inline-block;background:${c.accent};color:${c.accentText};text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:9999px">Ver pedido</a>`
                : ''}
    </td>
    <td>
      ${waUrl
                ? `<a href="${escapeHtml(waUrl)}" style="display:inline-block;border:1px solid ${mutedBorder};color:${c.text};text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:9999px">WhatsApp del cliente</a>`
                : ''}
    </td>
  </tr>
</table>`
            : '';
    const footer = opts.variant === 'customer'
        ? `<p style="margin:20px 0 0;font-size:13px;color:${c.muted}">Gracias por tu compra. Si tenés alguna consulta sobre tu pedido, contactá a <strong>${escapeHtml(opts.nombreTienda)}</strong> por los medios que publica en su catálogo.</p>`
        : `<p style="margin:20px 0 0;font-size:13px;color:${c.muted}">Gestioná el pedido en <strong>Mi Catálogo → Ventas</strong>.</p>`;
    const orderMetaRows = [
        metaRow('N.º de pedido', escapeHtml(orderLabel), c.muted),
        opts.variant === 'owner' && opts.medioPago
            ? metaRow('Pago', escapeHtml(opts.medioPago), c.muted)
            : '',
    ]
        .filter(Boolean)
        .join('');
    const showBreakdown = opts.variant === 'owner' &&
        ((opts.subtotalCop != null && opts.subtotalCop > 0) ||
            (opts.envioCop != null && opts.envioCop > 0) ||
            (opts.descuentoCop != null && opts.descuentoCop > 0) ||
            !!opts.cuponCodigo);
    const totalsBlock = showBreakdown
        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;font-size:14px">
  ${opts.subtotalCop != null && opts.subtotalCop > 0
            ? `<tr><td style="padding:4px 0;color:${c.muted}">Subtotal</td><td style="padding:4px 0;text-align:right">${formatCopEs(opts.subtotalCop)}</td></tr>`
            : ''}
  ${opts.envioCop != null && opts.envioCop > 0
            ? `<tr><td style="padding:4px 0;color:${c.muted}">Envío</td><td style="padding:4px 0;text-align:right">${formatCopEs(opts.envioCop)}</td></tr>`
            : ''}
  ${opts.descuentoCop != null && opts.descuentoCop > 0
            ? `<tr><td style="padding:4px 0;color:${c.muted}">Descuento${opts.cuponCodigo ? ` (${escapeHtml(opts.cuponCodigo)})` : ''}</td><td style="padding:4px 0;text-align:right">−${formatCopEs(opts.descuentoCop)}</td></tr>`
            : ''}
  <tr>
    <td style="padding-top:12px;border-top:2px solid ${c.accent};font-size:17px;font-weight:700">Total</td>
    <td style="padding-top:12px;border-top:2px solid ${c.accent};font-size:17px;font-weight:700;text-align:right">${formatCopEs(opts.totalCop)}</td>
  </tr>
</table>`
        : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px">
  <tr>
    <td style="padding-top:12px;border-top:2px solid ${c.accent};font-size:17px;font-weight:700;text-align:right">Total · ${formatCopEs(opts.totalCop)}</td>
  </tr>
</table>`;
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
                ${orderMetaRows}
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
              ${totalsBlock}
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
        clienteTipoDocumento: opts.clienteTipoDocumento,
        clienteDocumentoNumero: opts.clienteDocumentoNumero,
        envioCiudad: opts.envioCiudad,
        envioDepartamento: opts.envioDepartamento,
        envioDireccion: opts.envioDireccion,
        envioReferencia: opts.envioReferencia,
        notaCliente: opts.notaCliente,
        numeroReferencia: opts.numeroReferencia,
        medioPago: opts.medioPago,
        subtotalCop: opts.subtotalCop,
        envioCop: opts.envioCop,
        descuentoCop: opts.descuentoCop,
        cuponCodigo: opts.cuponCodigo,
        pedidosUrl: opts.pedidosUrl,
    });
    return sendResendHtml({
        resendApiKey: opts.resendApiKey,
        from: opts.from,
        to: opts.to,
        subject: `¡Hiciste una venta! · ${opts.nombreTienda.slice(0, 52)} · ${formatCopEs(opts.totalCop)}`,
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
        numeroReferencia: opts.numeroReferencia,
    });
    return sendResendHtml({
        resendApiKey: opts.resendApiKey,
        from: opts.from,
        to: opts.to.trim(),
        subject: `¡Compra confirmada! · ${opts.nombreTienda.slice(0, 52)} · ${formatCopEs(opts.totalCop)}`,
        html,
    });
}
