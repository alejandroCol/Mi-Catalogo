import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteField, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { CheckoutEnvioRequiredModal } from '@/app/CheckoutEnvioRequiredModal'
import { CheckoutVentasRequiredModal } from '@/app/CheckoutVentasRequiredModal'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { IconClipboard } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { catalogoVendedorGate, isCatalogoVendedorListo } from '@/lib/checkoutVentasModo'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

export function CuentaTiendaPage() {
  const { profile, tenant } = useMcAuth()
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [copiedCatalogo, setCopiedCatalogo] = useState(false)
  const [ventasRequiredModalOpen, setVentasRequiredModalOpen] = useState(false)
  const [envioRequiredModalOpen, setEnvioRequiredModalOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [descuentosTabEnabled, setDescuentosTabEnabled] = useState(false)
  const [descuentosTabLabel, setDescuentosTabLabel] = useState('')
  const [descuentosTabBusy, setDescuentosTabBusy] = useState(false)
  const [descuentosTabErr, setDescuentosTabErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  useEffect(() => {
    if (!firebaseConfigured) return
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
    })
  }, [])

  useEffect(() => {
    if (!tenant) return
    setDescuentosTabEnabled(!!tenant.catalogDescuentosTab?.enabled)
    setDescuentosTabLabel(tenant.catalogDescuentosTab?.label ?? '')
  }, [tenant?.id, tenant?.catalogDescuentosTab?.enabled, tenant?.catalogDescuentosTab?.label])

  const catalogoUrlAbsolute = useMemo(() => {
    if (!tenant?.slug || typeof window === 'undefined') return ''
    return `${window.location.origin}/c/${tenant.slug}`
  }, [tenant?.slug])

  const catalogoListo = tenant ? isCatalogoVendedorListo(tenant, platformSettings) : false

  function solicitarAccesoCatalogo(): boolean {
    const gate = tenant ? catalogoVendedorGate(tenant, platformSettings) : 'ventas'
    if (gate === 'ventas') {
      setVentasRequiredModalOpen(true)
      return false
    }
    if (gate === 'envio') {
      setEnvioRequiredModalOpen(true)
      return false
    }
    return true
  }

  async function copiarUrlCatalogo() {
    if (!solicitarAccesoCatalogo()) return
    if (!catalogoUrlAbsolute || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(catalogoUrlAbsolute)
      setCopiedCatalogo(true)
      window.setTimeout(() => setCopiedCatalogo(false), 2200)
    } catch {
      setMsg('No se pudo copiar. Copiá manualmente desde la barra del navegador.')
    }
  }

  async function guardarDescuentosTab() {
    if (!profile?.tenantId || !tenant) return
    setDescuentosTabBusy(true)
    setDescuentosTabErr(null)
    try {
      const labelTrim = descuentosTabLabel.trim()
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        catalogDescuentosTab: descuentosTabEnabled
          ? {
              enabled: true,
              ...(labelTrim ? { label: labelTrim.slice(0, 32) } : {}),
            }
          : deleteField(),
      })
      showSaveSuccess({ message: 'La pestaña de descuentos del catálogo se actualizó.' })
    } catch {
      setDescuentosTabErr('No se pudo guardar. Revisá conexión.')
    } finally {
      setDescuentosTabBusy(false)
    }
  }

  if (!tenant) {
    return (
      <ConfiguracionesSubpageLayout title="Tienda y catálogo">
        <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
      </ConfiguracionesSubpageLayout>
    )
  }

  return (
    <ConfiguracionesSubpageLayout title="Tienda y catálogo">
      <div className="mc-card space-y-5">
        <div>
          <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Nombre de la tienda</p>
          <p className="ios-subhead mt-1 font-medium text-[var(--cat-text)]">{tenant.nombreTienda}</p>
        </div>
        <div>
          <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Tu catálogo público</p>
          <p className="mt-1 break-all font-mono text-[13px] text-[var(--cat-muted)]">
            {catalogoUrlAbsolute || `/c/${tenant.slug}`}
          </p>
          {!catalogoListo && (
            <p className="ios-footnote mt-2 leading-relaxed text-amber-900">
              Configurá cómo cobrás y el envío antes de compartir el enlace.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-200/75 bg-[var(--cat-surface)] px-3 py-3 text-[15px] font-medium text-[var(--cat-text)] transition hover:bg-neutral-50/90"
            disabled={!catalogoUrlAbsolute}
            onClick={() => void copiarUrlCatalogo()}
          >
            <IconClipboard size={17} />
            {copiedCatalogo ? 'Copiado' : 'Copiar URL'}
          </button>
          <Link
            to={`/c/${tenant.slug}`}
            className="mc-btn-secondary inline-flex flex-1 items-center justify-center py-3 text-[15px] no-underline"
            onClick={(e) => {
              if (catalogoListo) return
              e.preventDefault()
              void solicitarAccesoCatalogo()
            }}
          >
            Abrir catálogo
          </Link>
        </div>
        {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
      </div>

      <div className="mc-card mt-6 space-y-4">
        <div>
          <h2 className="ios-headline text-[var(--cat-text)]">Tab de ofertas</h2>
          <p className="ios-footnote mt-1.5 max-w-xl leading-relaxed text-[var(--cat-muted)]">
            Mostrá un tab en tu catálogo con todos los productos que tengan descuento. Podés personalizar el nombre
            (por ejemplo «Remate» o «Liquidación»).
          </p>
        </div>

        <McToggleSwitch
          id="mc-descuentos-tab-enabled"
          checked={descuentosTabEnabled}
          disabled={descuentosTabBusy}
          onChange={setDescuentosTabEnabled}
          label="Mostrar tab de descuentos en la tienda"
          description="Los clientes verán un tab junto a «Todos» con los artículos en oferta."
        />

        {descuentosTabEnabled && (
          <div>
            <label htmlFor="mc-descuentos-tab-label" className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
              Nombre del tab
            </label>
            <input
              id="mc-descuentos-tab-label"
              className="mc-input mt-1.5"
              value={descuentosTabLabel}
              maxLength={32}
              disabled={descuentosTabBusy}
              placeholder="Descuento"
              onChange={(e) => setDescuentosTabLabel(e.target.value)}
            />
            <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
              Si lo dejás vacío, se mostrará «Descuento».
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="mc-btn-primary px-5 py-2.5 text-[15px]"
            disabled={descuentosTabBusy}
            onClick={() => void guardarDescuentosTab()}
          >
            {descuentosTabBusy ? 'Guardando…' : 'Guardar tab de ofertas'}
          </button>
          {descuentosTabErr && (
            <p className="text-[14px] text-red-800" aria-live="polite">
              {descuentosTabErr}
            </p>
          )}
        </div>
      </div>

      <CheckoutVentasRequiredModal
        open={ventasRequiredModalOpen}
        onClose={() => setVentasRequiredModalOpen(false)}
        context="dashboard"
        tenant={tenant}
        tenantId={profile?.tenantId}
        platformSettings={platformSettings}
      />
      <CheckoutEnvioRequiredModal open={envioRequiredModalOpen} onClose={() => setEnvioRequiredModalOpen(false)} />
    </ConfiguracionesSubpageLayout>
  )
}
