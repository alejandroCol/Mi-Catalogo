/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  /** Firebase Analytics (Google Analytics 4). Opcional pero recomendado. */
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string
  /** Región de Cloud Functions (ej. us-central1). Debe coincidir con el deploy. */
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string
  /** Legado: la UI no filtra por esto. El acceso es solo `isSuperAdmin` en `mc_users/{uid}`. */
  readonly VITE_MC_SUPERADMIN_EMAILS?: string
  /** Host raíz de la plataforma (ej. micatalogo.io). */
  readonly VITE_MC_PLATFORM_HOST?: string
  /** Modo de URL del catálogo: `subdomain` (prod) o `path` (localhost). */
  readonly VITE_MC_STORE_URL_MODE?: 'subdomain' | 'path'
  /** Origen público del sitio (emails de verificación). */
  readonly VITE_MC_PUBLIC_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
