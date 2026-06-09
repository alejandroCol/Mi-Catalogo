#!/usr/bin/env bash
# Despliegue robusto de Cloud Functions para Mi Catálogo.
# Deploy completo (hosting + rules + storage + functions): ./scripts/deploy.sh
# Uso:
#   ./scripts/deploy-functions.sh
#   ./scripts/deploy-functions.sh --debug
#   ./scripts/deploy-functions.sh --only mcCreateSalesRep,mcSetSalesRepActive
#   ./scripts/deploy-functions.sh --debug --only mcCreateSalesRep,mcSetSalesRepActive

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# macOS: a veces /var/folders/.../T devuelve EACCES al crear el zip de functions.
FIREBASE_TMP="${ROOT}/.firebase-tmp"
mkdir -p "$FIREBASE_TMP"
export TMPDIR="$FIREBASE_TMP"
export TMP="$FIREBASE_TMP"
export TEMP="$FIREBASE_TMP"

DEPLOY_DEBUG=false
ONLY=""
MAX_RETRIES=3

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug)
      DEPLOY_DEBUG=true
      shift
      ;;
    --only)
      ONLY="${2:-}"
      if [[ -z "$ONLY" ]]; then
        echo "Falta valor para --only (ej. mcCreateSalesRep,mcSetSalesRepActive)" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      echo "Uso: $0 [--debug] [--only fn1,fn2]"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
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

# --- Preflight ---
log "Verificando herramientas…"
command -v firebase >/dev/null 2>&1 || die "Instalá Firebase CLI: npm i -g firebase-tools"
command -v node >/dev/null 2>&1 || die "Node.js no encontrado."

if ! firebase projects:list >/dev/null 2>&1; then
  die "No hay sesión Firebase activa. Ejecutá: firebase login"
fi

# Permisos ~/.config (firebase-tools a veces falla con "unexpected error" sin esto)
if [[ -d "$HOME/.config" ]] && [[ ! -w "$HOME/.config" ]]; then
  log "Aviso: ~/.config no es escribible. Si el deploy falla, ejecutá:"
  echo "  sudo chown -R \$(whoami) ~/.config"
fi

# --- Build ---
log "Compilando functions (TypeScript → lib/)…"
node scripts/ensure-functions-lib.cjs
npm --prefix functions run build

[[ -f functions/lib/index.js ]] || die "No existe functions/lib/index.js después del build."

LIB_JS_COUNT="$(find functions/lib -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
[[ "${LIB_JS_COUNT}" -gt 0 ]] || die "functions/lib no tiene .js compilados."

if grep -q '^lib/' functions/.gitignore 2>/dev/null; then
  die "functions/.gitignore no debe ignorar lib/ (Firebase sube un zip vacío y falla con function.js does not exist)."
fi

log "Dependencias de functions (incluye devDeps para tsc en predeploy)…"
if [[ -f functions/package-lock.json ]]; then
  npm --prefix functions ci
else
  npm --prefix functions install
fi

# --- Limpieza de logs viejos (evita archivos enormes en el zip) ---
rm -f firebase-debug.log firebase-debug.*.log 2>/dev/null || true

# --- Deploy ---
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$ROOT/deploy-functions-${TIMESTAMP}.log"

DEPLOY_ARGS=(deploy --only)
if [[ -n "$ONLY" ]]; then
  IFS=',' read -ra FN_LIST <<< "$ONLY"
  ONLY_PARTS=()
  for fn in "${FN_LIST[@]}"; do
    fn="$(echo "$fn" | xargs)"
    [[ -n "$fn" ]] && ONLY_PARTS+=("functions:${fn}")
  done
  ONLY_ARG="$(IFS=,; echo "${ONLY_PARTS[*]}")"
  DEPLOY_ARGS+=("$ONLY_ARG")
  log "Desplegando solo: $ONLY_ARG"
else
  DEPLOY_ARGS+=("functions")
  log "Desplegando todas las functions…"
fi

if [[ "$DEPLOY_DEBUG" == true ]]; then
  DEPLOY_ARGS+=(--debug)
  export DEBUG='*'
  log "Modo debug ON — log completo en: ${LOG_FILE}"
fi

attempt=1
while [[ ${attempt} -le ${MAX_RETRIES} ]]; do
  log "Intento ${attempt} de ${MAX_RETRIES}..."
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
    log "Deploy completado."
    if [[ -n "$ONLY" ]]; then
      IFS=',' read -ra FN_ENSURE <<< "$ONLY"
      for fn in "${FN_ENSURE[@]}"; do
        fn="$(echo "$fn" | xargs)"
        [[ -n "$fn" ]] && bash "$ROOT/scripts/ensure-callable-invoker.sh" "$fn"
      done
    fi
    if [[ "$DEPLOY_DEBUG" == true ]]; then
      echo "Log guardado en: ${LOG_FILE}"
    fi
    exit 0
  fi

  if [[ ${attempt} -lt ${MAX_RETRIES} ]]; then
    log "Falló (código ${status}). Reintentando en 8s..."
    sleep 8
  fi
  attempt=$((attempt + 1))
done

if [[ "$DEPLOY_DEBUG" == true ]]; then
  die "Deploy falló tras ${MAX_RETRIES} intentos. Revisá ${LOG_FILE}"
else
  die "Deploy falló tras ${MAX_RETRIES} intentos."
fi
