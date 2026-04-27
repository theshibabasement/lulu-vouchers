#!/bin/sh
# Entrypoint do container — aplica schema (idempotente) antes de subir o server.
# Se a migration falhar, loga e segue mesmo assim — o app tem fallback JSONL
# pra leitura, então fica disponível mesmo com DB temporariamente fora.

set -u

echo "[entrypoint] aplicando schema (init-db.mjs)..."
if node /app/scripts/init-db.mjs; then
  echo "[entrypoint] schema aplicado."
else
  echo "[entrypoint] WARN: init-db falhou — seguindo com fallback."
fi

echo "[entrypoint] iniciando Next standalone..."
exec node /app/server.js
