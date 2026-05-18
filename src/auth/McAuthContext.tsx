import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { mapFirestoreDataToMcUser } from '@/lib/mcUserFromFirestore'
import type { McTenant, McUser } from '@/types/mc'

type McAuthState = {
  firebaseUser: User | null
  profile: McUser | null
  profileReady: boolean
  tenant: McTenant | null
  tenantReady: boolean
  loading: boolean
}

const McAuthContext = createContext<McAuthState | null>(null)

export function McAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState<McUser | null>(null)
  const [profileReady, setProfileReady] = useState(false)
  const [tenant, setTenant] = useState<McTenant | null>(null)
  const [tenantReady, setTenantReady] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthReady(true)
      return
    }
    const auth = getAuthApp()
    return onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u)
      setAuthReady(true)
      if (!u) {
        setProfile(null)
        setProfileReady(true)
        setTenant(null)
        setTenantReady(true)
      } else {
        setProfileReady(false)
        setTenantReady(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!firebaseConfigured || !firebaseUser) {
      return
    }
    const db = getDb()
    const uref = doc(db, MC.users, firebaseUser.uid)
    const unsub = onSnapshot(uref, (snap) => {
      if (!snap.exists()) {
        setProfile(null)
      } else {
        setProfile(mapFirestoreDataToMcUser(snap.id, snap.data()))
      }
      setProfileReady(true)
    })
    return () => unsub()
  }, [firebaseUser])

  useEffect(() => {
    if (!firebaseConfigured || !profile?.tenantId) {
      setTenant(null)
      setTenantReady(true)
      return
    }
    setTenantReady(false)
    const db = getDb()
    const tref = doc(db, MC.tenants, profile.tenantId)
    const unsub = onSnapshot(tref, (snap) => {
      if (!snap.exists()) {
        setTenant(null)
      } else {
        const d = snap.data() as Omit<McTenant, 'id'>
        setTenant({ id: snap.id, ...d })
      }
      setTenantReady(true)
    })
    return () => unsub()
  }, [profile?.tenantId])

  const loading = !authReady || (Boolean(firebaseUser) && (!profileReady || !tenantReady))

  const value = useMemo(
    () => ({ firebaseUser, profile, profileReady, tenant, tenantReady, loading }),
    [firebaseUser, profile, profileReady, tenant, tenantReady, loading],
  )

  return <McAuthContext.Provider value={value}>{children}</McAuthContext.Provider>
}

export function useMcAuth() {
  const ctx = useContext(McAuthContext)
  if (!ctx) throw new Error('useMcAuth fuera de McAuthProvider')
  return ctx
}
