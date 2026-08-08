import { timingSafeEqual } from 'node:crypto'
import express from 'express'
import type { Firestore } from 'firebase-admin/firestore'
import { AddiApplicationsClient } from './AddiApplicationsClient.js'
import { AddiAuthClient } from './AddiAuthClient.js'
import { AddiCredentialsRepository } from './AddiCredentialsRepository.js'
import { addiEventLogPath, addiWebhookRoutePath } from './config.js'
import { confirmCatalogOrderPaid } from './orderPaidService.js'
import {
  ADDI_APPROVED_STATUSES,
  ADDI_REJECTED_STATUSES,
  type AddiCallbackBody,
  type AddiCredentialsStored,
} from './types.js'

function safeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function parseBasicAuth(header: string | undefined): { user: string; password: string } | null {
  if (!header || !header.startsWith('Basic ')) return null
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
    const i = decoded.indexOf(':')
    if (i < 0) return null
    return { user: decoded.slice(0, i), password: decoded.slice(i + 1) }
  } catch {
    return null
  }
}

async function ensureCallbackMatch(
  cred: AddiCredentialsStored,
  tenantId: string,
  auth: { user: string; password: string },
  repo: AddiCredentialsRepository,
): Promise<boolean> {
  if (
    cred.callbackUser &&
    cred.callbackPassword &&
    safeEqualStr(cred.callbackUser, auth.user) &&
    safeEqualStr(cred.callbackPassword, auth.password)
  ) {
    return true
  }

  try {
    const authClient = new AddiAuthClient(cred.sandbox === true)
    const { accessToken } = await authClient.fetchAccessToken(cred.clientId, cred.clientSecret)
    const apps = new AddiApplicationsClient(cred.sandbox === true)
    const fresh = await apps.fetchCallbackCredentials(accessToken)
    if (!fresh) return false
    await repo.updateCallbackCredentials(tenantId, fresh.user, fresh.password)
    return safeEqualStr(fresh.user, auth.user) && safeEqualStr(fresh.password, auth.password)
  } catch (e) {
    console.error('[mcAddiCatalogWebhook] callback cred refresh:', e)
    return false
  }
}

export function createAddiWebhookApp(params: {
  db: Firestore
  getPublicOrigin: () => string
  readResendApiKey: () => string
}): express.Express {
  const { db, getPublicOrigin, readResendApiKey } = params
  const app = express()
  app.disable('x-powered-by')
  const repo = new AddiCredentialsRepository(db)

  app.post(
    '/',
    express.json({
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf
      },
    }) as express.RequestHandler,
    async (req, res) => {
      res.set('content-type', 'application/json; charset=utf-8')

      const k = req.query['k']
      const routeKey = typeof k === 'string' && k.length >= 16 ? k : ''
      if (!routeKey) {
        res.status(400).json({ ok: false, error: 'missing k' })
        return
      }

      const rSnap = await db.doc(addiWebhookRoutePath(routeKey)).get()
      if (!rSnap.exists) {
        res.status(404).json({ ok: false, error: 'route' })
        return
      }
      const tenantId = (rSnap.data() as { tenantId?: string }).tenantId
      if (!tenantId) {
        res.status(404).json({ ok: false, error: 'route' })
        return
      }

      const cred = await repo.get(tenantId)
      if (!cred) {
        res.status(500).json({ ok: false, error: 'config' })
        return
      }

      const basic = parseBasicAuth(
        typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
      )
      if (!basic) {
        res.set('WWW-Authenticate', 'Basic realm="addi"')
        res.status(401).json({ ok: false, error: 'auth' })
        return
      }

      const match = await ensureCallbackMatch(cred, tenantId, basic, repo)
      if (!match) {
        res.set('WWW-Authenticate', 'Basic realm="addi"')
        res.status(401).json({ ok: false, error: 'auth' })
        return
      }

      const body = (req.body || {}) as AddiCallbackBody
      const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
      const status = typeof body.status === 'string' ? body.status.trim().toUpperCase() : ''
      const applicationId =
        typeof body.applicationId === 'string' ? body.applicationId.trim() : ''

      if (!orderId || !status) {
        res.status(200).json({ ok: true })
        return
      }

      const logId = applicationId || orderId
      const procRef = db.doc(addiEventLogPath(logId, status))
      if ((await procRef.get()).exists) {
        res.status(200).json({ ok: true })
        return
      }

      const oref = db.doc(`mc_tenants/${tenantId}/ordenes_catalogo/${orderId}`)
      const oSnap = await oref.get()
      if (!oSnap.exists) {
        await procRef.set({ at: Date.now(), status, missingOrder: true })
        res.status(200).json({ ok: true })
        return
      }

      const o = oSnap.data() as {
        estado?: string
        totalCop?: number
        addiApplicationId?: string | null
      }

      if (o.estado !== 'esperando_pago') {
        await procRef.set({ at: Date.now(), status, skipped: true })
        res.status(200).json({ ok: true })
        return
      }

      if (ADDI_APPROVED_STATUSES.has(status)) {
        await confirmCatalogOrderPaid({
          db,
          storeId: tenantId,
          orderId,
          paymentPatch: {
            pagoAddi: true,
            addiApplicationId: applicationId || o.addiApplicationId || null,
            addiStatus: status,
          },
          publicOrigin: getPublicOrigin(),
          resendApiKey: readResendApiKey(),
        })
      } else if (ADDI_REJECTED_STATUSES.has(status)) {
        await oref.update({
          estado: 'cancelado',
          addiStatus: status,
          addiApplicationId: applicationId || o.addiApplicationId || null,
          updatedAt: Date.now(),
        })
      }

      await procRef.set({ at: Date.now(), status, orderId })
      res.status(200).json({ ok: true })
    },
  )

  return app
}
