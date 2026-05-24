import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'

export type McOption = { value: string; label: string }

function normalizeQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

type Props = {
  value: string
  onChange: (value: string) => void
  options: McOption[]
  disabled?: boolean
  required?: boolean
  inputClassName: string
  placeholder?: string
  emptyMessage?: string
}

/** Selector buscable con `<input>` — mismo patrón visual que DepartamentoCombobox. */
export function McOptionCombobox({
  value,
  onChange,
  options,
  disabled,
  required,
  inputClassName,
  placeholder = 'Elegí una opción…',
  emptyMessage = 'Sin resultados',
}: Props) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''
  const inputText = editing ? query : selectedLabel

  const suggestions = useMemo(() => {
    const nq = normalizeQuery(query)
    const list = !nq
      ? options
      : options.filter(
          (o) => normalizeQuery(o.label).includes(nq) || normalizeQuery(o.value).includes(nq),
        )
    return list.slice(0, 20)
  }, [query, options])

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [query, options])

  function pick(opt: McOption) {
    onChange(opt.value)
    setQuery('')
    setEditing(false)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        className={inputClassName}
        value={inputText}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
        onFocus={() => {
          setEditing(true)
          setQuery(selectedLabel)
          setOpen(true)
        }}
        onChange={(e) => {
          const next = e.target.value
          setQuery(next)
          setOpen(true)
          if (!next.trim()) onChange('')
        }}
        onKeyDown={(e) => {
          if (!open) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, Math.max(0, suggestions.length - 1)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const pickOpt = suggestions[highlight]
            if (pickOpt) pick(pickOpt)
          } else if (e.key === 'Escape') {
            setOpen(false)
            setEditing(false)
          }
        }}
      />
      {open && (
        <ul
          role="listbox"
          className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-md border border-neutral-200/60 bg-[var(--cat-bg)] py-1 shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-[16px] text-[var(--cat-muted)]">{emptyMessage}</li>
          ) : (
            suggestions.map((o, i) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  className={clsx(
                    'flex w-full px-3 py-2 text-left text-[16px] text-[var(--cat-text)] transition',
                    i === highlight ? 'bg-neutral-100' : 'hover:bg-neutral-50',
                  )}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => pick(o)}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
