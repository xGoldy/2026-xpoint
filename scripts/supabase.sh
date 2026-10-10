#!/usr/bin/env bash
# Runs the Supabase CLI against a project-local rootless Podman store in ./.supabase,
# so images, containers and the database volume never touch the root partition.
# Usage: scripts/supabase.sh <supabase args>   e.g. scripts/supabase.sh status
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STORE="$ROOT/.supabase"
SOCK="$STORE/podman.sock"
RUNROOT="${XDG_RUNTIME_DIR:-/tmp/$(id -u)}/skillswap-podman"

mkdir -p "$STORE/storage" "$RUNROOT"
cat >"$STORE/storage.conf" <<EOF
[storage]
driver = "overlay"
graphroot = "$STORE/storage"
runroot = "$RUNROOT"
EOF
export CONTAINERS_STORAGE_CONF="$STORE/storage.conf"
# Podman's systemd health-check timers ignore custom storage, so the loop below runs them instead.
export DISABLE_HC_SYSTEMD=true

ping() { curl -sf --unix-socket "$SOCK" http://d/_ping >/dev/null 2>&1; }

if ! ping; then
  rm -f "$SOCK"
  setsid nohup podman system service --time=0 "unix://$SOCK" >"$STORE/podman.log" 2>&1 </dev/null &
  for _ in $(seq 100); do ping && break; sleep 0.1; done
  ping || { echo "Podman service did not start, see $STORE/podman.log" >&2; exit 1; }
  # Health checks for running containers, for as long as the service is up.
  setsid nohup bash -c '
    while curl -sf --unix-socket "$0" http://d/_ping >/dev/null 2>&1; do
      for id in $(podman ps -q 2>/dev/null); do podman healthcheck run "$id" >/dev/null 2>&1 || true; done
      sleep 2
    done' "$SOCK" >/dev/null 2>&1 </dev/null &
fi

export DOCKER_HOST="unix://$SOCK"
cd "$ROOT"
exec npx supabase "$@"
