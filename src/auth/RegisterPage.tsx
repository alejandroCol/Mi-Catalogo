import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, deleteUser, updateProfile } from 'firebase/auth'
import type { UserCredential } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { MC_TRIAL_DAYS, trialEndMs } from '@/lib/subscription'
import { IconPhotoStack } from '@/icons/McIcons'

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export function RegisterPage() {
  const nav = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [nombreTienda, setNombreTienda] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!firebaseConfigured) {
      setErr('Configura Firebase.')
      return
    }
    const sl = slugify(slug || nombreTienda)
    if (sl.length < 3) {
      setErr('La URL debe tener al menos 3 caracteres (letras o números).')
      return
    }
    const wa = whatsapp.replace(/\D/g, '')
    if (wa.length < 10) {
      setErr('Ingresá un WhatsApp válido (solo números, con indicativo).')
      return
    }
    setBusy(true)
    let cred: UserCredential | null = null
    let tid: string | null = null
    try {
      const db = getDb()
      const slugProbe = await getDoc(doc(db, MC.slugs, sl))
      if (slugProbe.exists() && slugProbe.data()?.active === true) {
        setErr('Esa URL ya está en uso. Elegí otra.')
        setBusy(false)
        return
      }

      const auth = getAuthApp()
      cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const name = displayName.trim() || nombreTienda.trim()
      await updateProfile(cred.user, { displayName: name })

      const newTenantRef = doc(collection(db, MC.tenants))
      tid = newTenantRef.id
      const emailNorm = (cred.user.email ?? email.trim()).toLowerCase()

      /** Paso 1: tenant + perfil (el slug va aparte para que la regla vea el tenant). */
      const batch = writeBatch(db)
      batch.set(newTenantRef, {
        ownerUid: cred.user.uid,
        slug: sl,
        nombreTienda: nombreTienda.trim(),
        whatsappNumero: wa,
        mensajeIntro: '',
        subscriptionEndsAt: trialEndMs(),
        createdAt: Date.now(),
        billingPlan: 'free',
      })
      batch.set(doc(db, MC.users, cred.user.uid), {
        uid: cred.user.uid,
        email: emailNorm,
        displayName: name,
        tenantId: tid,
        isSuperAdmin: false,
        createdAt: Date.now(),
      })
      await batch.commit()

      /** Paso 2: slug público. */
      await setDoc(doc(db, MC.slugs, sl), {
        tenantId: tid,
        active: true,
        updatedAt: Date.now(),
      })

      nav('/app', { replace: true })
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : ''
      if (cred?.user && tid) {
        try {
          await deleteDoc(doc(getDb(), MC.users, cred.user.uid))
          await deleteDoc(doc(getDb(), MC.tenants, tid))
        } catch {
          /* limpieza best-effort */
        }
      }
      if (cred?.user && code !== 'auth/email-already-in-use') {
        try {
          await deleteUser(cred.user)
        } catch {
          /* consola Auth si sigue bloqueado */
        }
      }
      if (code === 'auth/email-already-in-use') {
        setErr('Ese correo ya está registrado. Probá iniciar sesión.')
      } else if (code === 'permission-denied') {
        setErr(
          'Permiso denegado en Firestore. Revisá que las reglas estén desplegadas en este proyecto y que Authentication esté activo.',
        )
      } else if (code === 'already-exists') {
        setErr('Esa URL ya está en uso. Elegí otra.')
      } else {
        setErr(
          code
            ? `No se pudo crear la tienda (${code}). Si la URL ya existe, probá otra.`
            : 'No se pudo crear la tienda. Si la URL ya existe, probá otra.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-page min-h-svh px-4 py-8 pb-16">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-ios-blue/12 text-ios-blue">
            <IconPhotoStack size={32} />
          </div>
          <h1 className="ios-large-title text-center">Crear tienda</h1>
          <p className="ios-subhead text-center px-2">
            Probá {MC_TRIAL_DAYS} días gratis. Inventario fácil desde el celular.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="mc-card space-y-4">
            <div>
              <label className="ios-footnote font-medium text-mc-700">Tu nombre</label>
              <input className="mc-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Nombre de la tienda</label>
              <input
                className="mc-input"
                value={nombreTienda}
                onChange={(e) => setNombreTienda(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">URL pública (ej. mi-marca)</label>
              <input
                className="mc-input"
                placeholder="mi-marca"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <p className="ios-footnote mt-1">Catálogo: /c/tu-url</p>
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">WhatsApp pedidos (con código país)</label>
              <input
                className="mc-input"
                placeholder="573001234567"
                inputMode="numeric"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="mc-card space-y-4">
            <div>
              <label className="ios-footnote font-medium text-mc-700">Correo</label>
              <input type="email" className="mc-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Contraseña</label>
              <input
                type="password"
                className="mc-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>
          {err && <p className="text-[15px] text-ios-red">{err}</p>}
          <button type="submit" disabled={busy} className="mc-btn-primary w-full py-3.5">
            {busy ? 'Creando…' : 'Crear mi catálogo'}
          </button>
        </form>
        <p className="mt-8 text-center ios-subhead">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-semibold text-ios-blue">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
