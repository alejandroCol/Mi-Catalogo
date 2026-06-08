import { getAuth } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './firebaseAdmin.js'

async function assertMcSuperAdminUid(uid: string): Promise<void> {
  const userSnap = await db.doc(`mc_users/${uid}`).get()
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'Usuario no encontrado.')
  }
  if ((userSnap.data() as { isSuperAdmin?: boolean }).isSuperAdmin !== true) {
    throw new HttpsError('permission-denied', 'Solo súper admin.')
  }
}

export const mcCreateSalesRep = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  await assertMcSuperAdminUid(uid)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    email?: unknown
    password?: unknown
    displayName?: unknown
  }

  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
  const password = typeof data.password === 'string' ? data.password : ''
  const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : ''

  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Correo inválido.')
  }
  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 8 caracteres.')
  }
  if (!displayName || displayName.length < 2) {
    throw new HttpsError('invalid-argument', 'Nombre del vendedor requerido.')
  }

  const auth = getAuth()
  let newUid: string
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    })
    newUid = userRecord.uid
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No se pudo crear el usuario.'
    if (msg.includes('email-already-exists') || msg.includes('already in use')) {
      throw new HttpsError('already-exists', 'Ya existe una cuenta con ese correo.')
    }
    throw new HttpsError('internal', msg)
  }

  await db.doc(`mc_users/${newUid}`).set({
    email,
    displayName,
    tenantId: '',
    isSuperAdmin: false,
    role: 'sales_rep',
    active: true,
    createdAt: Date.now(),
  })

  return { ok: true as const, uid: newUid, email, displayName }
})

export const mcSetSalesRepActive = onCall({ invoker: 'public' }, async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Iniciá sesión.')
  await assertMcSuperAdminUid(uid)

  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as {
    salesRepUid?: unknown
    active?: unknown
  }
  const salesRepUid = typeof data.salesRepUid === 'string' ? data.salesRepUid.trim() : ''
  const active = data.active === true

  if (!salesRepUid) {
    throw new HttpsError('invalid-argument', 'Falta el vendedor.')
  }

  const repRef = db.doc(`mc_users/${salesRepUid}`)
  const repSnap = await repRef.get()
  if (!repSnap.exists) {
    throw new HttpsError('not-found', 'Vendedor no encontrado.')
  }
  const rep = repSnap.data() as { role?: string }
  if (rep.role !== 'sales_rep') {
    throw new HttpsError('failed-precondition', 'El usuario no es vendedor.')
  }

  await repRef.update({ active, updatedAt: FieldValue.serverTimestamp() })
  return { ok: true as const, salesRepUid, active }
})
