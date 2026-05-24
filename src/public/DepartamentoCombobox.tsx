import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { normalizeCiudadKey } from '@/lib/checkoutShipping'
import { COLOMBIA_DEPARTAMENTOS, formatoDepartamentoEtiqueta } from '@/lib/colombiaGeo'

type Props = {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  required?: boolean
  inputClassName: string
  placeholder?: string
}

/**
 * Buscador de departamento (lista DIVIPOLA). El valor guardado es el nombre oficial en mayúsculas.
 */
export function DepartamentoCombobox({
  value,
  onChange,
  disabled,
  required,
  inputClassName,
  placeholder = 'Buscar departamento…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const inputText = editing ? query : value ? formatoDepartamentoEtiqueta(value) : ''

  const suggestions = useMemo(() => {
    const q = query.trim()
    const nq = normalizeCiudadKey(q)
    const list = !nq
      ? [...COLOMBIA_DEPARTAMENTOS]
      : COLOMBIA_DEPARTAMENTOS.filter(
          (d) =>
            normalizeCiudadKey(d).includes(nq) ||
            normalizeCiudadKey(formatoDepartamentoEtiqueta(d)).includes(nq),
        )
    return list.slice(0, 14)
  }, [query])

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
  }, [query])

  function pick(official: string) {
    onChange(official)
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
          setQuery(value ? formatoDepartamentoEtiqueta(value) : '')
          setOpen(true)
        }}
        onChange={(e) => {
          const next = e.target.value
          setQuery(next)
          setOpen(true)
          if (!next.trim()) onChange('')
        }}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const pickDept = suggestions[highlight]
            if (pickDept) pick(pickDept)
          } else if (e.key === 'Escape') {
            setOpen(false)
            setEditing(false)
          }
        }}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-md border border-neutral-200/60 bg-[var(--cat-bg)] py-1 shadow-lg"
        >
          {suggestions.map((d, i) => (
            <li key={d}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={clsx(
                  'flex w-full px-3 py-2 text-left text-[16px] text-[var(--cat-text)] transition',
                  i === highlight ? 'bg-neutral-100' : 'hover:bg-neutral-50',
                )}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(d)}
              >
                {formatoDepartamentoEtiqueta(d)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
