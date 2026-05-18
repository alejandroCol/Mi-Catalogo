#!/usr/bin/env bash
# Despliega solo Cloud Functions.
#
# 1) TMPDIR local: evita "EACCES" al empaquetar en /var/folders/.../T/ (macOS, antivirus, permisos).
# 2) En GCP, si el build falla con "missing permission on the build service account", la causa NO es
#    el mkdir del código; hay que ajustar IAM / APIs. Ver:
#    https://cloud.google.com/functions/docs/troubleshooting#build-service-account
#    y habilitar la API "Compute Engine" si aparece 403 a compute.googleapis.com.
#
# Uso: desde la raíz del repo: ./scripts/deploy-functions.sh
#      opciones adicionales:  ./scripts/deploy-functions.sh --force

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export TMPDIR="${TMPDIR:-$ROOT/.firebase-tmp}"
mkdir -p "$TMPDIR"
if command -v firebase >/dev/null 2>&1; then
  exec firebase deploy --only functions "$@"
fi
exec npx --yes firebase-tools@latest deploy --only functions "$@"
