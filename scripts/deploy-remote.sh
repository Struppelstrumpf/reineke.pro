#!/usr/bin/env bash
# Deploy reineke.pro auf dem Hetzner-Server per SSH (Linux/macOS).
#   bash scripts/deploy-remote.sh
#   bash scripts/deploy-remote.sh web
#   PRUNE=1 bash scripts/deploy-remote.sh

set -euo pipefail

SERVER="${DEPLOY_SERVER:-root@5.75.246.39}"
TARGET="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec ssh "$SERVER" "PRUNE=${PRUNE:-0} bash -s -- $TARGET" < "$SCRIPT_DIR/deploy-hetzner.sh"
