export type OnepayCredentialHints = {
  keyHint?: string
  webhookHint?: string
  webhookTokenHint?: string
  publicKeyHint?: string
}

export type OnepayCredentialFieldValues = {
  secretKey: string
  webhookSecret: string
  webhookToken: string
  publicKey: string
}

export type OnepayCredentialsPayload = Partial<{
  secretKey: string
  webhookSecret: string
  webhookToken: string
  publicKey: string
}>

export function buildOnepayCredentialsPayload(
  fields: OnepayCredentialFieldValues,
): OnepayCredentialsPayload {
  const out: OnepayCredentialsPayload = {}
  const sk = fields.secretKey.trim()
  const wh = fields.webhookSecret.trim()
  const wt = fields.webhookToken.trim()
  const pk = fields.publicKey.trim()
  if (sk) out.secretKey = sk
  if (wh) out.webhookSecret = wh
  if (wt) out.webhookToken = wt
  if (pk) out.publicKey = pk
  return out
}

export function onepayCredentialPlaceholder(
  hint: string | undefined,
  emptyLabel: string,
): string {
  if (hint) return `Dejar vacío para mantener ···${hint}`
  return emptyLabel
}

export function validateOnepayCredentialsPayload(
  payload: OnepayCredentialsPayload,
  isConfigured: boolean,
): string | null {
  if (isConfigured) {
    if (Object.keys(payload).length === 0) {
      return 'Completá al menos un campo para actualizar las credenciales.'
    }
    return null
  }
  if (!payload.secretKey) {
    return 'La clave API (sk_test_… o sk_live_…) es obligatoria para la primera vinculación.'
  }
  if (
    !payload.secretKey.startsWith('sk_test_') &&
    !payload.secretKey.startsWith('sk_live_')
  ) {
    return 'La clave debe ser la API secret de OnePay (sk_test_… o sk_live_…).'
  }
  return null
}
