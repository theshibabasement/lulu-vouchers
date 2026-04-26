/**
 * Inicializa schema do banco — roda dentro do container:
 *   docker exec lulu-app node scripts/init-db.mjs
 *
 * Idempotente (CREATE TABLE IF NOT EXISTS).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const sqlPath = path.resolve(process.cwd(), 'db/init.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log('[init-db] schema aplicado');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[init-db] falhou:', e);
  process.exit(1);
});
