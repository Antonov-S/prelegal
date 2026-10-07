#!/usr/bin/env sh
# Build and start Prelegal in Docker. The development database is recreated on every start.
set -e
cd "$(dirname "$0")/.."
docker compose up --build --force-recreate -d
echo "Prelegal is running at http://localhost:8000"
