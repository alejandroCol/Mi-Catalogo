import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { reload } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { onIdTokenChanged } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { isMcSalesRepUser, mapFirestoreDataToMcUser } from '@/lib/mcUserFromFirestore'
import {
  callMcStartStoreImpersonation,
  callMcStopStoreImpersonation,
  readImpersonateTenantIdFromClaims,
} from '@/lib/mcStoreImpersonation'
import { setMcAnalyticsTenantContext } from '@/lib/mcAnalytics'
import type { McTenant, McUser } from '@/types/mc'

export type McImpersonationState = {
  sessionId: string | null
  tenantId: string
  tenantSlug: string
  tenantName: string
  startedAt: number
} | null

type McAuthState = {
  firebaseUser: User | null
  profile: McUser | null
  profileReady: boolean
  tenant: McTenant | null
  tenantReady: boolean
  loading: boolean
  /** Tienda activa en el panel: impersonada o la del perfil. */
  effectiveTenantId: string | undefined
  /** Súper admin viendo otra tienda (claim validado en servidor). */
  isImpersonating: boolean
  /** Durante impersonación, la UI se comporta como el dueño de la tienda. */
  isActingAsStoreOwner: boolean
  impersonation: McImpersonationState
  startStoreImpersonation: (tenantId: string) => Promise<{ ok: true } | { ok: false; message: string }>
  stopStoreImpersonation: () => Promise<{ ok: true } | { ok: false; message: string }>
  /** Sincroniza el usuario de Auth (p. ej. tras verificar email). */
  refreshAuthUser: () => Promise<boolean>
}

const McAuthContext = createContext<McAuthState | null>(null)

async function loadImpersonationFromUser(
  user: User | null,
): Promise<{ tenantId: string | null; meta: McImpersonationState }> {
  if (!user) return { tenantId: null, meta: null }
  const token = await user.getIdTokenResult()
  const tenantId = readImpersonateTenantIdFromClaims(token.claims as Record<string, unknown>)
  if (!tenantId) return { tenantId: null, meta: null }
  const sessionId =
    typeof token.claims.mcImpersonateSessionId === 'string'
      ? token.claims.mcImpersonateSessionId
      : null
  return {
    tenantId,
    meta: {
      sessionId,
      tenantId,
      tenantSlug: '',
      tenantName: '',
      startedAt: 0,
    },
  }
}

export function McAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<McUser | null>(null)
  const [profileReady, setProfileReady] = useState(false)
  const [tenant, setTenant] = useState<McTenant | null>(null)
  const [tenantReady, setTenantReady] = useState(false)
  const [authRevision, setAuthRevision] = useState(0)
  const [impersonateTenantId, setImpersonateTenantId] = useState<string | null>(null)
  const [impersonationMeta, setImpersonationMeta] = useState<McImpersonationState>(null)
  const lastAuthUidRef = useRef<string | null>(null)

  const syncImpersonationClaims = useCallback(async (user: User | null) => {
    const { tenantId, meta } = await loadImpersonationFromUser(user)
    setImpersonateTenantId(tenantId)
    setImpersonationMeta(meta)
    return tenantId
  }, [])

  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthReady(true)
      return
    }
    const auth = getAuthApp()
    return onIdTokenChanged(auth, (u) => {
      const nextUid = u?.uid ?? null
      const uidChanged = lastAuthUidRef.current !== nextUid
      lastAuthUidRef.current = nextUid

      setFirebaseUser(u)
      setAuthRevision((n) => n + 1)
      setAuthReady(true)

      void syncImpersonationClaims(u)

      if (uidChanged) {
        if (!u) {
          setProfile(null)
          setProfileReady(true)
          setTenant(null)
          setTenantReady(true)
          setImpersonateTenantId(null)
          setImpersonationMeta(null)
        } else {
          setProfileReady(false)
          setTenantReady(false)
        }
      }
    })
  }, [syncImpersonationClaims])

  const effectiveTenantId = impersonateTenantId ?? profile?.tenantId ?? undefined
  const isImpersonating = Boolean(impersonateTenantId)
  const isActingAsStoreOwner =
    isImpersonating || Boolean(profile?.uid && tenant?.ownerUid && profile.uid === tenant.ownerUid)

  const refreshAuthUser = useCallback(async (): Promise<boolean> => {
    if (!firebaseConfigured) return false
    const auth = getAuthApp()
    const u = auth.currentUser
    if (!u) return false
    await reload(u)
    const current = auth.currentUser
    if (!current) return false
    await current.getIdToken(true)
    setFirebaseUser(current)
    setAuthRevision((n) => n + 1)
    const claimTenantId = await syncImpersonationClaims(current)
    if (!current.emailVerified) return false

    const db = getDb()
    const userSnap = await getDoc(doc(db, MC.users, current.uid))
    if (!userSnap.exists()) {
      setProfile(null)
      setProfileReady(true)
      setTenant(null)
      setTenantReady(true)
      return false
    }

    const mappedProfile = mapFirestoreDataToMcUser(userSnap.id, userSnap.data())
    setProfile(mappedProfile)
    setProfileReady(true)

    const tid = claimTenantId ?? mappedProfile.tenantId
    if (!tid) {
      setTenant(null)
      setTenantReady(true)
      return false
    }

    const tenantSnap = await getDoc(doc(db, MC.tenants, tid))
    if (!tenantSnap.exists()) {
      setTenant(null)
      setTenantReady(true)
      return false
    }

    const loadedTenant = { id: tenantSnap.id, ...(tenantSnap.data() as Omit<McTenant, 'id'>) }
    setTenant(loadedTenant)
    setTenantReady(true)
    if (claimTenantId) {
      setImpersonationMeta((prev) =>
        prev
          ? {
              ...prev,
              tenantSlug: loadedTenant.slug,
              tenantName: loadedTenant.nombreTienda,
            }
          : {
              sessionId: null,
              tenantId: claimTenantId,
              tenantSlug: loadedTenant.slug,
              tenantName: loadedTenant.nombreTienda,
              startedAt: 0,
            },
      )
    }
    return true
  }, [syncImpersonationClaims])

  const startStoreImpersonation = useCallback(
    async (tenantId: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!firebaseUser) {
        return { ok: false, message: 'Iniciá sesión.' }
      }
      const res = await callMcStartStoreImpersonation(tenantId)
      if (!res.ok) {
        return { ok: false, message: res.message }
      }
      await firebaseUser.getIdToken(true)
      setAuthRevision((n) => n + 1)
      setImpersonateTenantId(res.tenantId)
      setImpersonationMeta({
        sessionId: res.sessionId,
        tenantId: res.tenantId,
        tenantSlug: res.tenantSlug,
        tenantName: res.tenantName,
        startedAt: res.startedAt,
      })
      setTenantReady(false)
      return { ok: true }
    },
    [firebaseUser],
  )

  const stopStoreImpersonation = useCallback(async (): Promise<
    { ok: true } | { ok: false; message: string }
  > => {
    if (!firebaseUser) {
      return { ok: false, message: 'Iniciá sesión.' }
    }
    const res = await callMcStopStoreImpersonation()
    if (!res.ok) {
      return { ok: false, message: res.message }
    }
    await firebaseUser.getIdToken(true)
    setAuthRevision((n) => n + 1)
    setImpersonateTenantId(null)
    setImpersonationMeta(null)
    setTenantReady(false)
    return { ok: true }
  }, [firebaseUser])

  useEffect(() => {
    if (!firebaseConfigured || !firebaseUser?.uid) {
      return
    }
    const uid = firebaseUser.uid
    const db = getDb()
    const uref = doc(db, MC.users, uid)
    const unsub = onSnapshot(
      uref,
      (snap) => {
        if (!snap.exists()) {
          setProfile(null)
        } else {
          setProfile(mapFirestoreDataToMcUser(snap.id, snap.data()))
        }
        setProfileReady(true)
      },
      () => {
        setProfile(null)
        setProfileReady(true)
      },
    )
    return () => unsub()
  }, [firebaseUser?.uid])

  useEffect(() => {
    if (!firebaseConfigured) {
      setTenant(null)
      setTenantReady(true)
      return
    }
    if (profileReady && profile && isMcSalesRepUser(profile) && !effectiveTenantId) {
      setTenant(null)
      setTenantReady(true)
      return
    }
    if (!effectiveTenantId) {
      setTenant(null)
      setTenantReady(true)
      return
    }
    setTenantReady(false)
    const db = getDb()
    const tref = doc(db, MC.tenants, effectiveTenantId)
    const unsub = onSnapshot(
      tref,
      (snap) => {
        if (!snap.exists()) {
          setTenant(null)
        } else {
          const d = snap.data() as Omit<McTenant, 'id'>
          const loaded = { id: snap.id, ...d }
          setTenant(loaded)
          if (isImpersonating) {
            setImpersonationMeta((prev) =>
              prev
                ? { ...prev, tenantSlug: loaded.slug, tenantName: loaded.nombreTienda }
                : {
                    sessionId: null,
                    tenantId: effectiveTenantId,
                    tenantSlug: loaded.slug,
                    tenantName: loaded.nombreTienda,
                    startedAt: 0,
                  },
            )
          }
        }
        setTenantReady(true)
      },
      () => {
        setTenant(null)
        setTenantReady(true)
      },
    )
    return () => unsub()
  }, [effectiveTenantId, isImpersonating, profile, profileReady])

  useEffect(() => {
    if (!tenant?.id || !tenant.slug) return
    void setMcAnalyticsTenantContext(tenant.id, tenant.slug)
  }, [tenant?.id, tenant?.slug])

  const isSalesRep = isMcSalesRepUser(profile)
  const loading =
    !authReady ||
    (Boolean(firebaseUser) &&
      (!profileReady || (!tenantReady && !(isSalesRep && !effectiveTenantId))))

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      profileReady,
      tenant,
      tenantReady,
      loading,
      effectiveTenantId,
      isImpersonating,
      isActingAsStoreOwner,
      impersonation: impersonationMeta,
      startStoreImpersonation,
      stopStoreImpersonation,
      refreshAuthUser,
    }),
    [
      firebaseUser,
      profile,
      profileReady,
      tenant,
      tenantReady,
      loading,
      effectiveTenantId,
      isImpersonating,
      isActingAsStoreOwner,
      impersonationMeta,
      startStoreImpersonation,
      stopStoreImpersonation,
      refreshAuthUser,
      authRevision,
    ],
  )

  return <McAuthContext.Provider value={value}>{children}</McAuthContext.Provider>
}

export function useMcAuth() {
  const ctx = useContext(McAuthContext)
  if (!ctx) throw new Error('useMcAuth fuera de McAuthProvider')
  return ctx
}
