import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { normalizeCiudadKey } from '@/lib/checkoutShipping'
import { MC } from '@/lib/mcCollections'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import type { McEnvioCiudadPrecio, McPlatformSettings } from '@/types/mc'
import { IconChevronLeft } from '@/icons/McIcons'

function normalizeHeader(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseCopCell(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v))
  const s = String(v ?? '').trim()
  if (!s) return null
  const d = s.replace(/\D/g, '')
  if (!d) return null
  const n = Math.round(Number(d))
  return Number.isFinite(n) ? Math.max(0, Math.min(999_999_999, n)) : null
}

function detectColumns(headers: unknown[]): { ciudadIdx: number; copIdx: number } | null {
  const ciudadNames = new Set(['ciudad', 'municipio', 'ciudad_destino', 'destino'])
  const copNames = new Set(['cop', 'valor', 'tarifa', 'precio', 'envio', 'costo', 'costo_envio'])
  let ciudadIdx = -1
  let copIdx = -1
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i])
    if (ciudadNames.has(h)) ciudadIdx = i
    if (copNames.has(h)) copIdx = i
  }
  if (ciudadIdx < 0 || copIdx < 0) return null
  return { ciudadIdx, copIdx }
}

async function parseTariffsSpreadsheet(file: File): Promise<{ ok: McEnvioCiudadPrecio[]; err: string | null }> {
  try {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return { ok: [], err: 'El archivo no tiene hojas.' }
    const sheet = wb.Sheets[sheetName]
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][]
    if (!matrix.length) return { ok: [], err: 'La hoja está vacía.' }

    let ciudadIdx = -1
    let copIdx = -1
    let dataStart = 0
    for (let r = 0; r < Math.min(matrix.length, 30); r++) {
      const row = matrix[r] ?? []
      const idx = detectColumns(row)
      if (idx) {
        ciudadIdx = idx.ciudadIdx
        copIdx = idx.copIdx
        dataStart = r + 1
        break
      }
    }
    if (ciudadIdx < 0 || copIdx < 0) {
      return {
        ok: [],
        err: 'No encontramos columnas «ciudad» (o «municipio») y «cop» (o «valor» / «tarifa»). Revisá la primera fila.',
      }
    }

    const seen = new Set<string>()
    const out: McEnvioCiudadPrecio[] = []
    for (let r = dataStart; r < matrix.length; r++) {
      const row = matrix[r] ?? []
      const ciudad = String(row[ciudadIdx] ?? '').trim()
      const cop = parseCopCell(row[copIdx])
      if (!ciudad || cop == null) continue
      const key = normalizeCiudadKey(ciudad)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ ciudad: ciudad.slice(0, 120), cop })
      if (out.length >= 2000) break
    }

    if (out.length === 0) return { ok: [], err: 'No se leyeron filas válidas (ciudad + valor).' }
    return { ok: out, err: null }
  } catch {
    return { ok: [], err: 'No se pudo leer el archivo. Probá exportar como .xlsx desde Excel o Google Sheets.' }
  }
}

export function SuperAdminEnviosMicatalogoPage() {
  const { profile } = useMcAuth()
  const [settings, setSettings] = useState<McPlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [defaultInput, setDefaultInput] = useState('')
  const [preview, setPreview] = useState<McEnvioCiudadPrecio[] | null>(null)
  const [parseErr, setParseErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    try {
      const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const s = snap.exists() ? (snap.data() as McPlatformSettings) : {}
      setSettings(s)
      const d = s.envioMicatalogoEstimadoCop
      setDefaultInput(
        d != null && typeof d === 'number' && Number.isFinite(d) && d > 0 ? formatIntegerEsCo(Math.round(d)) : '',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const listaActual = settings?.envioMicatalogoPorCiudad ?? []

  const resumenPlataforma = useMemo(() => {
    const n = listaActual.length
    const d =
      typeof settings?.envioMicatalogoEstimadoCop === 'number'
        ? Math.max(0, Math.round(settings.envioMicatalogoEstimadoCop))
        : 0
    const parts: string[] = []
    if (d > 0) parts.push(`Por defecto ${formatCop(d)}`)
    if (n > 0) parts.push(`${n} ciudad(es)`)
    const ts = settings?.envioMicatalogoUpdatedAt
    if (typeof ts === 'number' && ts > 0) {
      parts.push(`Última carga ${new Date(ts).toLocaleString('es-CO')}`)
    }
    return parts.length ? parts.join(' · ') : 'Sin tarifas cargadas.'
  }, [listaActual.length, settings?.envioMicatalogoEstimadoCop, settings?.envioMicatalogoUpdatedAt])

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  function parseCopInput(raw: string): number {
    const d = raw.replace(/\D/g, '')
    if (!d) return 0
    return Math.max(0, Math.min(999_999_999, Math.round(Number(d))))
  }

  async function onPickFile(file: File | null) {
    setPreview(null)
    setParseErr(null)
    setMsg(null)
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setParseErr('Usá un archivo .xlsx o .xls exportado desde Excel / Sheets.')
      return
    }
    const { ok, err } = await parseTariffsSpreadsheet(file)
    if (err) {
      setParseErr(err)
      return
    }
    setPreview(ok)
    setMsg(`Listo para guardar: ${ok.length} ciudad(es). Revisá la vista previa y tocá «Guardar en la plataforma».`)
  }

  async function guardarPreview() {
    if (!firebaseConfigured || !preview?.length) return
    setBusy(true)
    setMsg(null)
    try {
      const defaultCop = parseCopInput(defaultInput)
      await updateDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc), {
        envioMicatalogoPorCiudad: preview,
        envioMicatalogoEstimadoCop: defaultCop,
        envioMicatalogoUpdatedAt: Date.now(),
      })
      setPreview(null)
      setMsg('Tarifas plataforma actualizadas.')
      await load()
    } catch {
      setMsg('No se pudo guardar. Revisá permisos de súper admin en Firestore.')
    } finally {
      setBusy(false)
    }
  }

  async function guardarSoloDefault() {
    if (!firebaseConfigured) return
    setBusy(true)
    setMsg(null)
    try {
      const defaultCop = parseCopInput(defaultInput)
      await updateDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc), {
        envioMicatalogoEstimadoCop: defaultCop,
        envioMicatalogoUpdatedAt: Date.now(),
      })
      setMsg('Costo por defecto actualizado.')
      await load()
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function limpiarTarifasCiudad() {
    if (!firebaseConfigured || !window.confirm('¿Quitar todas las ciudades importadas y dejar solo el costo por defecto?'))
      return
    setBusy(true)
    setMsg(null)
    try {
      await updateDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc), {
        envioMicatalogoPorCiudad: [],
        envioMicatalogoUpdatedAt: Date.now(),
      })
      setPreview(null)
      setMsg('Tabla por ciudad vaciada.')
      await load()
    } catch {
      setMsg('No se pudo actualizar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell space-y-8 pb-24">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        Volver al panel súper admin
      </Link>

      <div>
        <h1 className="ios-large-title">Tarifas de envío Mi Catálogo</h1>
        <p className="ios-subhead mt-2 max-w-2xl leading-relaxed text-[var(--cat-muted)]">
          Subí una tabla Excel con columnas <strong className="font-medium text-[var(--cat-text)]">ciudad</strong> y{' '}
          <strong className="font-medium text-[var(--cat-text)]">cop</strong> (también aceptamos «municipio», «valor»,
          «tarifa»…). Las tiendas pueden activar en{' '}
          <strong className="font-medium text-[var(--cat-text)]">Cuenta · Envío</strong> usar estas tarifas en lugar de
          configurar ciudad por ciudad.
        </p>
      </div>

      {loading ? (
        <p className="ios-subhead text-mc-600">Cargando…</p>
      ) : (
        <div className="mc-card space-y-6">
          <div className="rounded-lg border border-mc-200/60 bg-mc-50/35 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-600">Estado actual</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--cat-text)]">{resumenPlataforma}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Envío por defecto plataforma (COP)
              </label>
              <input
                className="mc-input mt-1 py-2.5 text-[15px]"
                inputMode="numeric"
                placeholder="Ej. 15000"
                value={defaultInput}
                disabled={busy}
                onChange={(e) => setDefaultInput(e.target.value)}
              />
              <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
                Si la ciudad del cliente no está en la tabla importada, se usa este monto al cobrar envío con tarifas Mi
                Catálogo.
              </p>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <button type="button" className="mc-btn-secondary py-2.5 text-[14px]" disabled={busy} onClick={() => void guardarSoloDefault()}>
                Guardar solo costo por defecto
              </button>
            </div>
          </div>

          <div className="border-t border-neutral-200/50 pt-5">
            <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Importar Excel (.xlsx)</p>
            <p className="ios-subhead mt-1 text-[var(--cat-muted)]">
              Primera fila con encabezados. Filas sin ciudad o sin valor se omiten. Ciudades duplicadas se unifican.
            </p>
            <label className="mt-3 inline-flex cursor-pointer flex-col gap-2">
              <span className="mc-btn-secondary w-fit px-4 py-2.5 text-[14px]">Elegir archivo…</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  e.target.value = ''
                  void onPickFile(f)
                }}
              />
            </label>
            {parseErr && <p className="mt-2 text-[14px] text-red-800">{parseErr}</p>}
          </div>

          {preview && preview.length > 0 && (
            <div className="space-y-3 rounded-lg border border-mc-200/55 bg-neutral-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-mc-900">Vista previa ({preview.length})</p>
                <button type="button" className="mc-btn-primary px-4 py-2 text-[14px]" disabled={busy} onClick={() => void guardarPreview()}>
                  Guardar en la plataforma
                </button>
              </div>
              <div className="max-h-52 overflow-auto rounded border border-neutral-200/60 bg-[var(--cat-surface)]">
                <table className="w-full text-left text-[12px] text-mc-800">
                  <thead className="sticky top-0 bg-neutral-100/90">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Ciudad</th>
                      <th className="px-3 py-2 font-semibold">COP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 80).map((x, i) => (
                      <tr key={`${i}-${normalizeCiudadKey(x.ciudad)}`} className="border-t border-neutral-200/40">
                        <td className="px-3 py-1.5">{x.ciudad}</td>
                        <td className="px-3 py-1.5 tabular-nums">{formatCop(x.cop)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 80 && (
                  <p className="border-t border-neutral-200/40 px-3 py-2 text-[11px] text-mc-600">
                    … y {preview.length - 80} más (se guardan todas).
                  </p>
                )}
              </div>
            </div>
          )}

          {listaActual.length > 0 && (
            <button type="button" className="text-[13px] font-medium text-red-800 underline underline-offset-2" disabled={busy} onClick={() => void limpiarTarifasCiudad()}>
              Vaciar tabla de ciudades en la plataforma
            </button>
          )}

          {msg && <p className="text-[15px] leading-relaxed text-[var(--cat-text)]">{msg}</p>}
        </div>
      )}
    </div>
  )
}
