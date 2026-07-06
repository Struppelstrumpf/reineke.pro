#!/usr/bin/env bash
# Deploy reineke.pro auf dem Hetzner-Server (Docker + GHCR).
#
# Auf dem Server:
#   bash scripts/deploy-hetzner.sh
#
# Von Windows (im Repo-Root):
#   powershell -File scripts/deploy-remote.ps1
#
# Von Linux/macOS:
#   bash scripts/deploy-remote.sh

set -euo pipefail

readonly WEB_IMAGE="ghcr.io/struppelstrumpf/reineke.pro:latest"
readonly API_IMAGE="ghcr.io/struppelstrumpf/reineke.pro-api:latest"
readonly NETWORK="reineke-net"
readonly WEB_CONTAINER="reineke-pro"
readonly API_CONTAINER="reineke-api"
readonly WEB_PORT="8080"
readonly API_PORT="19290"
readonly DATA_VOLUME="reineke_data"

TARGET="${1:-all}"
PRUNE="${PRUNE:-0}"

log() {
  printf '\n▶ %s\n' "$*"
}

ok() {
  printf '✓ %s\n' "$*"
}

warn() {
  printf '⚠ %s\n' "$*" >&2
}

die() {
  printf '✗ %s\n' "$*" >&2
  exit 1
}

need_docker() {
  command -v docker >/dev/null 2>&1 || die "Docker ist nicht installiert oder nicht im PATH."
}

ensure_network() {
  if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
    log "Docker-Netzwerk $NETWORK anlegen"
    docker network create "$NETWORK" >/dev/null
  fi
  ok "Netzwerk $NETWORK bereit"
}

restart_container() {
  local name="$1"
  if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
    docker stop "$name" >/dev/null 2>&1 || true
    docker rm "$name" >/dev/null 2>&1 || true
  fi
}

deploy_api() {
  log "API-Image ziehen: $API_IMAGE"
  docker pull "$API_IMAGE"

  log "API-Container starten ($API_CONTAINER)"
  restart_container "$API_CONTAINER"
  docker run -d \
    --name "$API_CONTAINER" \
    --restart unless-stopped \
    --network "$NETWORK" \
    --network-alias api \
    -p "127.0.0.1:${API_PORT}:19290" \
    -v "${DATA_VOLUME}:/data" \
    -e TZ=Europe/Berlin \
    -e WS_DATA_FILE=/data/ws-store.json \
    -e NASEBAER_FRONTEND_ORIGIN=https://www.reineke.pro \
    "$API_IMAGE" >/dev/null

  ok "API läuft auf 127.0.0.1:${API_PORT}"
}

deploy_web() {
  log "Web-Image ziehen: $WEB_IMAGE"
  docker pull "$WEB_IMAGE"

  log "Web-Container starten ($WEB_CONTAINER)"
  restart_container "$WEB_CONTAINER"
  docker run -d \
    --name "$WEB_CONTAINER" \
    --restart unless-stopped \
    --network "$NETWORK" \
    -p "${WEB_PORT}:80" \
    "$WEB_IMAGE" >/dev/null

  ok "Web läuft auf Port ${WEB_PORT}"
}

health_check() {
  log "Health-Checks"
  sleep 2

  if curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1; then
    ok "API health: OK"
  else
    warn "API health: fehlgeschlagen (Container evtl. noch am Starten)"
  fi

  if curl -fsSI "http://127.0.0.1:${WEB_PORT}/" | head -n 1 | grep -q '200\|301\|302'; then
    ok "Web: OK"
  else
    warn "Web: keine 200/301/302-Antwort"
  fi

  docker ps --filter "name=${WEB_CONTAINER}|${API_CONTAINER}" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
}

show_status() {
  log "Container-Status"
  docker ps -a --filter "name=${WEB_CONTAINER}|${API_CONTAINER}" --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}' || true
}

maybe_prune() {
  if [[ "$PRUNE" == "1" ]]; then
    log "Alte Images aufräumen"
    docker image prune -f >/dev/null
    ok "image prune erledigt"
  fi
}

usage() {
  cat <<'EOF'
Verwendung: deploy-hetzner.sh [all|web|api|status]

  all     API + Web neu deployen (Standard)
  web     Nur Frontend (reineke-pro)
  api     Nur Backend (reineke-api)
  status  Laufende Container anzeigen

Umgebungsvariablen:
  PRUNE=1   Nach dem Deploy alte Images entfernen

Beispiele:
  bash scripts/deploy-hetzner.sh
  bash scripts/deploy-hetzner.sh web
  PRUNE=1 bash scripts/deploy-hetzner.sh all
EOF
}

main() {
  case "$TARGET" in
    -h|--help|help)
      usage
      exit 0
      ;;
    status)
      need_docker
      show_status
      exit 0
      ;;
    all|web|api)
      ;;
    *)
      die "Unbekanntes Ziel: $TARGET (all|web|api|status)"
      ;;
  esac

  need_docker
  ensure_network

  if [[ "$TARGET" == "all" || "$TARGET" == "api" ]]; then
    deploy_api
  fi

  if [[ "$TARGET" == "all" || "$TARGET" == "web" ]]; then
    deploy_web
  fi

  health_check
  maybe_prune

  log "Fertig — https://www.reineke.pro"
}

main "$@"
