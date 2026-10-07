#!/usr/bin/env sh
# Stop Prelegal and remove its container.
set -e
cd "$(dirname "$0")/.."
docker compose down
