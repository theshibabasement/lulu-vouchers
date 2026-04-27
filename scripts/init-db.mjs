/**
 * Inicializa schema do banco — roda dentro do container:
 *   docker exec lulu-app node /app/scripts/init-db.mjs
 *
 * Idempotente (CREATE TABLE IF NOT EXISTS + ALTER TABLE IF NOT EXISTS).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// scripts/ está em /app/scripts/, init.sql em /app/db/
const SQL_PATH = path.resolve(__dirname, '..', 'db', 'init.sql');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const sql = await fs.readFile(SQL_PATH, 'utf8');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log('[init-db] schema aplicado a partir de', SQL_PATH);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[init-db] falhou:', e);
  process.exit(1);
});
