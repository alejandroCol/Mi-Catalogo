import * as XLSX from 'xlsx'
import { mcTallerBrandTypeLabel } from '@/lib/tallerBrandTypes'
import type { McTallerRegistration } from '@/types/mc'

const BOGOTA_TZ = 'America/Bogota'

function formatRegistrationDate(ms?: number): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return ''
  return new Date(ms).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BOGOTA_TZ,
  })
}

export type TallerRegistrationExportRow = McTallerRegistration & { id: string }

export function exportTallerRegistrationsExcel(
  slug: string,
  tallerTitle: string,
  rows: TallerRegistrationExportRow[],
): void {
  const data = rows.map((reg, index) => ({
    '#': index + 1,
    'Nombre completo': reg.fullName,
    Marca: reg.brandName,
    'Etapa de la marca': mcTallerBrandTypeLabel(reg.brandType, reg.brandTypeOther),
    'Etapa (detalle otro)': reg.brandType === 'other' ? (reg.brandTypeOther ?? '') : '',
    Correo: reg.email,
    WhatsApp: reg.whatsapp,
    'Fecha inscripción': formatRegistrationDate(reg.createdAt),
    'Email confirmación enviado': formatRegistrationDate(reg.confirmationEmailSentAt),
    'Último recordatorio': formatRegistrationDate(reg.lastReminderSentAt),
  }))

  const sheetName = tallerTitle.replace(/[\\/*?:[\]]/g, '').trim().slice(0, 31) || 'Inscritos'
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const safeSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `inscritos-${safeSlug}-${date}.xlsx`)
}
