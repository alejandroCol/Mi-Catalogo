/** URL pública del Cloud Function `mcOnepayCatalogWebhook` con query `?k=` de ruta. */
export function onepayCatalogWebhookUrl(hookK: string) {
  const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1'
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
  return `https://${region}-${projectId}.cloudfunctions.net/mcOnepayCatalogWebhook?k=${encodeURIComponent(hookK)}`
}
