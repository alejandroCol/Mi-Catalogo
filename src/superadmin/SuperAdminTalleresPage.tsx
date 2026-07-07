import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { Link, Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { IconChevronLeft } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { exportTallerRegistrationsExcel } from '@/lib/mcTallerExport'
import { callMcTallerSendReminders } from '@/lib/mcTallerApi'
import {
  formatMcTallerDate,
  mcTallerDateToInputValue,
  mcTallerEventPath,
  mcTallerInputValueToDateMs,
  mcTallerPitchPath,
  mcTallerRegisterPath,
  readTallerMeetLinkFromData,
  normalizeTallerMeetLink,
  isTallerMeetLinkLikelyInternal,
  isValidTallerMeetHost,
} from '@/lib/mcTallerFormat'
import { MC, mcTallerRegistrationsCollection } from '@/lib/mcCollections'
import { slugifyStoreName } from '@/lib/publicSlug'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import type { McTaller, McTallerRegistration } from '@/types/mc'

type TallerRow = McTaller & { id: string; registrationCount?: number }

type FormDraft = {
  slug: string
  title: string
  description: string
  dateInput: string
  zoomLink: string
  requirements: string[]
  newRequirement: string
  active: boolean
}

function emptyDraft(): FormDraft {
  return {
    slug: '',
    title: '',
    description: '',
    dateInput: '',
    zoomLink: '',
    requirements: [],
    newRequirement: '',
    active: true,
  }
}

function draftFromTaller(t: TallerRow): FormDraft {
  return {
    slug: t.slug,
    title: t.title,
    description: t.description,
    dateInput: mcTallerDateToInputValue(t.dateMs),
    zoomLink: t.zoomLink ?? t.meetLink ?? '',
    requirements: [...(t.requirements ?? [])],
    newRequirement: '',
    active: t.active,
  }
}

function firebaseErrMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && e !== null && 'code' in e) {
    const code = String((e as { code: string }).code)
    if (code === 'permission-denied') {
      return 'Permiso denegado en Firestore. Desplegá firestore.rules (mc_talleres) en Firebase.'
    }
  }
  if (e && typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: string }).message)
  }
  return fallback
}

export function SuperAdminTalleresPage() {
  const { profile } = useMcAuth()
  const [rows, setRows] = useState<TallerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [draft, setDraft] = useState<FormDraft>(emptyDraft)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [registrations, setRegistrations] = useState<(McTallerRegistration & { id: string })[]>([])
  const [regsLoading, setRegsLoading] = useState(false)
  const [reminderBusySlug, setReminderBusySlug] = useState<string | null>(null)
  const [downloadBusySlug, setDownloadBusySlug] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    try {
      const snap = await getDocs(collection(getDb(), MC.talleres))
      const list: TallerRow[] = snap.docs.map((d) => {
        const data = d.data() as McTaller
        return { id: d.id, ...data, slug: d.id }
      })
      list.sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0))
      setRows(list)
    } catch {
      setErr('No se pudieron cargar los talleres.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void load()
  }, [profile, load])

  async function loadRegistrations(slug: string) {
    setRegsLoading(true)
    try {
      const snap = await getDocs(collection(getDb(), mcTallerRegistrationsCollection(slug)))
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as McTallerRegistration) }))
      list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      setRegistrations(list)
    } catch {
      setErr('No se pudieron cargar las inscripciones.')
    } finally {
      setRegsLoading(false)
    }
  }

  function startCreate() {
    setDraft(emptyDraft())
    setEditingSlug(null)
    setMode('create')
    setErr(null)
    setMsg(null)
  }

  function startEdit(row: TallerRow) {
    setDraft(draftFromTaller(row))
    setEditingSlug(row.slug)
    setMode('edit')
    setErr(null)
    setMsg(null)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function cancelForm() {
    setMode('list')
    setEditingSlug(null)
    setDraft(emptyDraft())
  }

  function addRequirement() {
    const text = draft.newRequirement.trim()
    if (!text) return
    setDraft((d) => ({
      ...d,
      requirements: [...d.requirements, text],
      newRequirement: '',
    }))
  }

  function removeRequirement(index: number) {
    setDraft((d) => ({
      ...d,
      requirements: d.requirements.filter((_, i) => i !== index),
    }))
  }

  async function guardar() {
    const title = draft.title.trim()
    const description = draft.description.trim()
    const zoomLinkRaw = draft.zoomLink.trim()
    const zoomLink = normalizeTallerMeetLink(zoomLinkRaw)
    const dateMs = mcTallerInputValueToDateMs(draft.dateInput)
    const slugRaw = mode === 'create' ? draft.slug.trim() || slugifyStoreName(title) : editingSlug ?? ''
    const slug = slugifyStoreName(slugRaw)

    if (!title) {
      setErr('El título es obligatorio.')
      return
    }
    if (!dateMs) {
      setErr('Elegí fecha y hora del taller.')
      return
    }
    if (slug.length < 3) {
      setErr('El enlace del taller debe tener al menos 3 caracteres.')
      return
    }
    if (!zoomLink) {
      setErr('Ingresá un enlace válido de Google Meet (https://meet.google.com/…).')
      return
    }
    if (isTallerMeetLinkLikelyInternal(zoomLink)) {
      setErr('El enlace debe ser de Google Meet, no de mi catálogo.')
      return
    }
    if (!isValidTallerMeetHost(zoomLink)) {
      setErr('Usá un enlace de Google Meet (meet.google.com) o Zoom.')
      return
    }

    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const now = Date.now()
      const payload: McTaller = {
        slug,
        title,
        description,
        dateMs,
        requirements: draft.requirements.map((r) => r.trim()).filter(Boolean),
        zoomLink,
        active: draft.active,
        createdAt: now,
        updatedAt: now,
      }

      if (mode === 'create') {
        const existing = await getDocs(collection(getDb(), MC.talleres))
        if (existing.docs.some((d) => d.id === slug)) {
          setErr('Ya existe un taller con ese enlace.')
          setBusy(false)
          return
        }
        await setDoc(doc(getDb(), MC.talleres, slug), { ...payload, meetLink: zoomLink })
        setMsg('Taller creado.')
      } else if (editingSlug) {
        const prev = rows.find((r) => r.slug === editingSlug)
        await updateDoc(doc(getDb(), MC.talleres, editingSlug), {
          title,
          description,
          dateMs,
          requirements: payload.requirements,
          zoomLink,
          meetLink: zoomLink,
          active: draft.active,
          updatedAt: now,
          createdAt: prev?.createdAt ?? now,
        })
        setMsg('Taller actualizado.')
      }

      cancelForm()
      await load()
    } catch (e: unknown) {
      setErr(firebaseErrMessage(e, 'No se pudo guardar el taller.'))
    } finally {
      setBusy(false)
    }
  }

  async function eliminar(slug: string, title: string) {
    if (!confirm(`¿Eliminar el taller «${title}» y todas sus inscripciones?`)) return
    setBusy(true)
    setErr(null)
    try {
      const regsSnap = await getDocs(collection(getDb(), mcTallerRegistrationsCollection(slug)))
      const batch = writeBatch(getDb())
      for (const reg of regsSnap.docs) {
        batch.delete(reg.ref)
      }
      batch.delete(doc(getDb(), MC.talleres, slug))
      await batch.commit()
      if (expandedSlug === slug) {
        setExpandedSlug(null)
        setRegistrations([])
      }
      setMsg('Taller eliminado.')
      await load()
    } catch {
      setErr('No se pudo eliminar.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(slug: string, active: boolean) {
    await updateDoc(doc(getDb(), MC.talleres, slug), { active: !active, updatedAt: Date.now() })
    await load()
  }

  async function toggleExpand(slug: string) {
    if (expandedSlug === slug) {
      setExpandedSlug(null)
      setRegistrations([])
      return
    }
    setExpandedSlug(slug)
    await loadRegistrations(slug)
  }

  async function enviarRecordatorios(slug: string, title: string) {
    if (!confirm(`¿Enviar recordatorio por correo a todos los inscriptos de «${title}»?`)) return
    setReminderBusySlug(slug)
    setErr(null)
    setMsg(null)
    try {
      const result = await callMcTallerSendReminders(slug)
      setMsg(`Recordatorios enviados: ${result.sent ?? 0}${result.failed ? ` · fallidos: ${result.failed}` : ''}.`)
      if (expandedSlug === slug) await loadRegistrations(slug)
    } catch (e: unknown) {
      const message =
        e && typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: string }).message)
          : 'No se pudieron enviar los recordatorios.'
      setErr(message)
    } finally {
      setReminderBusySlug(null)
    }
  }

  async function descargarInscritos(slug: string, title: string) {
    setDownloadBusySlug(slug)
    setErr(null)
    setMsg(null)
    try {
      const snap = await getDocs(collection(getDb(), mcTallerRegistrationsCollection(slug)))
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as McTallerRegistration) }))
      list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      if (list.length === 0) {
        setMsg('No hay inscripciones para descargar.')
        return
      }
      exportTallerRegistrationsExcel(slug, title, list)
      setMsg(`Excel descargado (${list.length} inscripción${list.length === 1 ? '' : 'es'}).`)
    } catch {
      setErr('No se pudo descargar el Excel.')
    } finally {
      setDownloadBusySlug(null)
    }
  }

  function copyPublicLink(slug: string, kind: 'evento' | 'inscripcion') {
    const path = kind === 'evento' ? mcTallerEventPath(slug) : mcTallerRegisterPath(slug)
    const url = `${window.location.origin}${path}`
    void navigator.clipboard.writeText(url)
    setMsg(`Enlace de ${kind === 'evento' ? 'taller' : 'inscripción'} copiado.`)
  }

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="mc-shell space-y-8 pb-32">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4"
      >
        <IconChevronLeft size={18} />
        Súper admin
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="ios-large-title">Talleres</h1>
          <p className="ios-subhead mt-1 max-w-xl text-[var(--cat-muted)]">
            Creá eventos formativos con inscripción pública, enlace de Google Meet y correos automáticos.
          </p>
        </div>
        {mode === 'list' ? (
          <button type="button" className="mc-btn-primary shrink-0 px-5 py-2.5" onClick={startCreate}>
            Nuevo taller
          </button>
        ) : null}
      </div>

      {err ? <p className="text-[13px] text-red-800">{err}</p> : null}
      {msg ? <p className="text-[13px] text-emerald-800">{msg}</p> : null}

      {mode !== 'list' ? (
        <div ref={formRef} className="mc-card mx-auto max-w-xl space-y-4">
          <p className="ios-headline">{mode === 'create' ? 'Nuevo taller' : 'Editar taller'}</p>

          {mode === 'create' ? (
            <label className="block">
              <span className="ios-footnote font-medium text-mc-700">Enlace público</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[13px] text-mc-500">/taller/</span>
                <input
                  className="mc-input mt-0 flex-1"
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                  placeholder={slugifyStoreName(draft.title) || 'mi-taller-marzo'}
                />
              </div>
              <p className="mt-1 text-[12px] text-mc-500">Solo letras minúsculas, números y guiones.</p>
            </label>
          ) : (
            <p className="text-[13px] text-mc-600">
              Enlace: <code className="rounded bg-mc-100 px-1">{mcTallerEventPath(editingSlug ?? '')}</code>
            </p>
          )}

          <input
            className="mc-input"
            placeholder="Título del taller"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <textarea
            className="mc-input min-h-[88px] resize-y"
            placeholder="Descripción"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          <label className="block">
            <span className="ios-footnote font-medium text-mc-700">Fecha y hora (Colombia)</span>
            <input
              className="mc-input mt-1.5"
              type="datetime-local"
              value={draft.dateInput}
              onChange={(e) => setDraft((d) => ({ ...d, dateInput: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="ios-footnote font-medium text-mc-700">Enlace de Google Meet</span>
            <input
              className="mc-input mt-1.5"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={draft.zoomLink}
              onChange={(e) => setDraft((d) => ({ ...d, zoomLink: e.target.value }))}
            />
            <p className="mt-1 text-[12px] text-mc-500">
              También podés pegar solo el código (ej. abc-defg-hij).
            </p>
          </label>

          <div className="space-y-2">
            <p className="ios-footnote font-medium text-mc-700">Requisitos (uno por uno)</p>
            <div className="flex gap-2">
              <input
                className="mc-input mt-0 flex-1"
                placeholder="Ej. Computador con cámara"
                value={draft.newRequirement}
                onChange={(e) => setDraft((d) => ({ ...d, newRequirement: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addRequirement()
                  }
                }}
              />
              <button type="button" className="mc-btn-secondary shrink-0 px-4" onClick={addRequirement}>
                Añadir
              </button>
            </div>
            {draft.requirements.length > 0 ? (
              <ul className="space-y-2 pt-1">
                {draft.requirements.map((req, i) => (
                  <li
                    key={`${req}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200/60 bg-mc-50/50 px-3 py-2 text-[14px]"
                  >
                    <span>{req}</span>
                    <button
                      type="button"
                      className="text-[12px] text-red-700 underline"
                      onClick={() => removeRequirement(i)}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300"
              checked={draft.active}
              onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
            />
            Inscripción activa (visible en el formulario público)
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="mc-btn-primary" disabled={busy} onClick={() => void guardar()}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="mc-btn-secondary" disabled={busy} onClick={cancelForm}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="ios-subhead text-[var(--cat-muted)]">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="ios-subhead text-[var(--cat-muted)]">Todavía no hay talleres. Creá el primero.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.slug} className="mc-card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[17px] font-semibold text-mc-900">{row.title}</p>
                  <p className="ios-footnote mt-1 text-[var(--cat-muted)]">{formatMcTallerDate(row.dateMs)}</p>
                  <p className="mt-1 text-[13px] text-mc-600">{row.description || 'Sin descripción'}</p>
                  <p className="mt-2 font-mono text-[12px] text-mc-500">
                    {mcTallerEventPath(row.slug)} · {mcTallerRegisterPath(row.slug)}
                  </p>
                  <p className="mt-1 text-[12px]">
                    {readTallerMeetLinkFromData(row) ? (
                      <span className="text-emerald-800">Google Meet configurado</span>
                    ) : (
                      <span className="text-amber-800">Sin enlace Meet — editá y guardá el taller</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={mcTallerPitchPath(row.slug)}
                    className="mc-btn-primary px-3 py-2 text-[13px] no-underline"
                  >
                    Iniciar taller
                  </Link>
                  <button
                    type="button"
                    className="mc-btn-secondary px-3 py-2 text-[13px]"
                    onClick={() => copyPublicLink(row.slug, 'evento')}
                  >
                    Copiar enlace taller
                  </button>
                  <button
                    type="button"
                    className="mc-btn-secondary px-3 py-2 text-[13px]"
                    onClick={() => copyPublicLink(row.slug, 'inscripcion')}
                  >
                    Copiar inscripción
                  </button>
                  <button
                    type="button"
                    className="mc-btn-secondary px-3 py-2 text-[13px]"
                    disabled={downloadBusySlug === row.slug || busy}
                    onClick={() => void descargarInscritos(row.slug, row.title)}
                  >
                    {downloadBusySlug === row.slug ? 'Descargando…' : 'Descargar inscritos'}
                  </button>
                  <button
                    type="button"
                    className="mc-btn-secondary px-3 py-2 text-[13px]"
                    onClick={() => startEdit(row)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="mc-btn-secondary px-3 py-2 text-[13px]"
                    onClick={() => void toggleActive(row.slug, row.active)}
                  >
                    {row.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    className="text-[13px] text-red-700 underline"
                    onClick={() => void eliminar(row.slug, row.title)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                <button
                  type="button"
                  className="text-[13px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-2"
                  onClick={() => void toggleExpand(row.slug)}
                >
                  {expandedSlug === row.slug ? 'Ocultar inscripciones' : 'Ver inscripciones'}
                </button>
                <button
                  type="button"
                  className="mc-btn-primary px-4 py-2 text-[13px]"
                  disabled={reminderBusySlug === row.slug || busy}
                  onClick={() => void enviarRecordatorios(row.slug, row.title)}
                >
                  {reminderBusySlug === row.slug ? 'Enviando…' : 'Enviar recordatorio'}
                </button>
              </div>

              {expandedSlug === row.slug ? (
                <div className="rounded-xl border border-neutral-200/60 bg-mc-50/40 p-4">
                  {regsLoading ? (
                    <p className="text-[13px] text-mc-600">Cargando inscripciones…</p>
                  ) : registrations.length === 0 ? (
                    <p className="text-[13px] text-mc-600">Sin inscripciones todavía.</p>
                  ) : (
                    <ul className="space-y-2">
                      {registrations.map((reg) => (
                        <li key={reg.id} className="rounded-lg bg-white px-3 py-2 text-[13px]">
                          <p className="font-medium">{reg.fullName}</p>
                          <p className="text-mc-600">
                            {reg.brandName} · {reg.email} · WA {reg.whatsapp}
                          </p>
                          {reg.lastReminderSentAt ? (
                            <p className="text-[11px] text-mc-500">
                              Recordatorio: {new Date(reg.lastReminderSentAt).toLocaleString('es-CO')}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
