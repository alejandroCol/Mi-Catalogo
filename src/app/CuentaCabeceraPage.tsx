import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  CATALOG_HEADER_LAYOUT_OPTIONS,
  buildHeaderLayoutForSave,
  resolveCatalogHeaderLayout,
} from '@/lib/catalogHeaderLayout'
import type { McCatalogHeaderLayoutId } from '@/types/mc'

function HeaderLayoutWireframe({ layout }: { layout: McCatalogHeaderLayoutId }) {
  if (layout === 'logo-center') {
    return (
      <div className="rounded-lg border border-neutral-200/70 bg-[var(--cat-surface,#fff)] px-3 py-3">
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-1 w-6 rounded-full bg-neutral-300" />
            <span className="h-1 w-6 rounded-full bg-neutral-300" />
            <span className="hidden h-1 w-6 rounded-full bg-neutral-300 sm:block" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="h-3 w-10 rounded-sm bg-neutral-800/80" />
            <span className="h-1 w-14 rounded-full bg-neutral-400" />
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full border border-neutral-300" />
            <span className="h-3.5 w-3.5 rounded-full border border-neutral-300" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-200/70 bg-[var(--cat-surface,#fff)] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 rounded-full bg-neutral-300" />
          <span className="h-1.5 w-16 rounded-full bg-neutral-400" />
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="h-1 w-8 rounded-full bg-neutral-300" />
          <span className="h-1 w-8 rounded-full bg-neutral-300" />
        </div>
        <span className="h-5 w-5 rounded-full border border-neutral-300" />
      </div>
    </div>
  )
}

export function CuentaCabeceraPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel } = useConfigSubpageNav()
  const { showSaveSuccess } = useSaveSuccess()

  const [layout, setLayout] = useState<McCatalogHeaderLayoutId>('brand-left')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    setLayout(resolveCatalogHeaderLayout(tenant))
  }, [tenant?.id, tenant?.headerLayout])

  async function guardar() {
    if (!effectiveTenantId || !tenant) return
    setBusy(true)
    setErr(null)

    const headerLayout = buildHeaderLayoutForSave(layout)

    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        headerLayout: headerLayout ?? deleteField(),
      })
      showSaveSuccess({ message: 'La cabecera de tu tienda se actualizó.' })
    } catch {
      setErr('No se pudo guardar. Revisá tu conexión.')
    } finally {
      setBusy(false)
    }
  }

  if (!tenant) {
    return (
      <ConfiguracionesSubpageLayout title="Cabecera" backTo={returnTo} backLabel={returnLabel}>
        <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
      </ConfiguracionesSubpageLayout>
    )
  }

  return (
    <ConfiguracionesSubpageLayout title="Cabecera" backTo={returnTo} backLabel={returnLabel}>
      <div className="mc-card space-y-5">
        <div>
          <h2 className="ios-headline text-[var(--cat-text)]">Estilo de cabecera</h2>
          <p className="ios-footnote mt-1.5 max-w-xl leading-relaxed text-[var(--cat-muted)]">
            Elegí cómo se organiza el header de tu catálogo: logo a la izquierda o marca centrada con
            secciones a los lados.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Estilo de cabecera">
          {CATALOG_HEADER_LAYOUT_OPTIONS.map((option) => {
            const selected = layout === option.id
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={busy}
                onClick={() => setLayout(option.id)}
                className={clsx(
                  'rounded-2xl border p-3.5 text-left transition sm:p-4',
                  selected
                    ? 'border-[var(--cat-text)] bg-[color-mix(in_srgb,var(--cat-text)_4%,white)] shadow-sm'
                    : 'border-neutral-200/80 bg-white hover:border-neutral-300',
                )}
              >
                <HeaderLayoutWireframe layout={option.id} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium tracking-tight text-[var(--cat-text)]">
                      {option.title}
                    </p>
                    <p className="ios-footnote mt-1 leading-relaxed text-[var(--cat-muted)]">
                      {option.description}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      selected
                        ? 'border-[var(--cat-text)] bg-[var(--cat-text)] text-white'
                        : 'border-neutral-300 bg-white',
                    )}
                    aria-hidden
                  >
                    {selected ? (
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="mc-btn-primary px-5 py-2.5 text-[15px]"
          disabled={busy}
          onClick={() => void guardar()}
        >
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {err ? (
          <p className="text-[14px] text-red-800" aria-live="polite">
            {err}
          </p>
        ) : null}
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
