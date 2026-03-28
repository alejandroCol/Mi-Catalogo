import { type FirebaseApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

export const firebaseConfigured = Boolean(readConfig().apiKey && readConfig().projectId)
export const firebaseStorageConfigured = Boolean(
  readConfig().apiKey && readConfig().projectId && readConfig().storageBucket,
)

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let storage: FirebaseStorage | null = null

if (firebaseConfigured) {
  const cfg = readConfig()
  app = getApps().length ? getApps()[0]! : initializeApp(cfg)
  db = getFirestore(app)
  auth = getAuth(app)
  if (cfg.storageBucket) {
    storage = getStorage(app)
  }
}

export function getDb(): Firestore {
  if (!db) {
    throw new Error('Configura Firebase en mi-catalogo/.env (VITE_FIREBASE_*).')
  }
  return db
}

export function getAuthApp(): Auth {
  if (!auth) throw new Error('Firebase Auth no disponible.')
  return auth
}

export function getStorageApp(): FirebaseStorage {
  if (!storage) {
    throw new Error('Define VITE_FIREBASE_STORAGE_BUCKET para subir fotos.')
  }
  return storage
}
