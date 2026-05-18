/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  /** Región de Cloud Functions (ej. us-central1). Debe coincidir con el deploy. */
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string
  /** Legado: la UI no filtra por esto. El acceso es solo `isSuperAdmin` en `mc_users/{uid}`. */
  readonly VITE_MC_SUPERADMIN_EMAILS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
