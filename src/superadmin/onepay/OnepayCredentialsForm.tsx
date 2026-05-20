import { useState } from 'react'
import {
  buildOnepayCredentialsPayload,
  onepayCredentialPlaceholder,
  validateOnepayCredentialsPayload,
  type OnepayCredentialHints,
  type OnepayCredentialsPayload,
} from '@/superadmin/onepay/onepayCredentialsPayload'

type OnepayCredentialsFormProps = {
  hints: OnepayCredentialHints
  isConfigured: boolean
  busy: boolean
  onSubmit: (payload: OnepayCredentialsPayload) => Promise<void>
  onValidationError?: (message: string) => void
}

const EMPTY_FIELDS = {
  secretKey: '',
  webhookSecret: '',
  webhookToken: '',
  publicKey: '',
}

export function OnepayCredentialsForm({
  hints,
  isConfigured,
  busy,
  onSubmit,
  onValidationError,
}: OnepayCredentialsFormProps) {
  const [fields, setFields] = useState(EMPTY_FIELDS)

  function patchField<K extends keyof typeof EMPTY_FIELDS>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit() {
    const payload = buildOnepayCredentialsPayload(fields)
    const validationError = validateOnepayCredentialsPayload(payload, isConfigured)
    if (validationError) {
      onValidationError?.(validationError)
      return
    }
    await onSubmit(payload)
    setFields(EMPTY_FIELDS)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-medium text-mc-700">
          {isConfigured ? 'Credenciales OnePay' : 'Paso 1 · Clave API'}
        </p>
        <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
          sk_test_… o sk_live_…
        </label>
        <input
          type="password"
          className="mc-input mt-1 py-2.5 font-mono text-[14px]"
          autoComplete="new-password"
          placeholder={onepayCredentialPlaceholder(hints.keyHint, 'sk_test_…')}
          value={fields.secretKey}
          disabled={busy}
          onChange={(e) => patchField('secretKey', e.target.value)}
        />
      </div>

      <div>
        <p className="text-[12px] font-medium text-mc-700">
          {isConfigured ? 'Webhook OnePay' : 'Paso 2 · Webhook OnePay'}
        </p>
        <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
          Secreto HMAC (<span className="font-mono">whsec_…</span>
          {isConfigured ? '' : ', al crear el webhook'})
        </label>
        <input
          type="password"
          className="mc-input mt-1 py-2.5 font-mono text-[14px]"
          autoComplete="new-password"
          placeholder={onepayCredentialPlaceholder(hints.webhookHint, 'whsec_…')}
          value={fields.webhookSecret}
          disabled={busy}
          onChange={(e) => patchField('webhookSecret', e.target.value)}
        />
        <label className="ios-footnote mt-3 block font-medium text-[var(--cat-text)] opacity-80">
          Header / token (<span className="font-mono">wh_hdr_…</span> →{' '}
          <span className="font-mono">x-webhook-token</span>)
        </label>
        <input
          type="password"
          className="mc-input mt-1 py-2.5 font-mono text-[14px]"
          autoComplete="new-password"
          placeholder={onepayCredentialPlaceholder(hints.webhookTokenHint, 'wh_hdr_…')}
          value={fields.webhookToken}
          disabled={busy}
          onChange={(e) => patchField('webhookToken', e.target.value)}
        />
        <label className="ios-footnote mt-3 block font-medium text-[var(--cat-text)] opacity-80">
          Clave pública opcional (<span className="font-mono">pk_test_…</span> /{' '}
          <span className="font-mono">pk_live_…</span>)
        </label>
        <input
          type="password"
          className="mc-input mt-1 py-2.5 font-mono text-[14px]"
          autoComplete="new-password"
          placeholder={onepayCredentialPlaceholder(hints.publicKeyHint, 'pk_test_…')}
          value={fields.publicKey}
          disabled={busy}
          onChange={(e) => patchField('publicKey', e.target.value)}
        />
      </div>

      <button
        type="button"
        className="mc-btn-primary w-full py-2.5 text-[14px]"
        disabled={busy}
        onClick={() => void handleSubmit()}
      >
        {busy ? 'Guardando…' : isConfigured ? 'Guardar cambios' : 'Guardar credenciales'}
      </button>

      {!isConfigured ? (
        <p className="text-[11px] leading-relaxed text-mc-500">
          Podés enviar la clave API y el webhook en un solo guardado, o completarlos por separado.
          Solo se guardan los campos que escribas.
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed text-mc-500">
          Las credenciales guardadas no se muestran. Completá solo los campos que quieras cambiar.
        </p>
      )}
    </div>
  )
}
