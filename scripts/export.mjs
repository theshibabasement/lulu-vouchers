/**
 * Export de dados — roda dentro do container:
 *   docker exec lulu-app node scripts/export.mjs
 *
 * Gera /data/exports/vales-YYYYMMDD-HHMM.{json,csv} e transacoes-...csv.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

const DATA_DIR = process.env.DATA_DIR || '/data';
const OUT_DIR = path.join(DATA_DIR, 'exports');

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : String(v);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(';')];
  for (const r of rows) lines.push(headers.map((h) => csvCell(r[h])).join(';'));
  return lines.join('\n');
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  await fs.mkdir(OUT_DIR, { recursive: true });

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const valesRes = await client.query(
      `SELECT id, cliente_id, nome, cpf, valor_original, saldo, status,
              criado_em, deletado_em
       FROM vales ORDER BY criado_em DESC`,
    );
    const txRes = await client.query(
      `SELECT t.id, t.vale_id, t.tipo, t.valor, t.data, t.obs
       FROM transacoes t ORDER BY t.data ASC`,
    );
    const clientesRes = await client.query(
      `SELECT id, cpf, nome, whatsapp, email, endereco, cidade, observacoes,
              criado_em, atualizado_em
       FROM clientes ORDER BY nome ASC`,
    );

    const tag = stamp();
    const valesJson = path.join(OUT_DIR, `vales-${tag}.json`);
    const valesCsv = path.join(OUT_DIR, `vales-${tag}.csv`);
    const txCsv = path.join(OUT_DIR, `transacoes-${tag}.csv`);
    const clientesCsv = path.join(OUT_DIR, `clientes-${tag}.csv`);

    const txByVale = new Map();
    for (const t of txRes.rows) {
      const list = txByVale.get(t.vale_id) ?? [];
      list.push(t);
      txByVale.set(t.vale_id, list);
    }

    const valesEnriched = valesRes.rows.map((v) => ({
      ...v,
      transacoes: txByVale.get(v.id) ?? [],
    }));

    await fs.writeFile(valesJson, JSON.stringify(valesEnriched, null, 2), 'utf8');
    await fs.writeFile(valesCsv, toCsv(valesRes.rows), 'utf8');
    await fs.writeFile(txCsv, toCsv(txRes.rows), 'utf8');
    await fs.writeFile(clientesCsv, toCsv(clientesRes.rows), 'utf8');

    console.log('[export] arquivos gravados em', OUT_DIR);
    console.log('  -', valesJson);
    console.log('  -', valesCsv);
    console.log('  -', txCsv);
    console.log('  -', clientesCsv);
    console.log(
      `[export] vales: ${valesRes.rowCount} | transações: ${txRes.rowCount} | clientes: ${clientesRes.rowCount}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[export] falhou:', e);
  process.exit(1);
});
