import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { Resend } from 'resend'
import { db } from './firebaseAdmin.js'
import { MC_RESEND_FROM } from './mcResend.js'

const resendApiKey = defineSecret('RESEND_API_KEY')
const mcPublicOrigin = defineString('MC_PUBLIC_ORIGIN', { default: 'https://micatalogo.io' })

const BOGOTA_TZ = 'America/Bogota'
/** Duración por defecto del evento en calendario si no hay hora de fin configurada. */
const TALLER_CALENDAR_DURATION_MIN = 90

type McTallerBrandType =
  | 'start_selling'
  | 'new_brand'
  | 'established_brand'
  | 'switch_for_costs'
  | 'other'

type McTallerDoc = {
  title?: string
  description?: string
  dateMs?: number
  requirements?: string[]
  zoomLink?: string
  active?: boolean
}

const BRAND_TYPE_LABELS: Record<McTallerBrandType, string> = {
  start_selling: 'Quiero empezar a vender productos',
  new_brand: 'Tengo una marca nueva',
  established_brand: 'Tengo una marca hace años',
  switch_for_costs: 'Quiero cambiar mi tienda actual por costos',
  other: 'Otro',
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatGoogleCalendarLocalDateTime(dateMs: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(dateMs))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`
}

function tallerEventPageUrl(slug: string): string {
  const origin = mcPublicOrigin.value()?.trim().replace(/\/$/, '') || 'https://micatalogo.io'
  return `${origin}/taller/${slug.trim().toLowerCase()}`
}

/** URL «Añadir a Google Calendar» — acceso vía página del taller (enlace Meet solo al iniciar). */
function buildGoogleCalendarUrl(taller: McTallerDoc, slug: string): string | null {
  if (typeof taller.dateMs !== 'number' || Number.isNaN(taller.dateMs)) return null

  const title = String(taller.title ?? 'Taller')
  const start = formatGoogleCalendarLocalDateTime(taller.dateMs)
  const end = formatGoogleCalendarLocalDateTime(taller.dateMs + TALLER_CALENDAR_DURATION_MIN * 60_000)
  const description = String(taller.description ?? '').trim()
  const requirements = Array.isArray(taller.requirements) ? taller.requirements.filter((r) => r.trim()) : []
  const eventUrl = tallerEventPageUrl(slug)

  const detailLines: string[] = []
  if (description) detailLines.push(description)
  if (requirements.length > 0) {
    detailLines.push('', 'Requisitos:', ...requirements.map((r) => `• ${r.trim()}`))
  }
  detailLines.push('', `Accedé al taller: ${eventUrl}`)
  detailLines.push('El enlace de la videollamada se habilita cuando empiece el evento.')
  const details = detailLines.join('\n').trim()

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    ctz: BOGOTA_TZ,
  })
  if (details) params.set('details', details)
  params.set('location', eventUrl)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function googleCalendarButtonHtml(taller: McTallerDoc, slug: string): string {
  const url = buildGoogleCalendarUrl(taller, slug)
  if (!url) return ''
  return `<p style="margin:14px 0 0">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:11px 20px;border-radius:999px;border:1px solid #d4d0d9;background:#ffffff;color:#1c1b1f;text-decoration:none;font-weight:600">Añadir a Google Calendar</a>
</p>`
}

function actionButtonsHtml(taller: McTallerDoc, slug: string, joinStyle: string): string {
  const eventUrl = tallerEventPageUrl(slug)
  const joinBlock = `<p style="margin:20px 0 0"><a href="${escapeHtml(eventUrl)}" style="display:inline-block;padding:12px 22px;border-radius:999px;${joinStyle}text-decoration:none;font-weight:600">Unirme al taller</a></p>
<p style="margin:10px 0 0;font-size:13px;color:#64748b">El enlace de la videollamada se habilita en esta página cuando empiece el taller.</p>`
  return `${joinBlock}${googleCalendarButtonHtml(taller, slug)}`
}

function formatTallerDateLabel(dateMs: number): string {
  return new Date(dateMs).toLocaleString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BOGOTA_TZ,
  })
}

function requirementsHtml(requirements: string[]): string {
  const items = requirements.filter((r) => r.trim()).map((r) => `<li style="margin:6px 0">${escapeHtml(r.trim())}</li>`)
  if (items.length === 0) return ''
  return `<p style="margin:20px 0 8px;font-weight:600;color:#1c1b1f">Requisitos del taller</p>
<ul style="margin:0;padding-left:20px;color:#3f3d45;line-height:1.55">${items.join('')}</ul>`
}

function buildTallerEmailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf9f7;font-family:'Inter',system-ui,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e8e6eb;overflow:hidden">
<tr><td style="padding:28px 28px 12px;text-align:center">
<p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#c5a367">Mi Catálogo</p>
<h1 style="margin:12px 0 0;font-size:22px;font-weight:600;line-height:1.25;color:#1c1b1f">${escapeHtml(title)}</h1>
</td></tr>
<tr><td style="padding:8px 28px 28px;color:#3f3d45;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="padding:0 28px 28px;font-size:12px;color:#8b8794;text-align:center">mi catálogo · micatalogo.io</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function buildConfirmationEmailHtml(taller: McTallerDoc, attendeeName: string, slug: string): string {
  const title = String(taller.title ?? 'Taller')
  const dateLabel = typeof taller.dateMs === 'number' ? formatTallerDateLabel(taller.dateMs) : 'Por confirmar'
  const description = String(taller.description ?? '').trim()
  const requirements = Array.isArray(taller.requirements) ? taller.requirements : []

  const actionsBlock = actionButtonsHtml(taller, slug, 'background:#1c1b1f;color:#ffffff;')

  const body = `<p>Hola <strong>${escapeHtml(attendeeName)}</strong>,</p>
<p>Tu inscripción al taller <strong>${escapeHtml(title)}</strong> quedó confirmada.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
<tr><td style="padding:8px 0;color:#64748b;width:32%">Fecha</td><td style="padding:8px 0"><strong>${escapeHtml(dateLabel)}</strong></td></tr>
</table>
${description ? `<p style="margin:16px 0 0">${escapeHtml(description)}</p>` : ''}
${requirementsHtml(requirements)}
${actionsBlock}
<p style="margin:24px 0 0;font-size:14px">Te esperamos. Guardá este correo para tener a mano el enlace y los requisitos.</p>`

  return buildTallerEmailShell(`Inscripción confirmada · ${title}`, body)
}

function buildReminderEmailHtml(taller: McTallerDoc, attendeeName: string, slug: string): string {
  const title = String(taller.title ?? 'Taller')
  const dateLabel = typeof taller.dateMs === 'number' ? formatTallerDateLabel(taller.dateMs) : 'Próximamente'
  const description = String(taller.description ?? '').trim()
  const requirements = Array.isArray(taller.requirements) ? taller.requirements : []

  const actionsBlock = actionButtonsHtml(taller, slug, 'background:#c5a367;color:#1c1b1f;')

  const body = `<p>Hola <strong>${escapeHtml(attendeeName)}</strong>,</p>
<p>Según la fecha, ya se acerca nuestro taller <strong>${escapeHtml(title)}</strong>.</p>
<p style="margin:16px 0;padding:14px 16px;border-radius:12px;background:#faf9f7;border:1px solid #e8e6eb">
<strong>${escapeHtml(dateLabel)}</strong>
</p>
${description ? `<p>${escapeHtml(description)}</p>` : ''}
${requirementsHtml(requirements)}
${actionsBlock}
<p style="margin:24px 0 0;font-size:14px">Si tenés dudas, respondé a este correo. ¡Nos vemos pronto!</p>`

  return buildTallerEmailShell(`Recordatorio · ${title}`, body)
}

async function assertMcSuperAdmin(uid: string | undefined): Promise<void> {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  }
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  }
  if ((userSnap.data() as { isSuperAdmin?: boolean }).isSuperAdmin !== true) {
    throw new HttpsError('permission-denied', 'Solo súper admin.')
  }
}

function parseBrandType(raw: unknown): McTallerBrandType | null {
  const v = typeof raw === 'string' ? raw.trim() : ''
  if (v in BRAND_TYPE_LABELS) return v as McTallerBrandType
  return null
}

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function normalizeWhatsapp(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\D/g, '') : ''
}

/** Inscripción pública a un taller + correo de confirmación. */
export const mcTallerRegister = onCall({ invoker: 'public', secrets: [resendApiKey] }, async (request) => {
  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as Record<string, unknown>
  const slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : ''
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : ''
  const brandName = typeof data.brandName === 'string' ? data.brandName.trim() : ''
  const brandType = parseBrandType(data.brandType)
  const brandTypeOther = typeof data.brandTypeOther === 'string' ? data.brandTypeOther.trim() : ''
  const email = normalizeEmail(data.email)
  const whatsapp = normalizeWhatsapp(data.whatsapp)

  if (!slug || slug.length < 3) {
    throw new HttpsError('invalid-argument', 'Taller no válido.')
  }
  if (fullName.length < 2) {
    throw new HttpsError('invalid-argument', 'Ingresá tu nombre completo.')
  }
  if (brandName.length < 2) {
    throw new HttpsError('invalid-argument', 'Ingresá el nombre de tu marca.')
  }
  if (!brandType) {
    throw new HttpsError('invalid-argument', 'Elegí el tipo de marca.')
  }
  if (brandType === 'other' && brandTypeOther.length < 2) {
    throw new HttpsError('invalid-argument', 'Contanos un poco más sobre tu marca.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Correo inválido.')
  }
  if (whatsapp.length < 10) {
    throw new HttpsError('invalid-argument', 'WhatsApp inválido.')
  }

  const tallerSnap = await db.doc(`mc_talleres/${slug}`).get()
  if (!tallerSnap.exists) {
    throw new HttpsError('not-found', 'Este taller no existe o ya no está disponible.')
  }
  const taller = tallerSnap.data() as McTallerDoc
  if (taller.active !== true) {
    throw new HttpsError('failed-precondition', 'Este taller no está activo.')
  }

  const existing = await db
    .collection(`mc_talleres/${slug}/registrations`)
    .where('email', '==', email)
    .limit(1)
    .get()
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'Ya te inscribiste con este correo para este taller.')
  }

  const now = Date.now()
  const regRef = await db.collection(`mc_talleres/${slug}/registrations`).add({
    fullName,
    brandName,
    brandType,
    ...(brandType === 'other' && brandTypeOther ? { brandTypeOther } : {}),
    email,
    whatsapp,
    createdAt: now,
  })

  const key = resendApiKey.value()?.trim()
  if (!key) {
    console.warn('[mcTallerRegister] RESEND_API_KEY no configurada')
    return { ok: true, registrationId: regRef.id, emailSent: false }
  }

  const resend = new Resend(key)
  const html = buildConfirmationEmailHtml(taller, fullName, slug)
  const subject = `Inscripción confirmada · ${String(taller.title ?? 'Taller')}`
  const sent = await resend.emails.send({
    from: MC_RESEND_FROM,
    to: email,
    subject,
    html,
  })

  if (sent.error) {
    console.error('[mcTallerRegister]', sent.error)
    return { ok: true, registrationId: regRef.id, emailSent: false }
  }

  await regRef.update({ confirmationEmailSentAt: Date.now() })
  return { ok: true, registrationId: regRef.id, emailSent: true }
})

/** Recordatorio a todos los inscriptos de un taller (súper admin). */
export const mcTallerSendReminders = onCall({ invoker: 'public', secrets: [resendApiKey] }, async (request) => {
  await assertMcSuperAdmin(request.auth?.uid)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as Record<string, unknown>
  const slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : ''
  if (!slug) {
    throw new HttpsError('invalid-argument', 'Falta el taller.')
  }

  const tallerSnap = await db.doc(`mc_talleres/${slug}`).get()
  if (!tallerSnap.exists) {
    throw new HttpsError('not-found', 'Taller no encontrado.')
  }
  const taller = tallerSnap.data() as McTallerDoc

  const key = resendApiKey.value()?.trim()
  if (!key) {
    throw new HttpsError('failed-precondition', 'Correo no configurado (RESEND_API_KEY).')
  }

  const regsSnap = await db.collection(`mc_talleres/${slug}/registrations`).get()
  if (regsSnap.empty) {
    return { ok: true, sent: 0, failed: 0 }
  }

  const resend = new Resend(key)
  const title = String(taller.title ?? 'Taller')
  let sent = 0
  let failed = 0

  for (const regDoc of regsSnap.docs) {
    const reg = regDoc.data() as { fullName?: string; email?: string }
    const email = normalizeEmail(reg.email)
    const fullName = String(reg.fullName ?? 'Participante').trim() || 'Participante'
    if (!email) {
      failed += 1
      continue
    }

    const html = buildReminderEmailHtml(taller, fullName, slug)
    const result = await resend.emails.send({
      from: MC_RESEND_FROM,
      to: email,
      subject: `Se acerca nuestro taller · ${title}`,
      html,
    })

    if (result.error) {
      console.error('[mcTallerSendReminders]', regDoc.id, result.error)
      failed += 1
      continue
    }

    sent += 1
    await regDoc.ref.update({ lastReminderSentAt: Date.now() })
  }

  return { ok: true, sent, failed }
})
