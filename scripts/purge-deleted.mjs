/**
 * Hard delete de vales que estão em soft delete (deletado_em IS NOT NULL).
 * Roda dentro do container:
 *   docker exec lulu-app node scripts/purge-deleted.mjs            # dry-run, só lista
 *   docker exec lulu-app node scripts/purge-deleted.mjs --apply    # apaga de verdade
 *
 * Apaga em CASCADE as transações vinculadas (FK ON DELETE CASCADE).
 */
import pg from 'pg';

const { Client } = pg;
const APPLY = process.argv.includes('--apply');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const list = await client.query(
      `SELECT id, nome, cpf, deletado_em FROM vales WHERE deletado_em IS NOT NULL ORDER BY deletado_em ASC`,
    );
    console.log(`[purge] ${list.rowCount} vale(s) em soft delete:`);
    for (const r of list.rows) {
      console.log(`  - ${r.id} · ${r.nome} (${r.cpf}) · deletado em ${r.deletado_em.toISOString()}`);
    }
    if (!APPLY) {
      console.log('\n[purge] DRY-RUN — nada apagado. Rode com --apply para confirmar.');
      return;
    }
    const del = await client.query(
      `DELETE FROM vales WHERE deletado_em IS NOT NULL RETURNING id`,
    );
    console.log(`\n[purge] ${del.rowCount} vale(s) apagados definitivamente.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[purge] falhou:', e);
  process.exit(1);
});
