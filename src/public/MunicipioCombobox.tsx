import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { normalizeCiudadKey } from '@/lib/checkoutShipping'
import { municipiosDelDepartamento } from '@/lib/colombiaGeo'

type Props = {
  departamento: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  required?: boolean
  inputClassName: string
  hintEmptyDept?: string
  placeholder?: string
}

/**
 * Buscador de municipio dentro del departamento elegido (lista DIVIPOLA).
 */
export function MunicipioCombobox({
  departamento,
  value,
  onChange,
  disabled,
  required,
  inputClassName,
  hintEmptyDept = 'Primero elegí un departamento.',
  placeholder = 'Buscar ciudad o municipio…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const todos = useMemo(() => municipiosDelDepartamento(departamento), [departamento])

  const q = value.trim()
  const suggestions = useMemo(() => {
    if (!departamento.trim()) return []
    const nq = normalizeCiudadKey(q)
    const list = !nq
      ? todos
      : todos.filter(
          (m) =>
            normalizeCiudadKey(m).includes(nq) || m.toLowerCase().includes(q.trim().toLowerCase()),
        )
    return list.slice(0, 14)
  }, [departamento, q, todos])

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [departamento, q])

  const emptyDept = !departamento.trim()

  return (
    <div ref={wrapRef} className="relative">
      <input
        className={inputClassName}
        value={value}
        disabled={disabled || emptyDept}
        required={required && !emptyDept}
        placeholder={emptyDept ? hintEmptyDept : placeholder}
        autoComplete="off"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
        onFocus={() => {
          if (!emptyDept) setOpen(true)
        }}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
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
            const pick = suggestions[highlight]
            if (pick) {
              onChange(pick)
              setOpen(false)
            }
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && !emptyDept && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-40 mt-1 max-h-52 w-full overflow-auto rounded-md border mc-pc-border bg-[var(--cat-surface)] py-1 shadow-lg"
        >
          {suggestions.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={clsx(
                  'flex w-full px-3 py-2 text-left text-[13px] mc-pc-text transition',
                  i === highlight
                    ? 'bg-[color-mix(in_srgb,var(--cat-accent)_12%,transparent)]'
                    : 'hover:bg-[color-mix(in_srgb,var(--cat-bg)_40%,var(--cat-surface)_60%)]',
                )}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  onChange(m)
                  setOpen(false)
                }}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
