#!/usr/bin/env sh
set -eu

echo "[Unique] Starting RAGE:MP server"
echo "[Unique] DATABASE_URL=${DATABASE_URL:-not-set}"

exec ./ragemp-server
