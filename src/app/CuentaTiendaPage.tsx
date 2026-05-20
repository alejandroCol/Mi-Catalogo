import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { CheckoutEnvioRequiredModal } from '@/app/CheckoutEnvioRequiredModal'
import { CheckoutVentasRequiredModal } from '@/app/CheckoutVentasRequiredModal'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
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

  useEffect(() => {
    if (!firebaseConfigured) return
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
    })
  }, [])

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
