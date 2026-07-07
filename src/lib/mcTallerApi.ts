import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'
import type { McTallerBrandType } from '@/types/mc'

export type McTallerRegisterPayload = {
  slug: string
  fullName: string
  brandName: string
  brandType: McTallerBrandType
  brandTypeOther?: string
  email: string
  whatsapp: string
}

export type McTallerRegisterResult = {
  ok?: boolean
  registrationId?: string
  emailSent?: boolean
}

export async function callMcTallerRegister(payload: McTallerRegisterPayload): Promise<McTallerRegisterResult> {
  const fn = httpsCallable<McTallerRegisterPayload, McTallerRegisterResult>(
    getFirebaseFunctions(),
    'mcTallerRegister',
  )
  const res = await fn(payload)
  return res.data ?? {}
}

export async function callMcTallerSendReminders(slug: string): Promise<{ ok?: boolean; sent?: number; failed?: number }> {
  const fn = httpsCallable<{ slug: string }, { ok?: boolean; sent?: number; failed?: number }>(
    getFirebaseFunctions(),
    'mcTallerSendReminders',
  )
  const res = await fn({ slug })
  return res.data ?? {}
}

export async function callMcTallerGetMeetLink(slug: string): Promise<{ ok?: boolean; meetLink?: string }> {
  const fn = httpsCallable<{ slug: string }, { ok?: boolean; meetLink?: string }>(
    getFirebaseFunctions(),
    'mcTallerGetMeetLink',
  )
  const res = await fn({ slug })
  return res.data ?? {}
}
