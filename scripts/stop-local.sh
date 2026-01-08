#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not found. Install Docker first." >&2
  exit 1
fi

docker compose down --remove-orphans
