/**
 * Backup do Postgres — gera dump comprimido em /data/backups/.
 *
 * Roda standalone:  docker exec lulu-app node /app/scripts/backup.mjs
 * Roda no loop:     scripts/backup-loop.mjs (a cada 24h)
 *
 * Mantém os últimos 30 backups; remove os mais antigos.
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const DATA_DIR = process.env.DATA_DIR || '/data';
const OUT_DIR = path.join(DATA_DIR, 'backups');
const KEEP = 30;

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export async function runBackup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  await fs.mkdir(OUT_DIR, { recursive: true });
  const tag = stamp();
  const outFile = path.join(OUT_DIR, `lulu-${tag}.sql.gz`);

  const proc = spawn('pg_dump', ['--no-owner', '--no-privileges', url], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  let exitCode = null;
  proc.on('exit', (code) => {
    exitCode = code;
  });

  await pipeline(proc.stdout, zlib.createGzip(), createWriteStream(outFile));

  // Espera processo terminar pra capturar exit code
  if (exitCode === null) {
    await new Promise((resolve) => proc.on('exit', resolve));
  }
  if (exitCode !== 0) {
    throw new Error(`pg_dump terminou com código ${exitCode}`);
  }

  console.log('[backup] gravado:', outFile);
  await rotate();
  return outFile;
}

async function rotate() {
  const files = await fs.readdir(OUT_DIR);
  const sql = files.filter((f) => f.startsWith('lulu-') && f.endsWith('.sql.gz'));
  if (sql.length <= KEEP) return;
  sql.sort(); // tag YYYYMMDD-HHMM ordena lexicograficamente
  const toDelete = sql.slice(0, sql.length - KEEP);
  for (const f of toDelete) {
    await fs.unlink(path.join(OUT_DIR, f));
  }
  console.log(`[backup] rotação: removidos ${toDelete.length} antigos.`);
}

// Roda standalone
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  runBackup().catch((e) => {
    console.error('[backup] falhou:', e);
    process.exit(1);
  });
}
