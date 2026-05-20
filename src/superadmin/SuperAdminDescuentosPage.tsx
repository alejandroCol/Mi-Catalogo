import { useCallback, useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { Link, Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { formatCop } from '@/lib/formatCop'
import { MC } from '@/lib/mcCollections'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import type { McBillingDiscountCode } from '@/types/mc'
import { IconChevronLeft } from '@/icons/McIcons'

function normalizeCode(raw: string): string {
  return raw.normalize('NFC').trim().toUpperCase().replace(/\s+/g, '')
}

export function SuperAdminDescuentosPage() {
  const { profile } = useMcAuth()
  const [rows, setRows] = useState<(McBillingDiscountCode & { id: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [priceCop, setPriceCop] = useState('')
  const [freeDays, setFreeDays] = useState('30')
  const [period, setPeriod] = useState<'both' | 'monthly' | 'yearly'>('both')
  const [maxUses, setMaxUses] = useState('')

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    try {
      const snap = await getDocs(collection(getDb(), MC.billingDiscountCodes))
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as McBillingDiscountCode) }))
      list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      setRows(list)
    } catch {
      setErr('No se pudieron cargar los códigos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void load()
  }, [profile, load])

  async function crear() {
    const norm = normalizeCode(code)
    const price = Number(priceCop.replace(/\D/g, ''))
    const days = Number(freeDays.replace(/\D/g, ''))
    const max = maxUses.trim() ? Number(maxUses.replace(/\D/g, '')) : undefined
    if (!norm) {
      setErr('Ingresá un código.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setErr('Precio final inválido (0 = gratis por X días).')
      return
    }
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await addDoc(collection(getDb(), MC.billingDiscountCodes), {
        code: norm,
        codeNormalized: norm,
        active: true,
        priceCop: price,
        ...(price === 0 && days > 0 ? { freeTrialDays: days } : {}),
        ...(period !== 'both' ? { billingPeriod: period } : {}),
        ...(max && max > 0 ? { maxRedemptions: max, redemptionCount: 0 } : {}),
        updatedAt: Date.now(),
      })
      setCode('')
      setPriceCop('')
      setMsg('Código creado.')
      await load()
    } catch {
      setErr('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await updateDoc(doc(getDb(), MC.billingDiscountCodes, id), { active: !active, updatedAt: Date.now() })
    await load()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este código?')) return
    await deleteDoc(doc(getDb(), MC.billingDiscountCodes, id))
    await load()
  }

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="mc-shell space-y-8 pb-32">
      <Link
        to="/superadmin/planes"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4"
      >
        <IconChevronLeft size={18} />
        Planes
      </Link>

      <div>
        <h1 className="ios-large-title">Códigos de descuento</h1>
        <p className="ios-subhead mt-1 max-w-xl text-[var(--cat-muted)]">
          Bajá el precio del plan Expert o activalo gratis por un período (`precio 0` + días).
        </p>
      </div>

      <div className="mc-card mx-auto max-w-lg space-y-4">
        <p className="ios-headline">Nuevo código</p>
        <input className="mc-input" placeholder="CÓDIGO" value={code} onChange={(e) => setCode(e.target.value)} />
        <input
          className="mc-input"
          placeholder="Precio final COP (0 = gratis)"
          value={priceCop}
          onChange={(e) => setPriceCop(e.target.value)}
        />
        <input
          className="mc-input"
          placeholder="Días gratis si precio 0"
          value={freeDays}
          onChange={(e) => setFreeDays(e.target.value)}
        />
        <select className="mc-input" value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
          <option value="both">Mensual y anual</option>
          <option value="monthly">Solo mensual</option>
          <option value="yearly">Solo anual</option>
        </select>
        <input
          className="mc-input"
          placeholder="Máx. usos (vacío = ilimitado)"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
        />
        {err && <p className="text-[13px] text-red-800">{err}</p>}
        {msg && <p className="text-[13px]">{msg}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void crear()}>
          Crear código
        </button>
      </div>

      {loading ? (
        <p className="ios-subhead text-[var(--cat-muted)]">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="mc-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[15px] font-medium">{r.code}</p>
                <p className="ios-footnote text-[var(--cat-muted)]">
                  {r.priceCop === 0
                    ? `Gratis ${r.freeTrialDays ?? 30} días`
                    : formatCop(r.priceCop)}
                  {r.billingPeriod ? ` · ${r.billingPeriod}` : ''}
                  {r.maxRedemptions ? ` · ${r.redemptionCount ?? 0}/${r.maxRedemptions} usos` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="mc-btn-secondary px-3 py-2 text-[13px]"
                  onClick={() => void toggleActive(r.id, r.active)}
                >
                  {r.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  className="text-[13px] text-red-700 underline"
                  onClick={() => void eliminar(r.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
