/**
 * Bootstrap do admin "dona" — garante que sempre exista pelo menos uma
 * dona ativa. Usa AUTH_USER + AUTH_PASSWORD do .env.
 *
 * Hash da senha é gerado pelo Postgres via pgcrypto (`crypt(senha, gen_salt('bf', 10))`),
 * que produz hash bcrypt $2a$ — compatível com `bcryptjs.compare()` em runtime.
 *
 * Roda no entrypoint depois do init-db.mjs.
 */
import pg from 'pg';

const { Client } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  const user = process.env.AUTH_USER;
  const pass = process.env.AUTH_PASSWORD;
  if (!url) {
    console.warn('[bootstrap-admin] DATABASE_URL não definida, skip.');
    return;
  }
  if (!user || !pass) {
    console.warn('[bootstrap-admin] AUTH_USER/AUTH_PASSWORD não definidos, skip.');
    return;
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT COUNT(*)::int AS qtd FROM admins WHERE perfil = 'dona' AND ativo = true`,
    );
    const qtd = Number(res.rows[0].qtd);
    if (qtd > 0) {
      console.log(`[bootstrap-admin] já existe ${qtd} dona(s) ativa(s), skip.`);
      return;
    }

    await client.query(
      `INSERT INTO admins (username, nome, senha_hash, perfil, ativo)
       VALUES ($1, $2, crypt($3, gen_salt('bf', 10)), 'dona', true)
       ON CONFLICT (username) DO UPDATE SET
         senha_hash = crypt($3, gen_salt('bf', 10)),
         perfil = 'dona',
         ativo = true,
         atualizado_em = NOW()`,
      [user, 'Administradora', pass],
    );
    console.log(`[bootstrap-admin] dona "${user}" criada/atualizada.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[bootstrap-admin] falhou:', e);
  process.exit(0); // não bloqueia entrypoint
});
