#!/usr/bin/env bash
# Despliegue completo de Mi Catálogo: hosting, functions, firestore y storage.
#
# Uso:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --debug
#   ./scripts/deploy.sh --only hosting,firestore
#   ./scripts/deploy.sh --skip-app-build
#
# Para desplegar solo Cloud Functions (con --only fn1,fn2), usá:
#   ./scripts/deploy-functions.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FIREBASE_TMP="${ROOT}/.firebase-tmp"
mkdir -p "$FIREBASE_TMP"
export TMPDIR="$FIREBASE_TMP"
export TMP="$FIREBASE_TMP"
export TEMP="$FIREBASE_TMP"

DEPLOY_DEBUG=false
SKIP_APP_BUILD=false
ONLY_RAW=""
MAX_RETRIES=3

ALL_TARGETS=(hosting functions firestore storage)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug)
      DEPLOY_DEBUG=true
      shift
      ;;
    --skip-app-build)
      SKIP_APP_BUILD=true
      shift
      ;;
    --only)
      ONLY_RAW="${2:-}"
      if [[ -z "$ONLY_RAW" ]]; then
        echo "Falta valor para --only (ej. hosting,functions,firestore,storage)" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Uso: ./scripts/deploy.sh [opciones]

Despliega Mi Catálogo a Firebase (por defecto: todo).

Opciones:
  --debug            Log verbose de Firebase (+ archivo deploy-*.log)
  --skip-app-build   No ejecuta npm run build (usa dist/ existente)
  --only LISTA       Solo targets separados por coma:
                     hosting, functions, firestore, storage

Ejemplos:
  ./scripts/deploy.sh
  ./scripts/deploy.sh --only hosting,storage
  ./scripts/deploy.sh --debug --only firestore

Functions puntuales (una o varias):
  ./scripts/deploy-functions.sh --only mcCreateSalesRep
EOF
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1 (usá --help)" >&2
      exit 1
      ;;
  esac
done

log() {
  printf '\n▶ %s\n' "$1"
}

die() {
  printf '\n✗ %s\n' "$1" >&2
  exit 1
}

normalize_target() {
  local t
  t="$(echo "$1" | xargs | tr '[:upper:]' '[:lower:]')"
  case "$t" in
    hosting|functions|firestore|storage) echo "$t" ;;
    *)
      die "Target inválido: \"$1\". Usá: hosting, functions, firestore, storage"
      ;;
  esac
}

TARGETS=()
if [[ -n "$ONLY_RAW" ]]; then
  IFS=',' read -ra ONLY_LIST <<< "$ONLY_RAW"
  for raw in "${ONLY_LIST[@]}"; do
    TARGETS+=("$(normalize_target "$raw")")
  done
else
  TARGETS=("${ALL_TARGETS[@]}")
fi

target_enabled() {
  local want="$1"
  local t
  for t in "${TARGETS[@]}"; do
    [[ "$t" == "$want" ]] && return 0
  done
  return 1
}

# --- Preflight ---
log "Verificando herramientas…"
command -v firebase >/dev/null 2>&1 || die "Instalá Firebase CLI: npm i -g firebase-tools"
command -v node >/dev/null 2>&1 || die "Node.js no encontrado."
command -v npm >/dev/null 2>&1 || die "npm no encontrado."

if ! firebase projects:list >/dev/null 2>&1; then
  die "No hay sesión Firebase activa. Ejecutá: firebase login"
fi

if [[ -d "$HOME/.config" ]] && [[ ! -w "$HOME/.config" ]]; then
  log "Aviso: ~/.config no es escribible. Si el deploy falla, ejecutá:"
  echo "  sudo chown -R \$(whoami) ~/.config"
fi

# --- Build frontend (hosting) ---
if target_enabled hosting; then
  if [[ "$SKIP_APP_BUILD" == true ]]; then
    log "Omitiendo build del frontend (--skip-app-build)…"
  else
    log "Compilando frontend (tsc + vite build)…"
    rm -rf dist
    npm run build
  fi
  [[ -f dist/index.html ]] || die "No existe dist/index.html. Ejecutá npm run build."
fi

# --- Build functions ---
if target_enabled functions; then
  log "Compilando functions (TypeScript → lib/)…"
  node scripts/ensure-functions-lib.cjs
  npm --prefix functions run build

  [[ -f functions/lib/index.js ]] || die "No existe functions/lib/index.js después del build."

  LIB_JS_COUNT="$(find functions/lib -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
  [[ "${LIB_JS_COUNT}" -gt 0 ]] || die "functions/lib no tiene .js compilados."

  if grep -q '^lib/' functions/.gitignore 2>/dev/null; then
    die "functions/.gitignore no debe ignorar lib/ (Firebase sube un zip vacío y falla con function.js does not exist)."
  fi

  log "Dependencias de functions…"
  if [[ -f functions/package-lock.json ]]; then
    npm --prefix functions ci
  else
    npm --prefix functions install
  fi
fi

rm -f firebase-debug.log firebase-debug.*.log 2>/dev/null || true

ONLY_ARG="$(IFS=,; echo "${TARGETS[*]}")"
log "Desplegando: ${ONLY_ARG}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$ROOT/deploy-${TIMESTAMP}.log"

DEPLOY_ARGS=(deploy --only "$ONLY_ARG")
if [[ "$DEPLOY_DEBUG" == true ]]; then
  DEPLOY_ARGS+=(--debug)
  export DEBUG='*'
  log "Modo debug ON — log completo en: ${LOG_FILE}"
fi

attempt=1
while [[ ${attempt} -le ${MAX_RETRIES} ]]; do
  log "Intento ${attempt} de ${MAX_RETRIES}…"
  set +e
  if [[ "$DEPLOY_DEBUG" == true ]]; then
    firebase "${DEPLOY_ARGS[@]}" 2>&1 | tee "$LOG_FILE"
    status=${PIPESTATUS[0]}
  else
    firebase "${DEPLOY_ARGS[@]}"
    status=$?
  fi
  set -e

  if [[ ${status} -eq 0 ]]; then
    log "Deploy completado: ${ONLY_ARG}"
    if [[ "$DEPLOY_DEBUG" == true ]]; then
      echo "Log guardado en: ${LOG_FILE}"
    fi
    exit 0
  fi

  if [[ ${attempt} -lt ${MAX_RETRIES} ]]; then
    log "Falló (código ${status}). Reintentando en 8s…"
    sleep 8
  fi
  attempt=$((attempt + 1))
done

if [[ "$DEPLOY_DEBUG" == true ]]; then
  die "Deploy falló tras ${MAX_RETRIES} intentos. Revisá ${LOG_FILE}"
else
  die "Deploy falló tras ${MAX_RETRIES} intentos."
fi
