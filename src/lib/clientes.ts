import { withClient, withTx } from './db';
import type { Cliente, ClienteComAgregados, ClienteAgregados, Vale, Transacao } from './types';
import type { PoolClient } from 'pg';

function rowToCliente(r: Record<string, unknown>): Cliente {
  return {
    id: Number(r.id),
    cpf: r.cpf as string,
    nome: r.nome as string,
    whatsapp: (r.whatsapp as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    endereco: (r.endereco as string | null) ?? null,
    cidade: (r.cidade as string | null) ?? null,
    observacoes: (r.observacoes as string | null) ?? null,
    criadoEm: (r.criado_em as Date).toISOString(),
    atualizadoEm: (r.atualizado_em as Date).toISOString(),
  };
}

const SELECT_COLS = `
  id, cpf, nome, whatsapp, email, endereco, cidade, observacoes,
  criado_em, atualizado_em
`;

export async function listClientesComAgregados(): Promise<ClienteComAgregados[]> {
  return withClient(async (c) => {
    const res = await c.query(`
      SELECT
        c.id, c.cpf, c.nome, c.whatsapp, c.email, c.endereco, c.cidade, c.observacoes,
        c.criado_em, c.atualizado_em,
        COALESCE(SUM(v.valor_original) FILTER (WHERE v.deletado_em IS NULL), 0) AS total_emitido,
        COALESCE(SUM(v.valor_original - v.saldo) FILTER (WHERE v.deletado_em IS NULL), 0) AS total_abatido,
        COALESCE(SUM(v.saldo) FILTER (WHERE v.deletado_em IS NULL), 0) AS saldo_total,
        COUNT(v.id) FILTER (WHERE v.deletado_em IS NULL) AS qtd_vales,
        COUNT(v.id) FILTER (WHERE v.deletado_em IS NULL AND v.status = 'ativo') AS qtd_ativos,
        MAX(v.criado_em) FILTER (WHERE v.deletado_em IS NULL) AS ultima_compra
      FROM clientes c
      LEFT JOIN vales v ON v.cliente_id = c.id
      GROUP BY c.id
      ORDER BY c.nome ASC
    `);
    return res.rows.map((r) => ({
      ...rowToCliente(r),
      agregados: {
        totalEmitido: Number(r.total_emitido),
        totalAbatido: Number(r.total_abatido),
        saldoTotal: Number(r.saldo_total),
        qtdVales: Number(r.qtd_vales),
        qtdAtivos: Number(r.qtd_ativos),
        ultimaCompra: r.ultima_compra ? (r.ultima_compra as Date).toISOString() : null,
      } satisfies ClienteAgregados,
    }));
  });
}

export async function getCliente(id: number): Promise<Cliente | null> {
  return withClient(async (c) => {
    const res = await c.query(
      `SELECT ${SELECT_COLS} FROM clientes WHERE id = $1`,
      [id],
    );
    if (res.rows.length === 0) return null;
    return rowToCliente(res.rows[0]);
  });
}

export async function getClienteByCpf(cpf: string): Promise<Cliente | null> {
  return withClient(async (c) => {
    const res = await c.query(
      `SELECT ${SELECT_COLS} FROM clientes WHERE cpf = $1`,
      [cpf],
    );
    if (res.rows.length === 0) return null;
    return rowToCliente(res.rows[0]);
  });
}

export async function getClienteVales(clienteId: number): Promise<Vale[]> {
  return withClient(async (c) => {
    const vRes = await c.query(
      `SELECT id, cliente_id, nome, cpf, valor_original, saldo, status, criado_em, deletado_em
       FROM vales
       WHERE cliente_id = $1 AND deletado_em IS NULL
       ORDER BY criado_em DESC`,
      [clienteId],
    );
    if (vRes.rows.length === 0) return [];
    const ids = vRes.rows.map((r) => r.id as string);
    const txRes = await c.query(
      `SELECT vale_id, tipo, valor, data, obs
       FROM transacoes WHERE vale_id = ANY($1) ORDER BY data ASC`,
      [ids],
    );
    const byVale = new Map<string, Transacao[]>();
    for (const r of txRes.rows) {
      const list = byVale.get(r.vale_id as string) ?? [];
      list.push({
        tipo: r.tipo as Transacao['tipo'],
        valor: Number(r.valor),
        data: (r.data as Date).toISOString(),
        obs: (r.obs as string | null) ?? undefined,
      });
      byVale.set(r.vale_id as string, list);
    }
    return vRes.rows.map((r) => ({
      id: r.id as string,
      clienteId: r.cliente_id ? Number(r.cliente_id) : null,
      nome: r.nome as string,
      cpf: r.cpf as string,
      valorOriginal: Number(r.valor_original),
      saldo: Number(r.saldo),
      status: r.status as Vale['status'],
      criadoEm: (r.criado_em as Date).toISOString(),
      deletadoEm: r.deletado_em ? (r.deletado_em as Date).toISOString() : null,
      transacoes: byVale.get(r.id as string) ?? [],
    } satisfies Vale));
  });
}

export interface UpsertClienteInput {
  cpf: string;
  nome: string;
  whatsapp?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  observacoes?: string | null;
}

function clean(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  return s ? s : null;
}

export function digitsOnly(v: string): string {
  return v.replace(/\D/g, '');
}

/**
 * UPSERT por CPF. Se cliente existe, atualiza apenas campos não-nulos
 * e mantém os já preenchidos (nunca sobrescreve com null).
 */
export async function upsertClienteTx(
  client: PoolClient,
  input: UpsertClienteInput,
): Promise<Cliente> {
  const cpf = digitsOnly(input.cpf);
  if (cpf.length !== 11) throw new Error('CPF inválido.');
  if (!input.nome.trim()) throw new Error('Nome obrigatório.');

  const res = await client.query(
    `
    INSERT INTO clientes (cpf, nome, whatsapp, email, endereco, cidade, observacoes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (cpf) DO UPDATE SET
      nome          = EXCLUDED.nome,
      whatsapp      = COALESCE(EXCLUDED.whatsapp,    clientes.whatsapp),
      email         = COALESCE(EXCLUDED.email,       clientes.email),
      endereco      = COALESCE(EXCLUDED.endereco,    clientes.endereco),
      cidade        = COALESCE(EXCLUDED.cidade,      clientes.cidade),
      observacoes   = COALESCE(EXCLUDED.observacoes, clientes.observacoes),
      atualizado_em = NOW()
    RETURNING ${SELECT_COLS}
    `,
    [
      cpf,
      input.nome.trim(),
      clean(input.whatsapp),
      clean(input.email),
      clean(input.endereco),
      clean(input.cidade),
      clean(input.observacoes),
    ],
  );
  return rowToCliente(res.rows[0]);
}

export async function upsertCliente(input: UpsertClienteInput): Promise<Cliente> {
  return withTx((c) => upsertClienteTx(c, input));
}

export interface UpdateClienteInput {
  nome?: string;
  whatsapp?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  observacoes?: string | null;
}

export async function updateCliente(
  id: number,
  patch: UpdateClienteInput,
): Promise<Cliente> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  function set<K extends keyof UpdateClienteInput>(col: string, key: K, transform?: (v: NonNullable<UpdateClienteInput[K]>) => unknown) {
    const val = patch[key];
    if (val === undefined) return;
    fields.push(`${col} = $${i++}`);
    if (val === null) values.push(null);
    else values.push(transform ? transform(val as NonNullable<UpdateClienteInput[K]>) : val);
  }

  set('nome', 'nome', (v) => (v as string).trim());
  set('whatsapp', 'whatsapp', (v) => clean(v as string));
  set('email', 'email', (v) => clean(v as string));
  set('endereco', 'endereco', (v) => clean(v as string));
  set('cidade', 'cidade', (v) => clean(v as string));
  set('observacoes', 'observacoes', (v) => clean(v as string));

  if (fields.length === 0) {
    const cur = await getCliente(id);
    if (!cur) throw new Error('Cliente não encontrado.');
    return cur;
  }

  fields.push(`atualizado_em = NOW()`);
  values.push(id);

  return withClient(async (c) => {
    const res = await c.query(
      `UPDATE clientes SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${SELECT_COLS}`,
      values,
    );
    if (res.rows.length === 0) throw new Error('Cliente não encontrado.');
    return rowToCliente(res.rows[0]);
  });
}
