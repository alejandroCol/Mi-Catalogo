import { arrayUnion, deleteField, doc, updateDoc } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McSalesVisitOutcome } from '@/types/mc'

export async function mcAddSalesVisitUpdate(
  visitId: string,
  data: {
    description: string
    outcome: McSalesVisitOutcome
    rejectionReason?: string
  },
): Promise<void> {
  const description = data.description.trim()
  if (!description) {
    throw new Error('Escribí una descripción para la actualización.')
  }
  if (data.outcome === 'rechazo' && !data.rejectionReason?.trim()) {
    throw new Error('Indicá el motivo del rechazo.')
  }

  const now = Date.now()
  const updateEntry = {
    id: crypto.randomUUID(),
    description,
    outcome: data.outcome,
    createdAt: now,
  }

  const patch: Record<string, unknown> = {
    outcome: data.outcome,
    updatedAt: now,
    updates: arrayUnion(updateEntry),
  }

  if (data.outcome === 'rechazo') {
    patch.rejectionReason = data.rejectionReason!.trim()
  } else {
    patch.rejectionReason = deleteField()
  }

  await updateDoc(doc(getDb(), MC.salesVisits, visitId), patch)
}
