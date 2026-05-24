import type { Firestore } from 'firebase-admin/firestore'
import {
  pasarelaMicatalogoFeePerPaymentCop,
  pasarelaMicatalogoNetPerPaymentCop,
  pasarelaMicatalogoNetAfterWithdrawalCop,
  pasarelaMicatalogoWithdrawalFeeCop,
} from './pasarelaFees.js'

const PAYMENTS_PAGE_SIZE = 500
const RECENT_PAYMENTS_LIMIT = 120

export type PasarelaMicatalogoPaymentRow = {
  orderId: string
  createdAt: number
  numeroReferencia: string | null
  clienteNombre: string | null
  onepayPaymentId: string | null
  grossCop: number
  feeCop: number
  netCop: number
}

export type PasarelaMicatalogoWithdrawalRow = {
  id: string
  amountCop: number
  feeCop: number
  netCop: number
  createdAt: number
}

export type PasarelaMicatalogoLedger = {
  grossTotalCop: number
  feeTotalCop: number
  netTotalCop: number
  withdrawnTotalCop: number
  availableNetCop: number
  paymentCount: number
  recentPayments: PasarelaMicatalogoPaymentRow[]
  withdrawals: PasarelaMicatalogoWithdrawalRow[]
}

function mapPaidMicatalogoOrder(docSnap: FirebaseFirestore.QueryDocumentSnapshot): PasarelaMicatalogoPaymentRow | null {
  const data = docSnap.data() as {
    pagoOnePay?: boolean
    onepayViaMicatalogo?: boolean
    estado?: string
    createdAt?: number
    totalCop?: number
    numeroReferencia?: string
    clienteNombre?: string
    onepayPaymentId?: string | null
  }
  if (data.pagoOnePay !== true || data.onepayViaMicatalogo !== true) return null
  if (data.estado === 'cancelado') return null
  const grossCop = Math.max(0, Math.round(Number(data.totalCop) || 0))
  const feeCop = pasarelaMicatalogoFeePerPaymentCop(grossCop)
  return {
    orderId: docSnap.id,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
    numeroReferencia: data.numeroReferencia ?? null,
    clienteNombre: data.clienteNombre ?? null,
    onepayPaymentId: data.onepayPaymentId ?? null,
    grossCop,
    feeCop,
    netCop: pasarelaMicatalogoNetPerPaymentCop(grossCop),
  }
}

async function fetchAllPaidMicatalogoPayments(
  db: Firestore,
  tenantId: string,
): Promise<PasarelaMicatalogoPaymentRow[]> {
  const col = db.collection(`mc_tenants/${tenantId}/ordenes_catalogo`)
  const rows: PasarelaMicatalogoPaymentRow[] = []
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined

  for (;;) {
    let q = col
      .where('pagoOnePay', '==', true)
      .where('onepayViaMicatalogo', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(PAYMENTS_PAGE_SIZE)
    if (lastDoc) q = q.startAfter(lastDoc)
    const snap = await q.get()
    if (snap.empty) break
    for (const docSnap of snap.docs) {
      const row = mapPaidMicatalogoOrder(docSnap)
      if (row) rows.push(row)
    }
    lastDoc = snap.docs[snap.docs.length - 1]
    if (snap.size < PAYMENTS_PAGE_SIZE) break
  }

  return rows
}

async function fetchWithdrawals(db: Firestore, tenantId: string): Promise<PasarelaMicatalogoWithdrawalRow[]> {
  const snap = await db
    .collection(`mc_tenants/${tenantId}/pasarela_retiros`)
    .where('status', '==', 'completed')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  return snap.docs.map((docSnap) => {
    const d = docSnap.data() as {
      amountCop?: number
      feeCop?: number
      netCop?: number
      createdAt?: number
    }
    return {
      id: docSnap.id,
      amountCop: Math.max(0, Math.round(Number(d.amountCop) || 0)),
      feeCop: Math.max(0, Math.round(Number(d.feeCop) || 0)),
      netCop: Math.max(0, Math.round(Number(d.netCop) || 0)),
      createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
    }
  })
}

export async function fetchPasarelaMicatalogoLedger(
  db: Firestore,
  tenantId: string,
): Promise<PasarelaMicatalogoLedger> {
  const [payments, withdrawals] = await Promise.all([
    fetchAllPaidMicatalogoPayments(db, tenantId),
    fetchWithdrawals(db, tenantId),
  ])

  const grossTotalCop = payments.reduce((s, p) => s + p.grossCop, 0)
  const feeTotalCop = payments.reduce((s, p) => s + p.feeCop, 0)
  const netTotalCop = payments.reduce((s, p) => s + p.netCop, 0)
  const withdrawnTotalCop = withdrawals.reduce((s, w) => s + w.amountCop, 0)
  const availableNetCop = Math.max(0, netTotalCop - withdrawnTotalCop)

  return {
    grossTotalCop,
    feeTotalCop,
    netTotalCop,
    withdrawnTotalCop,
    availableNetCop,
    paymentCount: payments.length,
    recentPayments: payments.slice(0, RECENT_PAYMENTS_LIMIT),
    withdrawals,
  }
}

export async function recordPasarelaMicatalogoWithdrawal(
  db: Firestore,
  tenantId: string,
  input: { amountCop: number; idempotencyNonce: string },
): Promise<void> {
  const amountCop = Math.max(0, Math.round(input.amountCop))
  const feeCop = pasarelaMicatalogoWithdrawalFeeCop(amountCop)
  const netCop = pasarelaMicatalogoNetAfterWithdrawalCop(amountCop)
  await db.collection(`mc_tenants/${tenantId}/pasarela_retiros`).add({
    amountCop,
    feeCop,
    netCop,
    status: 'completed',
    idempotencyNonce: input.idempotencyNonce,
    createdAt: Date.now(),
  })
}
