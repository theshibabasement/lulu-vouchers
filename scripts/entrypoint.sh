#!/bin/sh
# Entrypoint do container.
# 1. Aplica schema (idempotente) — falha não derruba app.
# 2. Inicia loop de backup em background.
# 3. Sobe o server.

set -u

echo "[entrypoint] aplicando schema (init-db.mjs)..."
if node /app/scripts/init-db.mjs; then
  echo "[entrypoint] schema aplicado."
else
  echo "[entrypoint] WARN: init-db falhou — seguindo com fallback."
fi

echo "[entrypoint] bootstrap admin dona..."
node /app/scripts/bootstrap-admin.mjs || true

echo "[entrypoint] iniciando loop de backup em background..."
node /app/scripts/backup-loop.mjs &

echo "[entrypoint] iniciando Next standalone..."
exec node /app/server.js
