import { useCallback, useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { Link, Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { IconChevronLeft, IconChevronRight } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC, mcTutorialsCollection } from '@/lib/mcCollections'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { fetchAllTutorialSections } from '@/lib/tutorials/fetchTutorials'
import { isTutorialVideoUrlValid } from '@/lib/tutorials/tutorialVideoEmbed'
import type { McTutorialSectionWithTutorials, McTutorialWithId } from '@/lib/tutorials/types'

type TutorialDraft = {
  title: string
  description: string
  videoUrl: string
  visible: boolean
  order: string
}

const emptyTutorialDraft = (): TutorialDraft => ({
  title: '',
  description: '',
  videoUrl: '',
  visible: true,
  order: '0',
})

function VisibleCheckbox({
  checked,
  onChange,
  disabled,
  label = 'Visible',
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] text-[var(--cat-text)]">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300 text-mc-900 focus:ring-mc-500"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

function TutorialAdminRow({
  sectionId,
  tutorial,
  busy,
  onChanged,
  onError,
}: {
  sectionId: string
  tutorial: McTutorialWithId
  busy: boolean
  onChanged: () => Promise<void>
  onError: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<TutorialDraft>({
    title: tutorial.title,
    description: tutorial.description,
    videoUrl: tutorial.videoUrl,
    visible: tutorial.visible,
    order: String(tutorial.order ?? 0),
  })
  const [saving, setSaving] = useState(false)

  async function guardar() {
    const title = draft.title.trim()
    const videoUrl = draft.videoUrl.trim()
    const order = Number(draft.order.replace(/\D/g, '') || '0')
    if (!title) {
      onError('El tutorial necesita un título.')
      return
    }
    if (!isTutorialVideoUrlValid(videoUrl)) {
      onError('URL de video inválida. Usá un enlace de YouTube o Vimeo.')
      return
    }
    setSaving(true)
    onError('')
    try {
      await updateDoc(doc(getDb(), mcTutorialsCollection(sectionId), tutorial.id), {
        title,
        description: draft.description.trim(),
        videoUrl,
        visible: draft.visible,
        order,
        updatedAt: Date.now(),
      })
      setEditing(false)
      await onChanged()
    } catch {
      onError('No se pudo guardar el tutorial.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisible() {
    setSaving(true)
    onError('')
    try {
      await updateDoc(doc(getDb(), mcTutorialsCollection(sectionId), tutorial.id), {
        visible: !tutorial.visible,
        updatedAt: Date.now(),
      })
      await onChanged()
    } catch {
      onError('No se pudo actualizar la visibilidad.')
    } finally {
      setSaving(false)
    }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el tutorial «${tutorial.title}»?`)) return
    setSaving(true)
    onError('')
    try {
      await deleteDoc(doc(getDb(), mcTutorialsCollection(sectionId), tutorial.id))
      await onChanged()
    } catch {
      onError('No se pudo eliminar el tutorial.')
    } finally {
      setSaving(false)
    }
  }

  const rowBusy = busy || saving

  if (editing) {
    return (
      <div className="space-y-3 rounded-xl border border-mc-200/70 bg-mc-50/40 p-4">
        <input
          className="mc-input"
          placeholder="Título del tutorial"
          value={draft.title}
          disabled={rowBusy}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
        <textarea
          className="mc-input min-h-[72px] resize-y"
          placeholder="Descripción (opcional)"
          value={draft.description}
          disabled={rowBusy}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
        />
        <input
          className="mc-input"
          placeholder="URL del video (YouTube o Vimeo)"
          value={draft.videoUrl}
          disabled={rowBusy}
          onChange={(e) => setDraft((d) => ({ ...d, videoUrl: e.target.value }))}
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="ios-footnote font-medium text-[var(--cat-muted)]">
            Orden
            <input
              className="mc-input mt-1 w-20"
              inputMode="numeric"
              value={draft.order}
              disabled={rowBusy}
              onChange={(e) => setDraft((d) => ({ ...d, order: e.target.value }))}
            />
          </label>
          <VisibleCheckbox
            checked={draft.visible}
            disabled={rowBusy}
            onChange={(visible) => setDraft((d) => ({ ...d, visible }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="mc-btn-primary px-4 py-2 text-[14px]" disabled={rowBusy} onClick={() => void guardar()}>
            Guardar
          </button>
          <button
            type="button"
            className="mc-btn-secondary px-4 py-2 text-[14px]"
            disabled={rowBusy}
            onClick={() => {
              setEditing(false)
              setDraft({
                title: tutorial.title,
                description: tutorial.description,
                videoUrl: tutorial.videoUrl,
                visible: tutorial.visible,
                order: String(tutorial.order ?? 0),
              })
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200/70 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="ios-headline font-medium">{tutorial.title}</p>
          {!tutorial.visible ? (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-600">
              Oculto
            </span>
          ) : null}
        </div>
        {tutorial.description ? (
          <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">{tutorial.description}</p>
        ) : null}
        <p className="ios-footnote truncate text-[var(--cat-muted)] opacity-70">{tutorial.videoUrl}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        <VisibleCheckbox checked={tutorial.visible} disabled={rowBusy} onChange={() => void toggleVisible()} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="mc-btn-secondary px-3 py-1.5 text-[13px]"
            disabled={rowBusy}
            onClick={() => setEditing(true)}
          >
            Editar
          </button>
          <button
            type="button"
            className="text-[13px] font-medium text-red-800 underline decoration-red-200 underline-offset-2"
            disabled={rowBusy}
            onClick={() => void eliminar()}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionAdminCard({
  section,
  busy,
  onChanged,
  onError,
}: {
  section: McTutorialSectionWithTutorials
  busy: boolean
  onChanged: () => Promise<void>
  onError: (msg: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(section.title)
  const [newTutorial, setNewTutorial] = useState<TutorialDraft>(emptyTutorialDraft())
  const [saving, setSaving] = useState(false)

  async function guardarTitulo() {
    const title = titleDraft.trim()
    if (!title) {
      onError('La sección necesita un título.')
      return
    }
    setSaving(true)
    onError('')
    try {
      await updateDoc(doc(getDb(), MC.tutorialSections, section.id), {
        title,
        updatedAt: Date.now(),
      })
      setEditingTitle(false)
      await onChanged()
    } catch {
      onError('No se pudo guardar la sección.')
    } finally {
      setSaving(false)
    }
  }

  async function eliminarSeccion() {
    if (!confirm(`¿Eliminar la sección «${section.title}» y todos sus tutoriales?`)) return
    setSaving(true)
    onError('')
    try {
      const batch = writeBatch(getDb())
      for (const tutorial of section.tutorials) {
        batch.delete(doc(getDb(), mcTutorialsCollection(section.id), tutorial.id))
      }
      batch.delete(doc(getDb(), MC.tutorialSections, section.id))
      await batch.commit()
      await onChanged()
    } catch {
      onError('No se pudo eliminar la sección.')
    } finally {
      setSaving(false)
    }
  }

  async function crearTutorial() {
    const title = newTutorial.title.trim()
    const videoUrl = newTutorial.videoUrl.trim()
    const order = Number(newTutorial.order.replace(/\D/g, '') || '0')
    if (!title) {
      onError('El tutorial necesita un título.')
      return
    }
    if (!isTutorialVideoUrlValid(videoUrl)) {
      onError('URL de video inválida. Usá un enlace de YouTube o Vimeo.')
      return
    }
    setSaving(true)
    onError('')
    const now = Date.now()
    try {
      await addDoc(collection(getDb(), mcTutorialsCollection(section.id)), {
        title,
        description: newTutorial.description.trim(),
        videoUrl,
        visible: newTutorial.visible,
        order,
        createdAt: now,
        updatedAt: now,
      })
      setNewTutorial(emptyTutorialDraft())
      await onChanged()
    } catch {
      onError('No se pudo crear el tutorial.')
    } finally {
      setSaving(false)
    }
  }

  const cardBusy = busy || saving

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-[var(--cat-surface)] shadow-sm">
      <div className="flex items-start gap-3 border-b border-neutral-200/60 bg-gradient-to-r from-mc-50/70 to-white px-4 py-4 sm:px-5">
        <button
          type="button"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-mc-700 transition hover:bg-mc-100/80"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <IconChevronRight size={18} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="mc-input flex-1"
                value={titleDraft}
                disabled={cardBusy}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="button" className="mc-btn-primary px-3 py-1.5 text-[13px]" disabled={cardBusy} onClick={() => void guardarTitulo()}>
                  Guardar
                </button>
                <button
                  type="button"
                  className="mc-btn-secondary px-3 py-1.5 text-[13px]"
                  disabled={cardBusy}
                  onClick={() => {
                    setEditingTitle(false)
                    setTitleDraft(section.title)
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="ios-headline text-[17px] font-semibold">{section.title}</h2>
                <p className="ios-footnote mt-0.5 text-[var(--cat-muted)]">
                  {section.tutorials.length} tutorial{section.tutorials.length === 1 ? '' : 'es'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="mc-btn-secondary px-3 py-1.5 text-[13px]"
                  disabled={cardBusy}
                  onClick={() => setEditingTitle(true)}
                >
                  Renombrar
                </button>
                <button
                  type="button"
                  className="text-[13px] font-medium text-red-800 underline decoration-red-200 underline-offset-2"
                  disabled={cardBusy}
                  onClick={() => void eliminarSeccion()}
                >
                  Eliminar sección
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {expanded ? (
        <div className="space-y-4 p-4 sm:p-5">
          {section.tutorials.length === 0 ? (
            <p className="ios-footnote rounded-xl border border-dashed border-neutral-300/70 bg-neutral-50/50 px-4 py-6 text-center text-[var(--cat-muted)]">
              Esta sección aún no tiene tutoriales.
            </p>
          ) : (
            <div className="space-y-3">
              {section.tutorials.map((tutorial) => (
                <TutorialAdminRow
                  key={tutorial.id}
                  sectionId={section.id}
                  tutorial={tutorial}
                  busy={cardBusy}
                  onChanged={onChanged}
                  onError={onError}
                />
              ))}
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-mc-200/60 bg-mc-50/30 p-4">
            <p className="ios-headline text-[15px]">Agregar tutorial</p>
            <input
              className="mc-input"
              placeholder="Título"
              value={newTutorial.title}
              disabled={cardBusy}
              onChange={(e) => setNewTutorial((d) => ({ ...d, title: e.target.value }))}
            />
            <textarea
              className="mc-input min-h-[72px] resize-y"
              placeholder="Descripción (opcional)"
              value={newTutorial.description}
              disabled={cardBusy}
              onChange={(e) => setNewTutorial((d) => ({ ...d, description: e.target.value }))}
            />
            <input
              className="mc-input"
              placeholder="URL del video (YouTube o Vimeo)"
              value={newTutorial.videoUrl}
              disabled={cardBusy}
              onChange={(e) => setNewTutorial((d) => ({ ...d, videoUrl: e.target.value }))}
            />
            <div className="flex flex-wrap items-center gap-4">
              <label className="ios-footnote font-medium text-[var(--cat-muted)]">
                Orden
                <input
                  className="mc-input mt-1 w-20"
                  inputMode="numeric"
                  value={newTutorial.order}
                  disabled={cardBusy}
                  onChange={(e) => setNewTutorial((d) => ({ ...d, order: e.target.value }))}
                />
              </label>
              <VisibleCheckbox
                checked={newTutorial.visible}
                disabled={cardBusy}
                onChange={(visible) => setNewTutorial((d) => ({ ...d, visible }))}
              />
            </div>
            <button type="button" className="mc-btn-primary w-full sm:w-auto" disabled={cardBusy} onClick={() => void crearTutorial()}>
              Agregar tutorial
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SuperAdminTutorialesPage() {
  const { profile } = useMcAuth()
  const [sections, setSections] = useState<McTutorialSectionWithTutorials[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionOrder, setNewSectionOrder] = useState('0')

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    try {
      const data = await fetchAllTutorialSections(getDb())
      setSections(data)
    } catch {
      setErr('No se pudieron cargar los tutoriales.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void load()
  }, [profile, load])

  async function crearSeccion() {
    const title = newSectionTitle.trim()
    const order = Number(newSectionOrder.replace(/\D/g, '') || '0')
    if (!title) {
      setErr('Ingresá un título para la sección.')
      return
    }
    setBusy(true)
    setErr(null)
    setMsg(null)
    const now = Date.now()
    try {
      await addDoc(collection(getDb(), MC.tutorialSections), {
        title,
        order,
        createdAt: now,
        updatedAt: now,
      })
      setNewSectionTitle('')
      setNewSectionOrder(String(sections.length))
      setMsg('Sección creada.')
      await load()
    } catch {
      setErr('No se pudo crear la sección.')
    } finally {
      setBusy(false)
    }
  }

  async function onChanged() {
    await load()
  }

  function handleRowError(message: string) {
    if (message) setErr(message)
  }

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  const visibleCount = sections.reduce((acc, s) => acc + s.tutorials.filter((t) => t.visible).length, 0)
  const totalCount = sections.reduce((acc, s) => acc + s.tutorials.length, 0)

  return (
    <div className="mc-shell space-y-8 pb-32">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4"
      >
        <IconChevronLeft size={18} />
        Súper admin
      </Link>

      <div>
        <h1 className="ios-large-title">Administrar tutoriales</h1>
        <p className="ios-subhead mt-1 max-w-xl text-[var(--cat-muted)]">
          Creá secciones y videos tutoriales que verán los comercios en Configuraciones → Tutoriales.
          {totalCount > 0 ? ` ${visibleCount} de ${totalCount} visibles.` : ''}
        </p>
      </div>

      <div className="mc-card mx-auto max-w-lg space-y-4">
        <p className="ios-headline">Nueva sección</p>
        <input
          className="mc-input"
          placeholder="Ej. Primeros pasos"
          value={newSectionTitle}
          disabled={busy}
          onChange={(e) => setNewSectionTitle(e.target.value)}
        />
        <label className="ios-footnote block font-medium text-[var(--cat-muted)]">
          Orden
          <input
            className="mc-input mt-1 w-24"
            inputMode="numeric"
            value={newSectionOrder}
            disabled={busy}
            onChange={(e) => setNewSectionOrder(e.target.value)}
          />
        </label>
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void crearSeccion()}>
          Crear sección
        </button>
      </div>

      {err ? <p className="border border-red-200/60 bg-red-50/40 px-3 py-2 text-[14px] text-red-900">{err}</p> : null}
      {msg ? <p className="border border-neutral-200/60 bg-neutral-50/50 px-3 py-2 text-[14px]">{msg}</p> : null}

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900" aria-hidden />
          <p className="ios-subhead text-mc-600">Cargando…</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="mc-card px-6 py-10 text-center">
          <p className="ios-subhead text-[var(--cat-muted)]">
            Todavía no hay secciones. Creá la primera arriba para empezar a agregar tutoriales.
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {sections.map((section) => (
            <SectionAdminCard
              key={section.id}
              section={section}
              busy={busy}
              onChanged={onChanged}
              onError={handleRowError}
            />
          ))}
        </div>
      )}
    </div>
  )
}
