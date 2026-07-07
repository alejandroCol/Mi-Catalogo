import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@/lib/firebase'

export async function fulfillCatalogOrder(tenantId: string, orderId: string): Promise<void> {
  const fn = httpsCallable(getFirebaseFunctions(), 'mcFulfillCatalogOrder')
  await fn({ tenantId, orderId })
}
