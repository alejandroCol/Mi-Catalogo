#!/usr/bin/env bash
# Asegura roles/run.invoker para allUsers en Cloud Run (callables v2 públicas).
# Firebase a veces no lo aplica en updates tras deploys fallidos iniciales.
set -euo pipefail

FN_NAME="${1:-}"
PROJECT="${FIREBASE_PROJECT:-mi-catalogo-de61a}"
REGION="${MC_FUNCTIONS_REGION:-us-central1}"

if [[ -z "$FN_NAME" ]]; then
  echo "Uso: $0 <nombreFunction>" >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud no instalado; omitiendo verificación de invoker para ${FN_NAME}." >&2
  exit 0
fi

SERVICE="$(printf '%s' "$FN_NAME" | tr '[:upper:]' '[:lower:]')"

if gcloud run services get-iam-policy "$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --format='value(bindings.members)' 2>/dev/null | grep -q 'allUsers'; then
  echo "✓ Invoker público OK: ${FN_NAME} (${SERVICE})"
  exit 0
fi

echo "▶ Configurando invoker público para ${FN_NAME} (${SERVICE})…"
gcloud run services add-iam-policy-binding "$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --member=allUsers \
  --role=roles/run.invoker \
  --quiet

echo "✓ Invoker público configurado: ${FN_NAME}"
