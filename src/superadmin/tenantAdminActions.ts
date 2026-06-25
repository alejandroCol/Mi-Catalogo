import {
  deleteField,
  doc,
  getDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'
import { MC } from '@/lib/mcCollections'
import {
  MS_MONTH,
  MS_QUARTER,
  MS_YEAR,
  extendSubscription,
  setSubscriptionFromNow,
  subscriptionEndsAtMs,
  trialEndMs,
} from '@/lib/subscription'
import type { McBillingPlan, McTenant } from '@/types/mc'

export type AssignPlanDuration = '1m' | '3m' | '1y'
export type AssignPlanProduct = 'expert' | 'master'

export const ASSIGN_PLAN_OPTIONS: ReadonlyArray<{
  id: AssignPlanDuration
  label: string
  ms: number
  subscriptionPlan: NonNullable<McTenant['subscriptionPlan']>
}> = [
  { id: '1m', label: '1 mes', ms: MS_MONTH, subscriptionPlan: 'monthly' },
  { id: '3m', label: '3 meses', ms: MS_QUARTER, subscriptionPlan: 'custom' },
  { id: '1y', label: '1 año', ms: MS_YEAR, subscriptionPlan: 'yearly' },
]

export async function assignExpertPlanFromNow(
  db: Firestore,
  tenantId: string,
  duration: AssignPlanDuration,
): Promise<void> {
  const option = ASSIGN_PLAN_OPTIONS.find((o) => o.id === duration)
  if (!option) return
  await updateDoc(doc(db, MC.tenants, tenantId), {
    billingPlan: 'expert' as McBillingPlan,
    subscriptionEndsAt: setSubscriptionFromNow(option.ms),
    subscriptionPlan: option.subscriptionPlan,
    billingSubStatus: 'active',
    billingGraceUntilMs: deleteField(),
    billingPastDueSinceMs: deleteField(),
  })
}

export async function assignMasterPlanFromNow(
  db: Firestore,
  tenantId: string,
  duration: AssignPlanDuration,
): Promise<void> {
  const option = ASSIGN_PLAN_OPTIONS.find((o) => o.id === duration)
  if (!option) return
  await updateDoc(doc(db, MC.tenants, tenantId), {
    billingPlan: 'master' as McBillingPlan,
    subscriptionEndsAt: setSubscriptionFromNow(option.ms),
    subscriptionPlan: option.subscriptionPlan,
    billingSubStatus: 'active',
    billingGraceUntilMs: deleteField(),
    billingPastDueSinceMs: deleteField(),
  })
}

export async function patchTenantSubscription(
  db: Firestore,
  tenantId: string,
  patch: Partial<Pick<McTenant, 'subscriptionEndsAt' | 'subscriptionPlan'>>,
): Promise<void> {
  await updateDoc(doc(db, MC.tenants, tenantId), patch)
}

export async function setTenantBillingPlan(db: Firestore, tenantId: string, plan: McBillingPlan): Promise<void> {
  if (plan === 'free') {
    await updateDoc(doc(db, MC.tenants, tenantId), {
      billingPlan: plan,
      subscriptionEndsAt: deleteField(),
    })
    return
  }
  const tenantSnap = await getDoc(doc(db, MC.tenants, tenantId))
  const currentEndsAt = tenantSnap.exists()
    ? subscriptionEndsAtMs((tenantSnap.data() as McTenant).subscriptionEndsAt)
    : null
  await updateDoc(
    doc(db, MC.tenants, tenantId),
    currentEndsAt !== null && currentEndsAt > Date.now()
      ? {
          billingPlan: plan,
          billingSubStatus: 'active',
          billingGraceUntilMs: deleteField(),
          billingPastDueSinceMs: deleteField(),
        }
      : {
          billingPlan: plan,
          subscriptionEndsAt: trialEndMs(),
          billingSubStatus: 'active',
          billingGraceUntilMs: deleteField(),
          billingPastDueSinceMs: deleteField(),
        },
  )
}

export async function setTenantPlanTag(
  db: Firestore,
  tenantId: string,
  value: McTenant['subscriptionPlan'] | '',
): Promise<void> {
  if (!value) {
    await updateDoc(doc(db, MC.tenants, tenantId), { subscriptionPlan: deleteField() })
    return
  }
  await patchTenantSubscription(db, tenantId, { subscriptionPlan: value })
}

export async function extendTenantSubscription(
  db: Firestore,
  tenantId: string,
  currentEnd: number,
  ms: number,
): Promise<void> {
  await updateDoc(doc(db, MC.tenants, tenantId), {
    subscriptionEndsAt: extendSubscription(currentEnd, ms),
  })
}

export async function assignTenantSubscriptionFromNow(
  db: Firestore,
  tenantId: string,
  ms: number,
): Promise<void> {
  await updateDoc(doc(db, MC.tenants, tenantId), {
    subscriptionEndsAt: setSubscriptionFromNow(ms),
  })
}

export async function patchTenantOnepayKyb(
  db: Firestore,
  tenantId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await updateDoc(doc(db, MC.tenants, tenantId), patch)
}
