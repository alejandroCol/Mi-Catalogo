import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import {
  CONFIG_SUBPAGE_DEFAULT_LABEL,
  CONFIG_SUBPAGE_DEFAULT_RETURN,
  configSubpageBackText,
  useConfigSubpageNav,
} from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, firebaseStorageConfigured, getFirebaseFunctions, getStorageApp } from '@/lib/firebase'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import { IconBankCard, IconChevronLeft, IconChevronRight } from '@/icons/McIcons'
import {
  ONEPAY_KYB_ACCOUNT_TYPES_ORDER,
  ONEPAY_KYB_FISCAL_PRESETS,
  resolveOnepayFiscalResponsibilities,
  ONEPAY_KYB_SALES_OPTIONS,
  ONEPAY_KYB_TERMS_VERSION,
  isOnePayKybBankAccountType,
  onePayKybAccountTypeLabel,
  onePayKybSalesLabel,
  type OnePayKybBankAccountType,
} from '@/lib/onepayKyb'
import {
  ONEPAY_FUND_WITHDRAWAL_PERIODS,
  onepayFundWithdrawalPeriodLabel,
  type OnepayFundWithdrawalPeriod,
} from '@/lib/onepayFundWithdrawalPeriod'
import { isTenantMembershipActive } from '@/lib/subscription'
import { KybPdfUploadField, type KybPdfFieldKey } from '@/components/onepay/KybPdfUploadField'
import { OnepayKybCiiuPicker } from '@/components/onepay/OnepayKybCiiuPicker'
import { OnepayKybCityPicker } from '@/components/onepay/OnepayKybCityPicker'

function callableErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return 'No se pudo completar el envío.'
}

function OnepayKybAlertDialog({
  open,
  message,
  onClose,
}: {
  open: boolean
  message: string | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !message) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mc-onepay-kyb-err-title"
      aria-describedby="mc-onepay-kyb-err-desc"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative mx-4 mb-4 w-full max-w-md rounded-t-xl border border-red-200/55 bg-[var(--cat-surface)] p-5 shadow-lg sm:mx-0 sm:mb-0 sm:rounded-xl">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 id="mc-onepay-kyb-err-title" className="ios-headline mt-4 text-center text-[var(--cat-text)]">
          Revisá estos datos
        </h2>
        <p
          id="mc-onepay-kyb-err-desc"
          className="ios-footnote mt-2 text-center leading-relaxed text-[var(--cat-muted)]"
        >
          {message}
        </p>
        <button
          type="button"
          className="mc-btn-primary mt-5 inline-flex w-full items-center justify-center py-3 text-[15px]"
          onClick={onClose}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

type CompanyKind = 'organization' | 'individual'

type KybBankRow = { id: string; name: string; supported_types: string[] }

function PagosPasarelaBackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-[15px] font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
    >
      <IconChevronLeft size={18} />
      {configSubpageBackText(label)}
    </Link>
  )
}

export function PagosPasarelaPage() {
  const { profile, tenant, firebaseUser, isActingAsStoreOwner } = useMcAuth()
  const { returnTo, returnLabel } = useConfigSubpageNav(
    CONFIG_SUBPAGE_DEFAULT_RETURN,
    CONFIG_SUBPAGE_DEFAULT_LABEL,
  )
  const idemNonceRef = useRef<string | null>(null)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && !idemNonceRef.current) {
    idemNonceRef.current = crypto.randomUUID()
  }

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [doneId, setDoneId] = useState<string | null>(null)

  const [companyType, setCompanyType] = useState<CompanyKind>('individual')
  const [name, setName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [documentType, setDocumentType] = useState('CC')
  const [documentNumber, setDocumentNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [economicActivity, setEconomicActivity] = useState('')
  const [industry, setIndustry] = useState('')
  const [sales, setSales] = useState<number>(10)
  const [fiscalSelected, setFiscalSelected] = useState<string[]>([])
  const [retentionIva, setRetentionIva] = useState(false)
  const [retentionIca, setRetentionIca] = useState(false)
  const [retentionFuente, setRetentionFuente] = useState(false)

  const [cityId, setCityId] = useState('')
  const [cityLabel, setCityLabel] = useState('')
  const [address, setAddress] = useState('')
  const [addressHint, setAddressHint] = useState('')
  const [zipcode, setZipcode] = useState('')

  const [docRutUrl, setDocRutUrl] = useState('')
  const [docDniUrl, setDocDniUrl] = useState('')
  const [docCccUrl, setDocCccUrl] = useState('')
  const [docBankUrl, setDocBankUrl] = useState('')
  const [docSimpleUrl, setDocSimpleUrl] = useState('')

  const [kybBanks, setKybBanks] = useState<KybBankRow[]>([])
  const [kybBanksLoading, setKybBanksLoading] = useState(false)
  const [kybBanksErr, setKybBanksErr] = useState<string | null>(null)
  const [accountBankId, setAccountBankId] = useState('')
  const [accountType, setAccountType] = useState<OnePayKybBankAccountType>('savings')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountTermsAccepted, setAccountTermsAccepted] = useState(false)

  const [kybPdfUploadField, setKybPdfUploadField] = useState<KybPdfFieldKey | null>(null)

  const [ownerName, setOwnerName] = useState('')
  const [ownerLastName, setOwnerLastName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerDocType, setOwnerDocType] = useState<'cc' | 'ce'>('cc')
  const [ownerDni, setOwnerDni] = useState('')

  const [termsAccepted, setTermsAccepted] = useState(false)
  const [fundWithdrawalPeriod, setFundWithdrawalPeriod] = useState<OnepayFundWithdrawalPeriod>('weekly')
  const [phoneTouched, setPhoneTouched] = useState(false)

  const publicCatalogUrl = useMemo(() => {
    if (!tenant?.slug) return ''
    return buildStorePublicUrl(tenant.slug)
  }, [tenant?.slug])

  /** true = persona jurídica; false = persona natural */
  const esPersonaJuridica = companyType === 'organization'

  const kybAccountTypesAllowed = useMemo(() => {
    const row = kybBanks.find((x) => x.id === accountBankId)
    return ONEPAY_KYB_ACCOUNT_TYPES_ORDER.filter((t) => row?.supported_types.includes(t))
  }, [accountBankId, kybBanks])

  const stepLabels = useMemo(() => {
    if (companyType === 'organization') {
      return ['Tu negocio', 'Fiscal y dirección', 'Documentos', 'Representante', 'Envío']
    }
    return ['Tu negocio', 'Fiscal y dirección', 'Documentos', 'Envío']
  }, [companyType])

  const maxStep = stepLabels.length - 1

  useEffect(() => {
    if (!tenant) return
    setName(tenant.nombreTienda?.trim() || '')
    setLegalName(tenant.nombreTienda?.trim() || '')
    if (publicCatalogUrl) setWebsite(publicCatalogUrl)
  }, [tenant, publicCatalogUrl])

  useEffect(() => {
    const em = firebaseUser?.email?.trim()
    if (em) setEmail(em)
  }, [firebaseUser?.email])

  useEffect(() => {
    if (!tenant?.whatsappNumero || phoneTouched) return
    const d = tenant.whatsappNumero.replace(/\D/g, '')
    if (d.length >= 10 && d.length <= 15) {
      setPhone(`+${d}`)
    }
  }, [tenant?.whatsappNumero, phoneTouched])

  useEffect(() => {
    if (companyType === 'organization') {
      setDocumentType((d) => (d === 'CC' || d === 'CE' || d === 'PPT' || d === 'PEP' || d === 'PASSPORT' ? 'NIT' : d))
    } else {
      setDocumentType((d) => (d === 'NIT' || d === 'RUT' ? 'CC' : d))
    }
  }, [companyType])

  useEffect(() => {
    setStep((s) => Math.min(s, maxStep))
  }, [maxStep])

  const isOwner = isActingAsStoreOwner
  const subActive = tenant ? isTenantMembershipActive(tenant) : false

  const kyb = tenant?.onepayKybStatus
  const pending = kyb === 'pending'
  const approvedKyb = kyb === 'approved'

  function toggleFiscal(code: string) {
    setFiscalSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  const handleKybPdfPick = useCallback(
    async (field: KybPdfFieldKey, list: FileList | null) => {
      const file = list?.item(0)
      if (!file || !tenant?.id) return
      if (!firebaseStorageConfigured) {
        setErr('Firebase Storage no está configurado. Contactá soporte para habilitar la subida de documentos.')
        return
      }
      const looksPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
      if (!looksPdf) {
        setErr('Elegí un archivo PDF.')
        return
      }
      if (file.size > 15 * 1024 * 1024) {
        setErr('El PDF debe pesar menos de 15 MB.')
        return
      }
      setKybPdfUploadField(field)
      setErr(null)
      try {
        const storage = getStorageApp()
        const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`
        const pathRef = ref(storage, `mc_tenants/${tenant.id}/onepay_kyb/${field}_${token}.pdf`)
        await uploadBytes(pathRef, file, { contentType: 'application/pdf' })
        const url = await getDownloadURL(pathRef)
        if (!url.startsWith('https://')) {
          setErr('La URL generada no es https://; no se puede usar con OnePay.')
          return
        }
        switch (field) {
          case 'rut':
            setDocRutUrl(url)
            break
          case 'dni':
            setDocDniUrl(url)
            break
          case 'ccc':
            setDocCccUrl(url)
            break
          case 'bank':
            setDocBankUrl(url)
            break
          case 'simple':
            setDocSimpleUrl(url)
            break
        }
      } catch {
        setErr('No se pudo subir el PDF. Revisá conexión y reglas de Storage (onepay_kyb).')
      } finally {
        setKybPdfUploadField(null)
      }
    },
    [tenant?.id],
  )

  const loadKybBanks = useCallback(async () => {
    if (!firebaseConfigured || !subActive) return
    setKybBanksLoading(true)
    setKybBanksErr(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayListBanksForKyb')
      const res = (await fn({})) as { data?: { banks?: KybBankRow[] } }
      const list = res.data?.banks
      setKybBanks(Array.isArray(list) ? list : [])
    } catch (e) {
      setKybBanksErr(callableErrorMessage(e))
      setKybBanks([])
    } finally {
      setKybBanksLoading(false)
    }
  }, [subActive])

  useEffect(() => {
    if (step !== 2 || companyType !== 'individual' || !subActive) return
    void loadKybBanks()
  }, [step, companyType, subActive, loadKybBanks])

  useEffect(() => {
    if (!accountBankId || !kybBanks.length) return
    const row = kybBanks.find((x) => x.id === accountBankId)
    const allowed = ONEPAY_KYB_ACCOUNT_TYPES_ORDER.filter((t) => row?.supported_types.includes(t))
    if (allowed.length === 0) return
    setAccountType((prev) => (allowed.includes(prev) ? prev : allowed[0]))
  }, [accountBankId, kybBanks])

  const validateStep = useCallback(
    (s: number): string | null => {
      if (s === 0) {
        if (!name.trim()) return 'Completá el nombre comercial.'
        if (!documentNumber.trim()) return 'Completá el número de documento.'
        if (!phone.trim()) return 'Completá el teléfono.'
        if (!email.includes('@')) return 'Completá un correo válido.'
        if (!website.startsWith('https://')) return 'El sitio web debe ser una URL https:// (podés usar la de tu catálogo).'
        if (
          !economicActivity.trim() ||
          !/^\d{4}$/.test(economicActivity.trim())
        ) {
          return 'CIIU (actividad económica): exactamente 4 dígitos (obligatorio para OnePay).'
        }
        if (esPersonaJuridica && industry.trim() && !/^\d{4}$/.test(industry.trim())) {
          return 'Industria: 4 dígitos o vacío.'
        }
      }
      if (s === 1) {
        if (!cityId.trim() || !/^\d+$/.test(cityId.trim())) {
          return 'Elegí departamento y ciudad del listado OnePay.'
        }
        if (!address.trim()) return 'Completá la dirección.'
        if (!addressHint.trim()) return 'Completá complemento (piso, local, etc.).'
        if (!/^\d{5,9}$/.test(zipcode.trim())) return 'Código postal: 5 a 9 dígitos.'
        if (resolveOnepayFiscalResponsibilities(fiscalSelected).length === 0) {
          return 'Elegí la responsabilidad fiscal que figura en tu RUT: régimen simple (O-47), agente de retención IVA (O-23), autorretenedor (O-15) o gran contribuyente (O-13).'
        }
      }
      if (s === 2) {
        if (!docRutUrl.startsWith('https://')) return 'Subí el RUT en PDF.'
        if (!docDniUrl.startsWith('https://')) {
          return esPersonaJuridica
            ? 'Subí el documento de identidad del representante en PDF.'
            : 'Subí tu documento de identidad en PDF.'
        }
        if (resolveOnepayFiscalResponsibilities(fiscalSelected).includes('O_47') && !docSimpleUrl.startsWith('https://')) {
          return 'Con régimen simple (O-47) tenés que subir el certificado en PDF.'
        }
        if (esPersonaJuridica) {
          if (!docCccUrl.startsWith('https://')) return 'Subí el certificado de cámara de comercio en PDF.'
          if (!docBankUrl.startsWith('https://')) return 'Subí la certificación bancaria en PDF.'
        } else {
          const bid = accountBankId.trim()
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bid)) {
            return 'Elegí el banco donde recibirías las dispersiones.'
          }
          const row = kybBanks.find((x) => x.id === bid)
          const allowed = ONEPAY_KYB_ACCOUNT_TYPES_ORDER.filter((t) => row?.supported_types.includes(t))
          if (!row || allowed.length === 0) {
            return 'No pudimos validar el banco elegido. Recargá la lista o elegí otro.'
          }
          if (!isOnePayKybBankAccountType(accountType) || !allowed.includes(accountType)) {
            return 'Elegí un tipo de cuenta que el banco permita.'
          }
          const accNorm = accountNumber.trim().replace(/\s+/g, '')
          if (accNorm.length < 5 || accNorm.length > 40) {
            return 'Número de cuenta: entre 5 y 40 caracteres (sin espacios).'
          }
          if (!/^[0-9A-Za-z]+$/.test(accNorm)) {
            return 'Número de cuenta: solo letras y números.'
          }
          if (!accountTermsAccepted) {
            return 'Aceptá los términos de dispersiones de OnePay para la cuenta indicada.'
          }
        }
      }
      if (s === 3 && esPersonaJuridica) {
        if (!ownerName.trim() || !ownerLastName.trim()) return 'Nombre y apellido del representante.'
        if (!ownerPhone.trim()) return 'Teléfono del representante.'
        if (!ownerEmail.includes('@')) return 'Correo del representante.'
        if (!ownerDni.trim()) return 'Documento del representante.'
      }
      return null
    },
    [
      name,
      documentNumber,
      phone,
      email,
      website,
      economicActivity,
      industry,
      esPersonaJuridica,
      cityId,
      address,
      addressHint,
      zipcode,
      fiscalSelected,
      docRutUrl,
      docDniUrl,
      docCccUrl,
      docBankUrl,
      docSimpleUrl,
      ownerName,
      ownerLastName,
      ownerPhone,
      ownerEmail,
      ownerDni,
      kybBanks,
      accountBankId,
      accountType,
      accountNumber,
      accountTermsAccepted,
    ],
  )

  function goNext() {
    const v = validateStep(step)
    if (v) {
      setErr(v)
      return
    }
    setErr(null)
    setStep((x) => Math.min(maxStep, x + 1))
  }

  function goPrev() {
    setErr(null)
    setStep((x) => Math.max(0, x - 1))
  }

  async function submit() {
    const v = validateStep(step)
    if (v) {
      setErr(v)
      return
    }
    if (!termsAccepted) {
      setErr('Debés aceptar los términos y condiciones.')
      return
    }
    const nonce = idemNonceRef.current
    if (!firebaseConfigured || !nonce) {
      setErr('Firebase no está configurado o falta token de envío.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepaySubmitCompanyKyb')
      const res = (await fn({
        termsAccepted: true,
        termsVersion: ONEPAY_KYB_TERMS_VERSION,
        idempotencyNonce: nonce,
        companyType,
        name: name.trim(),
        legal_name:
          companyType === 'organization' ? (legalName.trim() || name.trim()) : name.trim(),
        document_type: documentType,
        document_number: documentNumber.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        economic_activity: economicActivity.trim(),
        industry: industry.trim() || undefined,
        sales,
        fiscal_responsibilities: resolveOnepayFiscalResponsibilities(fiscalSelected),
        retention_iva: retentionIva,
        retention_ica: retentionIca,
        retention_fuente: retentionFuente,
        city_id: parseInt(cityId.trim(), 10),
        address: address.trim(),
        address_hint: addressHint.trim(),
        zipcode: zipcode.trim(),
        doc_rut_url: docRutUrl.trim(),
        doc_dni_url: docDniUrl.trim(),
        doc_ccc_url: companyType === 'organization' ? docCccUrl.trim() : undefined,
        doc_bank_url: companyType === 'organization' ? docBankUrl.trim() : undefined,
        doc_simple_url: docSimpleUrl.trim() || undefined,
        owner_name: companyType === 'organization' ? ownerName.trim() : undefined,
        owner_last_name: companyType === 'organization' ? ownerLastName.trim() : undefined,
        owner_phone: companyType === 'organization' ? ownerPhone.trim() : undefined,
        owner_email: companyType === 'organization' ? ownerEmail.trim() : undefined,
        owner_document_type: companyType === 'organization' ? ownerDocType : undefined,
        owner_dni: companyType === 'organization' ? ownerDni.trim() : undefined,
        account_bank_id: companyType === 'individual' ? accountBankId.trim() : undefined,
        account_type: companyType === 'individual' ? accountType : undefined,
        account_number: companyType === 'individual' ? accountNumber.trim() : undefined,
        account_terms: companyType === 'individual' ? accountTermsAccepted : undefined,
        fundWithdrawalPeriod,
      })) as { data: { companyId?: string } }
      const id = res.data?.companyId
      if (id) setDoneId(id)
      else setErr('Respuesta sin ID de empresa.')
    } catch (e) {
      setErr(callableErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!tenant || !profile) {
    return (
      <div className="mc-shell">
        <p className="ios-subhead">Cargando…</p>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="mc-shell space-y-6 pb-28">
        <PagosPasarelaBackLink to={returnTo} label={returnLabel} />
        <p className="text-[15px] leading-relaxed text-[var(--cat-muted)]">
          Solo el dueño de la tienda puede iniciar la solicitud de pasarela de pagos.
        </p>
      </div>
    )
  }

  if (doneId) {
    return (
      <div className="mc-shell space-y-8 pb-28">
        <PagosPasarelaBackLink to={returnTo} label={returnLabel} />
        <div className="border border-emerald-200/60 bg-emerald-50/40 px-5 py-6 text-[15px] leading-relaxed text-emerald-950">
          <p className="font-medium">Solicitud enviada a OnePay</p>
          <p className="mt-2">
            Registro <span className="font-mono text-[13px]">{doneId}</span>. Tu cuenta quedó en estado{' '}
            <strong>pendiente de revisión</strong>. Cuando OnePay y nuestro equipo den el OK, el equipo de plataforma cargará tu
            clave API en el panel de soporte para activar cobros con tarjeta, Nequi y PSE en el checkout.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mc-shell space-y-8 pb-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PagosPasarelaBackLink to={returnTo} label={returnLabel} />
      </div>

      <header className="border border-neutral-200/45 bg-[color-mix(in_srgb,var(--cat-accent)_10%,var(--cat-surface))] px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--cat-muted)]">Pasarela</p>
            <h1 className="mt-2 text-[1.65rem] font-medium leading-[1.12] tracking-tight text-[var(--cat-text)] sm:text-[1.85rem]">
              Cobros en tu catálogo
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--cat-muted)]">
              Activá pagos con <strong className="font-medium text-[var(--cat-text)]">tarjeta</strong>,{' '}
              <strong className="font-medium text-[var(--cat-text)]">Nequi</strong>,{' '}
              <strong className="font-medium text-[var(--cat-text)]">PSE</strong> y más, con OnePay. Primero creamos tu
              empresa en la pasarela; recién tras la aprobación el equipo de la plataforma vincula la clave API de tu tienda en
              el panel de soporte para habilitar el checkout en línea.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Tarjeta', 'Nequi', 'PSE', 'Daviplata', 'Bre-B'].map((label) => (
                <span
                  key={label}
                  className="border border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] bg-[var(--cat-surface)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--cat-text)]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-neutral-200/60 bg-[var(--cat-surface)] text-[var(--cat-text)]">
            <IconBankCard size={24} />
          </span>
        </div>
      </header>

      {!subActive && (
        <p className="border border-amber-200/60 bg-amber-50/35 px-4 py-3 text-[14px] leading-relaxed text-amber-950">
          Tu membresía no está activa. Renovala para enviar la solicitud.
        </p>
      )}

      <details className="rounded-none border border-neutral-200/50 bg-[var(--cat-surface)]/80 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none px-4 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-text)] sm:px-5">
          Ver comisión
        </summary>
        <div className="border-t border-neutral-200/45 px-4 py-4 sm:px-5">
          <p className="text-[14px] leading-relaxed text-[var(--cat-text)]">
            Por transacción a través de la pasarela: <strong className="font-medium">3,49%</strong> del monto más{' '}
            <strong className="font-medium">$800 COP</strong> fijos, más el <strong className="font-medium">IVA</strong>{' '}
            correspondiente{' '}
            <span className="text-[var(--cat-muted)]">
              (calculado sobre la comisión, no sobre el total de la venta)
            </span>
            , según normativa colombiana vigente.
          </p>
        </div>
      </details>

      {pending && (
        <div className="border border-neutral-200/50 bg-[var(--cat-surface)] px-4 py-4 text-[14px] leading-relaxed text-[var(--cat-text)]">
          <p className="font-medium">Solicitud en revisión</p>
          <p className="mt-1 text-[var(--cat-muted)]">
            {tenant.onepayCompanyId ? (
              <>
                ID en OnePay: <span className="font-mono text-[13px]">{tenant.onepayCompanyId}</span>. Cuando esté aprobada,
                te avisamos: después el equipo cargará tu clave API (panel súper admin) para habilitar cobros.
              </>
            ) : (
              'Cuando esté aprobada, te avisamos; el equipo de plataforma completa la vinculación OnePay.'
            )}
          </p>
        </div>
      )}

      {approvedKyb && !tenant.onepayPaymentsEnabled && (
        <div className="border border-emerald-200/55 bg-emerald-50/35 px-4 py-4 text-[14px] leading-relaxed text-emerald-950">
          <p className="font-medium">Tu empresa OnePay fue aprobada</p>
          <p className="mt-1">
            El equipo de plataforma completará la vinculación (clave API y webhook OnePay). En{' '}
            <Link to="/app/cuenta" className="font-medium underline underline-offset-2">
              Cuenta
            </Link>{' '}
            podés elegir modo <strong>Pasarela</strong> cuando todo esté listo.
          </p>
        </div>
      )}

      {(pending || approvedKyb) ? null : (
        <>
          <div className="flex flex-wrap gap-1.5 border-b border-neutral-200/40 pb-3">
            {stepLabels.map((label, i) => (
              <button
                key={label}
                type="button"
                disabled={!subActive || busy}
                onClick={() => {
                  for (let j = 0; j < i; j++) {
                    const ve = validateStep(j)
                    if (ve) {
                      setErr(ve)
                      setStep(j)
                      return
                    }
                  }
                  setErr(null)
                  setStep(i)
                }}
                className={`min-w-0 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] transition ${
                  i === step
                    ? 'bg-[var(--cat-text)] text-[var(--cat-bg)]'
                    : 'border border-neutral-200/60 text-[var(--cat-muted)] hover:border-neutral-300'
                }`}
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>

          <div className="space-y-5 max-w-2xl">
            {step === 0 && (
              <>
                <div className="flex flex-col gap-3 sm:flex-row" role="radiogroup" aria-label="Tipo de constitución del comercio">
                  <label
                    className={`flex min-h-[52px] flex-1 cursor-pointer flex-col justify-center gap-1 border px-4 py-3 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--cat-text)] has-[:focus-visible]:ring-offset-2 sm:gap-2 ${
                      !esPersonaJuridica
                        ? 'border-[var(--cat-text)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,transparent)]'
                        : 'border-neutral-200/60 hover:border-neutral-300/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mc-onepay-company-kind"
                      className="sr-only"
                      checked={!esPersonaJuridica}
                      disabled={!subActive || busy}
                      onChange={() => setCompanyType('individual')}
                    />
                    <span
                      className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${
                        !esPersonaJuridica ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)]'
                      }`}
                    >
                      Persona natural
                    </span>
                  </label>
                  <label
                    className={`flex min-h-[52px] flex-1 cursor-pointer flex-col justify-center gap-1 border px-4 py-3 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--cat-text)] has-[:focus-visible]:ring-offset-2 sm:gap-2 ${
                      esPersonaJuridica
                        ? 'border-[var(--cat-text)] bg-[color-mix(in_srgb,var(--cat-accent)_12%,transparent)]'
                        : 'border-neutral-200/60 hover:border-neutral-300/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mc-onepay-company-kind"
                      className="sr-only"
                      checked={esPersonaJuridica}
                      disabled={!subActive || busy}
                      onChange={() => setCompanyType('organization')}
                    />
                    <span
                      className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${
                        esPersonaJuridica ? 'text-[var(--cat-text)]' : 'text-[var(--cat-muted)]'
                      }`}
                    >
                      Empresa
                    </span>
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-[12px] font-medium text-[var(--cat-muted)]">Nombre comercial</span>
                  <input className="mc-input w-full" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
                </label>
                {esPersonaJuridica ? (
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Razón social</span>
                    <input
                      className="mc-input w-full"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      disabled={busy}
                      placeholder="Si es igual al nombre comercial, podés dejarlo así"
                    />
                  </label>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Tipo de documento</span>
                    <select
                      className="mc-input w-full"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={busy}
                    >
                      {esPersonaJuridica ? (
                        <>
                          <option value="NIT">NIT</option>
                          <option value="RUT">RUT</option>
                        </>
                      ) : (
                        <>
                          <option value="CC">CC</option>
                          <option value="CE">CE</option>
                          <option value="PPT">PPT</option>
                          <option value="PEP">PEP</option>
                          <option value="PASSPORT">Pasaporte</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Número</span>
                    <input
                      className="mc-input w-full"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Teléfono</span>
                    <input
                      className="mc-input w-full"
                      value={phone}
                      onChange={(e) => {
                        setPhoneTouched(true)
                        setPhone(e.target.value)
                      }}
                      disabled={busy}
                      placeholder="Ej. +573001234567"
                      autoComplete="tel"
                    />
                    <span className="block text-[11px] leading-relaxed text-[var(--cat-muted)]">
                      Precargamos el número de WhatsApp configurado en Cuenta cuando hay uno válido (podés corregirlo).
                    </span>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Correo</span>
                    <input
                      className="mc-input w-full"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-[12px] font-medium text-[var(--cat-muted)]">Sitio web (https)</span>
                  <input className="mc-input w-full" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={busy} />
                </label>
                <div className={`grid gap-3 ${esPersonaJuridica ? 'sm:grid-cols-2' : ''}`}>
                  <div className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">
                      CIIU — actividad económica (4 dígitos)
                    </span>
                    <OnepayKybCiiuPicker
                      value={economicActivity}
                      onChange={setEconomicActivity}
                      disabled={busy}
                    />
                  </div>
                  {esPersonaJuridica ? (
                    <label className="block space-y-1">
                      <span className="text-[12px] font-medium text-[var(--cat-muted)]">Industria (opcional)</span>
                      <input
                        className="mc-input w-full"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        disabled={busy}
                        maxLength={4}
                        inputMode="numeric"
                      />
                    </label>
                  ) : null}
                </div>
                <label className="block space-y-1">
                  <span className="text-[12px] font-medium text-[var(--cat-muted)]">Ventas anuales aproximadas</span>
                  <select className="mc-input w-full" value={sales} onChange={(e) => setSales(Number(e.target.value))} disabled={busy}>
                    {ONEPAY_KYB_SALES_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {onePayKybSalesLabel(n)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {step === 1 && (
              <>
                <OnepayKybCityPicker
                  cityId={cityId}
                  cityLabel={cityLabel}
                  onCityIdChange={setCityId}
                  onCityLabelChange={setCityLabel}
                  disabled={busy}
                />
                <label className="block space-y-1">
                  <span className="text-[12px] font-medium text-[var(--cat-muted)]">Dirección principal</span>
                  <input className="mc-input w-full" value={address} onChange={(e) => setAddress(e.target.value)} disabled={busy} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[12px] font-medium text-[var(--cat-muted)]">Complemento</span>
                  <input
                    className="mc-input w-full"
                    value={addressHint}
                    onChange={(e) => setAddressHint(e.target.value)}
                    disabled={busy}
                    placeholder="Oficina, piso, conjunto…"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[12px] font-medium text-[var(--cat-muted)]">Código postal</span>
                  <input className="mc-input w-full" value={zipcode} onChange={(e) => setZipcode(e.target.value)} disabled={busy} />
                </label>
                <fieldset className="space-y-3 border border-neutral-200/50 p-3">
                  <legend className="px-1 text-[12px] font-medium text-[var(--cat-text)]">Responsabilidad fiscal (según tu RUT)</legend>
                  <div className="space-y-2.5">
                    {ONEPAY_KYB_FISCAL_PRESETS.map(({ code, label, hint }) => (
                      <label
                        key={code}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                          fiscalSelected.includes(code)
                            ? 'border-[var(--cat-text)] bg-[color-mix(in_srgb,var(--cat-accent)_10%,transparent)]'
                            : 'border-neutral-200/70 hover:border-neutral-300/80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={fiscalSelected.includes(code)}
                          onChange={() => toggleFiscal(code)}
                          disabled={busy}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium text-[var(--cat-text)]">{label}</span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-[var(--cat-muted)]">{hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="space-y-2 border border-neutral-200/50 p-3">
                  <legend className="px-1 text-[12px] font-medium text-[var(--cat-text)]">Retenciones (opcional)</legend>
                  <label className="flex items-center gap-2 text-[14px]">
                    <input type="checkbox" checked={retentionIva} onChange={(e) => setRetentionIva(e.target.checked)} disabled={busy} />
                    Agente retenedor IVA
                  </label>
                  <label className="flex items-center gap-2 text-[14px]">
                    <input type="checkbox" checked={retentionIca} onChange={(e) => setRetentionIca(e.target.checked)} disabled={busy} />
                    Agente retenedor ICA
                  </label>
                  <label className="flex items-center gap-2 text-[14px]">
                    <input type="checkbox" checked={retentionFuente} onChange={(e) => setRetentionFuente(e.target.checked)} disabled={busy} />
                    Retención en la fuente
                  </label>
                </fieldset>
              </>
            )}

            {step === 2 && (
              <>
                <KybPdfUploadField
                  label="RUT (PDF)"
                  field="rut"
                  uploaded={docRutUrl.startsWith('https://')}
                  disabled={busy}
                  uploading={kybPdfUploadField === 'rut'}
                  uploadsLocked={kybPdfUploadField !== null}
                  storageConfigured={firebaseStorageConfigured}
                  onPickPdf={handleKybPdfPick}
                />
                <KybPdfUploadField
                  label={
                    <>Documento identidad titular {esPersonaJuridica ? '(representante)' : ''} (PDF)</>
                  }
                  field="dni"
                  uploaded={docDniUrl.startsWith('https://')}
                  disabled={busy}
                  uploading={kybPdfUploadField === 'dni'}
                  uploadsLocked={kybPdfUploadField !== null}
                  storageConfigured={firebaseStorageConfigured}
                  onPickPdf={handleKybPdfPick}
                />
                {!esPersonaJuridica ? (
                  <fieldset className="space-y-3 border border-neutral-200/50 p-3">
                    <legend className="px-1 text-[12px] font-medium text-[var(--cat-text)]">
                      Cuenta para dispersiones (OnePay)
                    </legend>
                    <p className="text-[13px] leading-relaxed text-[var(--cat-muted)]">
                      Para persona natural, OnePay exige los datos de la cuenta donde recibirías pagos.
                    </p>
                    <label className="block space-y-1">
                      <span className="text-[12px] font-medium text-[var(--cat-muted)]">Banco</span>
                      <select
                        className="mc-input w-full"
                        value={accountBankId}
                        onChange={(e) => setAccountBankId(e.target.value)}
                        disabled={busy || kybBanksLoading}
                      >
                        <option value="">Elegí un banco…</option>
                        {kybBanks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      {kybBanksLoading ? (
                        <span className="text-[11px] text-[var(--cat-muted)]">Cargando bancos desde OnePay…</span>
                      ) : null}
                      {kybBanksErr ? (
                        <span className="flex flex-wrap items-center gap-2 text-[11px] text-red-700">
                          {kybBanksErr}
                          <button
                            type="button"
                            className="font-medium underline"
                            disabled={busy || !subActive}
                            onClick={() => void loadKybBanks()}
                          >
                            Reintentar
                          </button>
                        </span>
                      ) : null}
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-1">
                        <span className="text-[12px] font-medium text-[var(--cat-muted)]">Tipo de cuenta</span>
                        <select
                          className="mc-input w-full"
                          value={
                            kybAccountTypesAllowed.includes(accountType)
                              ? accountType
                              : (kybAccountTypesAllowed[0] ?? '')
                          }
                          onChange={(e) => {
                            const v = e.target.value
                            if (isOnePayKybBankAccountType(v)) setAccountType(v)
                          }}
                          disabled={busy || !accountBankId || kybAccountTypesAllowed.length === 0}
                        >
                          {kybAccountTypesAllowed.length === 0 ? (
                            <option value="">{accountBankId ? 'Sin tipos compatibles' : 'Elegí un banco primero'}</option>
                          ) : (
                            kybAccountTypesAllowed.map((t) => (
                              <option key={t} value={t}>
                                {onePayKybAccountTypeLabel(t)}
                              </option>
                            ))
                          )}
                        </select>
                      </label>
                      <label className="block space-y-1">
                        <span className="text-[12px] font-medium text-[var(--cat-muted)]">Número de cuenta</span>
                        <input
                          className="mc-input w-full"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          disabled={busy}
                          autoComplete="off"
                          placeholder="Solo letras y números, 5–40 caracteres"
                        />
                      </label>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed">
                      <input
                        type="checkbox"
                        checked={accountTermsAccepted}
                        onChange={(e) => setAccountTermsAccepted(e.target.checked)}
                        disabled={busy}
                        className="mt-0.5"
                      />
                      <span>Acepto los términos de OnePay para dispersiones a esta cuenta</span>
                    </label>
                  </fieldset>
                ) : null}
                {esPersonaJuridica ? (
                  <>
                    <KybPdfUploadField
                      label="Cámara de comercio (PDF)"
                      field="ccc"
                      uploaded={docCccUrl.startsWith('https://')}
                      disabled={busy}
                      uploading={kybPdfUploadField === 'ccc'}
                      uploadsLocked={kybPdfUploadField !== null}
                      storageConfigured={firebaseStorageConfigured}
                      onPickPdf={handleKybPdfPick}
                    />
                    <KybPdfUploadField
                      label="Certificación bancaria (PDF)"
                      field="bank"
                      uploaded={docBankUrl.startsWith('https://')}
                      disabled={busy}
                      uploading={kybPdfUploadField === 'bank'}
                      uploadsLocked={kybPdfUploadField !== null}
                      storageConfigured={firebaseStorageConfigured}
                      onPickPdf={handleKybPdfPick}
                    />
                  </>
                ) : null}
                {resolveOnepayFiscalResponsibilities(fiscalSelected).includes('O_47') && (
                  <KybPdfUploadField
                    label="Certificado régimen simple (PDF)"
                    field="simple"
                    uploaded={docSimpleUrl.startsWith('https://')}
                    disabled={busy}
                    uploading={kybPdfUploadField === 'simple'}
                    uploadsLocked={kybPdfUploadField !== null}
                    storageConfigured={firebaseStorageConfigured}
                    onPickPdf={handleKybPdfPick}
                  />
                )}
              </>
            )}

            {step === 3 && esPersonaJuridica && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Nombre representante</span>
                    <input className="mc-input w-full" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} disabled={busy} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Apellido</span>
                    <input
                      className="mc-input w-full"
                      value={ownerLastName}
                      onChange={(e) => setOwnerLastName(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Documento</span>
                    <select
                      className="mc-input w-full"
                      value={ownerDocType}
                      onChange={(e) => setOwnerDocType(e.target.value as 'cc' | 'ce')}
                      disabled={busy}
                    >
                      <option value="cc">CC</option>
                      <option value="ce">CE</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Número</span>
                    <input className="mc-input w-full" value={ownerDni} onChange={(e) => setOwnerDni(e.target.value)} disabled={busy} />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Teléfono</span>
                    <input
                      className="mc-input w-full"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[12px] font-medium text-[var(--cat-muted)]">Correo</span>
                    <input
                      className="mc-input w-full"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>
              </>
            )}

            {((companyType === 'organization' && step === 4) || (companyType === 'individual' && step === 3)) && (
              <>
                <p className="text-[14px] leading-relaxed text-[var(--cat-muted)]">
                  Revisión en OnePay: tu empresa quedará en estado pendiente hasta aprobación. La pasarela en el catálogo se activa
                  cuando tu cuenta OnePay quede activa; mientras podés usar la pasarela sin crear cuenta.
                </p>
                <label className="block space-y-1.5">
                  <span className="text-[12px] font-medium text-[var(--cat-muted)]">
                    ¿Cuándo querés que lleguen los fondos a tu cuenta?
                  </span>
                  <span className="text-[11px] leading-relaxed text-[var(--cat-muted)]">
                    Solo para registro interno del equipo Mi Catálogo; no se envía a OnePay.
                  </span>
                  <select
                    className="mc-input w-full max-w-md"
                    value={fundWithdrawalPeriod}
                    onChange={(e) => setFundWithdrawalPeriod(e.target.value as OnepayFundWithdrawalPeriod)}
                    disabled={busy || !subActive}
                  >
                    {ONEPAY_FUND_WITHDRAWAL_PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {onepayFundWithdrawalPeriodLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex cursor-pointer items-start gap-3 border border-neutral-200/55 p-4 text-[14px] leading-relaxed">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    disabled={busy || !subActive}
                    className="mt-1"
                  />
                  <span>
                    Acepto los términos del servicio de pagos: comisión del <strong className="font-medium">3,49%</strong> más{' '}
                    <strong className="font-medium">$800 COP</strong> por transacción, más IVA sobre la comisión, y autorizo el envío de
                    mis datos a OnePay.
                  </span>
                </label>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200/40 pt-6 max-w-2xl">
            <button
              type="button"
              className="mc-btn-secondary inline-flex items-center gap-1 px-4 py-2.5 text-[15px] disabled:opacity-40"
              disabled={step === 0 || busy || !subActive}
              onClick={goPrev}
            >
              <IconChevronLeft size={18} />
              Anterior
            </button>
            {((companyType === 'organization' && step < 4) || (companyType === 'individual' && step < 3)) && (
              <button
                type="button"
                className="mc-btn-primary inline-flex items-center gap-1 px-4 py-2.5 text-[15px] disabled:opacity-40"
                disabled={!subActive || busy}
                onClick={goNext}
              >
                Siguiente
                <IconChevronRight size={18} />
              </button>
            )}
            {((companyType === 'organization' && step === 4) || (companyType === 'individual' && step === 3)) && (
              <button
                type="button"
                className="mc-btn-cat inline-flex items-center gap-1 px-5 py-3 text-[15px] font-semibold uppercase tracking-[0.1em] disabled:opacity-40"
                disabled={!subActive || busy}
                onClick={() => void submit()}
              >
                {busy ? 'Enviando…' : 'Enviar solicitud'}
              </button>
            )}
          </div>
        </>
      )}

      <OnepayKybAlertDialog open={err !== null} message={err} onClose={() => setErr(null)} />
    </div>
  )
}
