/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  /** Emails separados por coma con permiso de super admin (deben tener isSuperAdmin en Firestore también) */
  readonly VITE_MC_SUPERADMIN_EMAILS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
