import { Resend } from 'resend'
import { HttpsError } from 'firebase-functions/v2/https'
import { resolveEmailCatalogThemeColors } from './catalogSaleEmail.js'
import { MC_RESEND_FROM } from './mcResend.js'
import { resolveTenantForPosStaff } from './posTenantAccess.js'
import type { Firestore } from 'firebase-admin/firestore'

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatCopEs(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

export function looksLikeEmail(s: string): boolean {
  const t = s.trim()
  return t.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

function formatFechaHoraEs(ms: number): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms))
}

const METODO_PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  nequi: 'Nequi',
  credito: 'Crédito',
}

type PosLinea = {
  nombre?: string
  cantidad?: number
  precioUnitarioCop?: number
  subtotalCop?: number
  descuentoCop?: number
}

function safeLogoImgUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const u = raw.trim()
  if (!u.startsWith('https://')) return undefined
  return u
}

function buildPosReciboEmailHtml(opts: {
  nombreTienda: string
  logoUrl?: string
  ventaRef: string
  sedeNombre: string
  vendedorNombre: string
  fechaVentaMs: number
  lineas: PosLinea[]
  pagosLabel: string
  totalCop: number
  descuentoGlobalCop?: number
  clienteNombre?: string
  colors: ReturnType<typeof resolveEmailCatalogThemeColors>
}): string {
  const c = opts.colors
  const mutedBorder = '#cbd5e1'
  const saludo = opts.clienteNombre?.trim()
    ? `Hola ${escapeHtml(opts.clienteNombre.trim().split(/\s+/)[0] ?? '')},`
    : 'Hola,'

  const logoBlock = opts.logoUrl
    ? `<img src="${escapeHtml(opts.logoUrl)}" alt="" width="120" style="display:block;max-width:120px;max-height:56px;height:auto;margin:0 auto 14px;border-radius:8px" />`
    : ''

  const lineRows = opts.lineas
    .map((l) => {
      const nombre = escapeHtml(l.nombre?.trim() || 'Producto')
      const cant = Math.max(0, Math.round(Number(l.cantidad) || 0))
      const pu = Math.max(0, Math.round(Number(l.precioUnitarioCop) || 0))
      const sub = Math.max(0, Math.round(Number(l.subtotalCop) || pu * cant))
      const desc =
        l.descuentoCop != null && l.descuentoCop > 0
          ? `<br /><span style="font-size:12px;color:${c.muted}">Desc. −${formatCopEs(l.descuentoCop)}</span>`
          : ''
      return `<tr>
  <td style="padding:10px 12px;border-bottom:1px solid ${mutedBorder};font-size:14px">${nombre}${desc}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${mutedBorder};font-size:14px;text-align:right;white-space:nowrap">${cant}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${mutedBorder};font-size:14px;text-align:right;white-space:nowrap">${formatCopEs(pu)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid ${mutedBorder};font-size:14px;text-align:right;white-space:nowrap;font-weight:600">${formatCopEs(sub)}</td>
</tr>`
    })
    .join('')

  const descGlobalRow =
    opts.descuentoGlobalCop != null && opts.descuentoGlobalCop > 0
      ? `<tr><td colspan="3" style="padding:8px 12px 0;text-align:right;font-size:14px;color:${c.muted}">Descuento</td><td style="padding:8px 12px 0;text-align:right;font-size:14px;color:${c.muted}">−${formatCopEs(opts.descuentoGlobalCop)}</td></tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${c.bg};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.bg};padding:28px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:${c.surface};border-radius:14px;overflow:hidden;border:1px solid ${mutedBorder};box-shadow:0 10px 40px rgba(15,23,42,0.06)">
        <tr>
          <td style="background:${c.accent};color:${c.accentText};padding:22px 26px 26px;text-align:center">
            ${logoBlock}
            <div style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;margin-bottom:8px">${escapeHtml(opts.nombreTienda)}</div>
            <div style="font-size:22px;font-weight:700;line-height:1.25">Recibo de pago</div>
            <div style="margin-top:10px;font-size:15px;opacity:0.95">Total · <strong>${formatCopEs(opts.totalCop)}</strong></div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 22px 28px;color:${c.text};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55">${saludo} este es el comprobante de tu compra en <strong>${escapeHtml(opts.nombreTienda)}</strong>.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;font-size:14px">
              <tr><td style="padding:4px 0;color:${c.muted}">Referencia</td><td style="padding:4px 0;text-align:right;font-weight:600">${escapeHtml(opts.ventaRef)}</td></tr>
              <tr><td style="padding:4px 0;color:${c.muted}">Fecha</td><td style="padding:4px 0;text-align:right;font-weight:600">${escapeHtml(formatFechaHoraEs(opts.fechaVentaMs))}</td></tr>
              <tr><td style="padding:4px 0;color:${c.muted}">Sede</td><td style="padding:4px 0;text-align:right;font-weight:600">${escapeHtml(opts.sedeNombre)}</td></tr>
              <tr><td style="padding:4px 0;color:${c.muted}">Atendido por</td><td style="padding:4px 0;text-align:right;font-weight:600">${escapeHtml(opts.vendedorNombre)}</td></tr>
              <tr><td style="padding:4px 0;color:${c.muted}">Forma de pago</td><td style="padding:4px 0;text-align:right;font-weight:600">${escapeHtml(opts.pagosLabel)}</td></tr>
            </table>
            <p style="margin:20px 0 8px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${c.muted}">Detalle</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px">
              <thead><tr style="background:${c.bg}">
                <th align="left" style="padding:10px 12px;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:0.04em">Producto</th>
                <th align="right" style="padding:10px 12px;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:0.04em">Cant.</th>
                <th align="right" style="padding:10px 12px;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:0.04em">P. unit.</th>
                <th align="right" style="padding:10px 12px;font-size:12px;color:${c.muted};text-transform:uppercase;letter-spacing:0.04em">Subtotal</th>
              </tr></thead>
              <tbody>${lineRows}</tbody>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;font-size:14px">
              ${descGlobalRow}
              <tr>
                <td colspan="3" style="padding-top:14px;border-top:2px solid ${c.accent};font-size:17px;font-weight:700">Total pagado</td>
                <td style="padding-top:14px;border-top:2px solid ${c.accent};font-size:17px;font-weight:700;text-align:right">${formatCopEs(opts.totalCop)}</td>
              </tr>
            </table>
            <p style="margin:20px 0 0;font-size:13px;color:${c.muted}">Gracias por tu compra. Conservá este correo como comprobante.</p>
            <p style="margin:24px 0 0;padding-top:18px;border-top:1px solid ${mutedBorder};font-size:11px;color:${c.muted}">Enviado por ${escapeHtml(opts.nombreTienda)} · Mi Catálogo POS</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendResendHtml(opts: {
  resendApiKey: string
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const resend = new Resend(opts.resendApiKey)
  try {
    const r = await resend.emails.send({
      from: MC_RESEND_FROM,
      to: opts.to.trim(),
      subject: opts.subject,
      html: opts.html,
    })
    const messageId = r.data?.id
    if (!messageId) return { ok: false, error: 'resend_no_message_id' }
    return { ok: true, messageId }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'resend_error' }
  }
}

function mapResendSendError(error: string): string {
  const blob = error.toLowerCase()
  if (blob.includes('only send testing emails') || blob.includes('verify a domain')) {
    return 'El dominio de correo no está verificado. Contactá soporte de Mi Catálogo.'
  }
  return 'No pudimos enviar el correo. Probá en unos minutos.'
}

function ventaRefLabel(ventaId: string): string {
  const t = ventaId.trim()
  if (t.length <= 10) return t.toUpperCase()
  return `POS-${t.slice(-8).toUpperCase()}`
}

function pagosResumen(
  pagos: { metodo?: string; monto?: number }[],
  esContraEntrega?: boolean,
  esCredito?: boolean,
): string {
  if (esContraEntrega) return 'Contra entrega'
  if (esCredito && (!pagos.length || pagos.every((p) => p.metodo === 'credito'))) return 'Crédito'
  return pagos
    .map((p) => {
      const metodo = METODO_PAGO_LABEL[p.metodo ?? ''] ?? p.metodo ?? 'Pago'
      const monto = Math.max(0, Math.round(Number(p.monto) || 0))
      return `${metodo} ${formatCopEs(monto)}`
    })
    .join(' · ')
}

function isVentaPendienteCobro(v: {
  esContraEntrega?: boolean
  estadoPago?: string
  pagos?: { metodo?: string }[]
}): boolean {
  if (v.esContraEntrega !== true) return false
  if (v.estadoPago === 'pagado') return false
  return true
}

export async function mcSendPosVentaReciboEmailHandler(
  db: Firestore,
  auth: { uid?: string; token?: Record<string, unknown> },
  dataRaw: unknown,
  resendApiKey: string,
): Promise<{ ok: true; sentAt: number; to: string }> {
  if (!resendApiKey) {
    throw new HttpsError(
      'failed-precondition',
      'Falta configurar RESEND_API_KEY para enviar recibos por correo.',
    )
  }

  const data = (dataRaw && typeof dataRaw === 'object' ? dataRaw : {}) as {
    ventaId?: unknown
    email?: unknown
  }
  const ventaId = typeof data.ventaId === 'string' ? data.ventaId.trim() : ''
  const emailInput = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''

  if (!ventaId) {
    throw new HttpsError('invalid-argument', 'Venta inválida.')
  }

  const { tenantId, user } = await resolveTenantForPosStaff(auth)

  const ventaRef = db.doc(`mc_tenants/${tenantId}/pos_ventas/${ventaId}`)
  const ventaSnap = await ventaRef.get()
  if (!ventaSnap.exists) {
    throw new HttpsError('not-found', 'Venta no encontrada.')
  }
  const venta = ventaSnap.data() as {
    sedeId?: string
    vendedorNombre?: string
    lineas?: PosLinea[]
    pagos?: { metodo?: string; monto?: number }[]
    totalCop?: number
    descuentoGlobalCop?: number
    clienteNombre?: string
    clienteEmail?: string
    esContraEntrega?: boolean
    esCredito?: boolean
    estadoPago?: string
    estado?: string
    createdAt?: number
    reciboEmailEnviadoAt?: number
  }

  if (venta.estado === 'anulada') {
    throw new HttpsError('failed-precondition', 'No se puede enviar recibo de una venta anulada.')
  }
  if (isVentaPendienteCobro(venta)) {
    throw new HttpsError('failed-precondition', 'Completá el pago antes de enviar el recibo.')
  }
  if (venta.reciboEmailEnviadoAt != null && venta.reciboEmailEnviadoAt > 0) {
    throw new HttpsError('already-exists', 'El recibo ya fue enviado por correo.')
  }

  if (user.role === 'pos_vendor' && user.posSedeId && venta.sedeId !== user.posSedeId) {
    throw new HttpsError('permission-denied', 'No tenés acceso a ventas de otra sede.')
  }

  const to =
    emailInput ||
    (typeof venta.clienteEmail === 'string' ? venta.clienteEmail.trim().toLowerCase() : '')
  if (!looksLikeEmail(to)) {
    throw new HttpsError('invalid-argument', 'Ingresá un correo válido para enviar el recibo.')
  }

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) {
    throw new HttpsError('not-found', 'Tienda no encontrada.')
  }
  const tenant = tenantSnap.data() as {
    nombreTienda?: string
    storeLogoUrl?: string
    billingPlan?: string
    catalogTheme?: { preset?: string; colors?: Record<string, string | undefined> }
  }

  let sedeNombre = 'Sede'
  if (venta.sedeId) {
    const sedeSnap = await db.doc(`mc_tenants/${tenantId}/pos_sedes/${venta.sedeId}`).get()
    if (sedeSnap.exists) {
      const sn = (sedeSnap.data() as { nombre?: string }).nombre
      if (typeof sn === 'string' && sn.trim()) sedeNombre = sn.trim()
    }
  }

  const nombreTienda = tenant.nombreTienda?.trim() || 'Tu tienda'
  const totalCop = Math.max(0, Math.round(Number(venta.totalCop) || 0))
  const lineas = Array.isArray(venta.lineas) ? venta.lineas : []
  const pagos = Array.isArray(venta.pagos) ? venta.pagos : []
  const createdAt = typeof venta.createdAt === 'number' ? venta.createdAt : Date.now()

  const html = buildPosReciboEmailHtml({
    nombreTienda,
    logoUrl: safeLogoImgUrl(tenant.storeLogoUrl),
    ventaRef: ventaRefLabel(ventaId),
    sedeNombre,
    vendedorNombre: venta.vendedorNombre?.trim() || 'Vendedor',
    fechaVentaMs: createdAt,
    lineas,
    pagosLabel: pagosResumen(pagos, venta.esContraEntrega, venta.esCredito) || 'Pago registrado',
    totalCop,
    descuentoGlobalCop: venta.descuentoGlobalCop,
    clienteNombre: venta.clienteNombre,
    colors: resolveEmailCatalogThemeColors(tenant),
  })

  const sent = await sendResendHtml({
    resendApiKey,
    to,
    subject: `Recibo de pago · ${nombreTienda.slice(0, 52)} · ${formatCopEs(totalCop)}`,
    html,
  })

  if (!sent.ok) {
    console.error('[mcSendPosVentaReciboEmail]', sent.error, { tenantId, ventaId, to })
    throw new HttpsError('internal', mapResendSendError(sent.error ?? 'resend_error'))
  }

  const now = Date.now()
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(ventaRef)
    if (!fresh.exists) throw new HttpsError('not-found', 'Venta no encontrada.')
    const d = fresh.data() as { reciboEmailEnviadoAt?: number; clienteEmail?: string }
    if (d.reciboEmailEnviadoAt != null && d.reciboEmailEnviadoAt > 0) {
      throw new HttpsError('already-exists', 'El recibo ya fue enviado por correo.')
    }
    const patch: Record<string, unknown> = {
      reciboEmailEnviadoAt: now,
      reciboEmailDestino: to,
    }
    if (!d.clienteEmail?.trim()) {
      patch.clienteEmail = to
    }
    tx.update(ventaRef, patch)
  })

  console.info('[mcSendPosVentaReciboEmail] sent', {
    tenantId,
    ventaId,
    to,
    messageId: sent.messageId,
  })

  return { ok: true, sentAt: now, to }
}
