import { withClient, withTx } from './db';
import { appendVale, appendTransacao, readFallbackVales } from './fallback';
import { upsertClienteTx, digitsOnly } from './clientes';
import type { Vale, Transacao } from './types';

function rowToVale(r: Record<string, unknown>): Vale {
  return {
    id: r.id as string,
    clienteId: r.cliente_id ? Number(r.cliente_id) : null,
    nome: r.nome as string,
    cpf: r.cpf as string,
    valorOriginal: Number(r.valor_original),
    saldo: Number(r.saldo),
    status: r.status as Vale['status'],
    criadoEm: (r.criado_em as Date).toISOString(),
    deletadoEm: r.deletado_em ? (r.deletado_em as Date).toISOString() : null,
    transacoes: [],
  };
}

function txRow(r: Record<string, unknown>): Transacao {
  return {
    tipo: r.tipo as Transacao['tipo'],
    valor: Number(r.valor),
    data: (r.data as Date).toISOString(),
    obs: (r.obs as string | null) ?? undefined,
  };
}

function generateCode(existing: Set<string>): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  for (let i = 0; i < 100; i++) {
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const code = `LB${yy}${mm}${dd}${rand}`;
    if (!existing.has(code)) return code;
  }
  throw new Error('Não foi possível gerar código único');
}

const VALE_COLS = `id, cliente_id, nome, cpf, valor_original, saldo, status, criado_em, deletado_em`;

export interface ListValesOptions {
  includeDeleted?: boolean;
}

export async function listVales(opts: ListValesOptions = {}): Promise<Vale[]> {
  try {
    return await withClient(async (c) => {
      const where = opts.includeDeleted ? '' : 'WHERE deletado_em IS NULL';
      const vRes = await c.query(
        `SELECT ${VALE_COLS} FROM vales ${where} ORDER BY criado_em DESC`,
      );
      const vales = vRes.rows.map(rowToVale);
      if (vales.length === 0) return vales;
      const ids = vales.map((v) => v.id);
      const txRes = await c.query(
        'SELECT vale_id, tipo, valor, data, obs FROM transacoes WHERE vale_id = ANY($1) ORDER BY data ASC',
        [ids],
      );
      const byVale = new Map<string, Transacao[]>();
      for (const r of txRes.rows) {
        const list = byVale.get(r.vale_id as string) ?? [];
        list.push(txRow(r));
        byVale.set(r.vale_id as string, list);
      }
      for (const v of vales) v.transacoes = byVale.get(v.id) ?? [];
      return vales;
    });
  } catch (e) {
    console.warn('[vales] listVales: usando fallback', (e as Error).message);
    return readFallbackVales();
  }
}

export async function getVale(id: string): Promise<Vale | null> {
  try {
    return await withClient(async (c) => {
      const vRes = await c.query(
        `SELECT ${VALE_COLS} FROM vales WHERE id = $1`,
        [id],
      );
      if (vRes.rows.length === 0) return null;
      const v = rowToVale(vRes.rows[0]);
      const txRes = await c.query(
        'SELECT tipo, valor, data, obs FROM transacoes WHERE vale_id = $1 ORDER BY data ASC',
        [id],
      );
      v.transacoes = txRes.rows.map(txRow);
      return v;
    });
  } catch (e) {
    console.warn('[vales] getVale: usando fallback', (e as Error).message);
    const all = await readFallbackVales();
    return all.find((v) => v.id === id) ?? null;
  }
}

export interface CreateValeInput {
  nome: string;
  cpf: string;
  valor: number;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  observacoes?: string;
}

export async function createVale(input: CreateValeInput): Promise<Vale> {
  const { nome, cpf, valor } = input;
  if (!nome.trim()) throw new Error('Informe o nome do cliente.');
  const cpfDigits = digitsOnly(cpf);
  if (cpfDigits.length !== 11) throw new Error('CPF inválido.');
  if (!(valor > 0)) throw new Error('Informe um valor válido.');

  const now = new Date();
  const nowIso = now.toISOString();

  const vale = await withTx(async (c) => {
    const cliente = await upsertClienteTx(c, {
      cpf: cpfDigits,
      nome: nome.trim(),
      whatsapp: input.whatsapp,
      email: input.email,
      endereco: input.endereco,
      cidade: input.cidade,
      observacoes: input.observacoes,
    });

    const existingRes = await c.query<{ id: string }>('SELECT id FROM vales');
    const existing = new Set(existingRes.rows.map((r) => r.id));
    const code = generateCode(existing);

    await c.query(
      `INSERT INTO vales (id, cliente_id, nome, cpf, valor_original, saldo, status, criado_em)
       VALUES ($1,$2,$3,$4,$5,$5,'ativo',$6)`,
      [code, cliente.id, nome.trim(), cpf.trim(), valor, now],
    );
    await c.query(
      `INSERT INTO transacoes (vale_id, tipo, valor, data, obs)
       VALUES ($1,'criacao',$2,$3,$4)`,
      [code, valor, now, 'Vale emitido'],
    );

    return {
      id: code,
      clienteId: cliente.id,
      nome: nome.trim(),
      cpf: cpf.trim(),
      valorOriginal: valor,
      saldo: valor,
      status: 'ativo',
      criadoEm: nowIso,
      deletadoEm: null,
      transacoes: [{ tipo: 'criacao', valor, data: nowIso, obs: 'Vale emitido' }],
    } satisfies Vale;
  });

  await appendVale(vale);
  await appendTransacao({
    valeId: vale.id,
    tipo: 'criacao',
    valor: vale.valorOriginal,
    data: vale.criadoEm,
    obs: 'Vale emitido',
  });

  return vale;
}

export async function abaterVale(
  id: string,
  valor: number,
  obs?: string,
): Promise<Vale> {
  if (!(valor > 0)) throw new Error('Valor inválido.');

  const vale = await withTx(async (c) => {
    const cur = await c.query<{ saldo: string; status: string; deletado_em: Date | null }>(
      'SELECT saldo, status, deletado_em FROM vales WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (cur.rows.length === 0) throw new Error('Vale não encontrado.');
    if (cur.rows[0].deletado_em) throw new Error('Vale excluído. Restaure antes de abater.');
    const saldo = Number(cur.rows[0].saldo);
    if (cur.rows[0].status === 'esgotado') throw new Error('Vale já esgotado.');
    if (valor > saldo) throw new Error(`Valor maior que o saldo (R$ ${saldo.toFixed(2)}).`);

    const novoSaldo = Math.round((saldo - valor) * 100) / 100;
    const novoStatus = novoSaldo === 0 ? 'esgotado' : 'ativo';
    const data = new Date();

    await c.query(
      'UPDATE vales SET saldo = $1, status = $2 WHERE id = $3',
      [novoSaldo, novoStatus, id],
    );
    await c.query(
      `INSERT INTO transacoes (vale_id, tipo, valor, data, obs)
       VALUES ($1,'abatimento',$2,$3,$4)`,
      [id, valor, data, obs ?? null],
    );

    const vRes = await c.query(
      `SELECT ${VALE_COLS} FROM vales WHERE id = $1`,
      [id],
    );
    const txRes = await c.query(
      'SELECT tipo, valor, data, obs FROM transacoes WHERE vale_id = $1 ORDER BY data ASC',
      [id],
    );
    const v = rowToVale(vRes.rows[0]);
    v.transacoes = txRes.rows.map(txRow);
    return v;
  });

  await appendTransacao({
    valeId: vale.id,
    tipo: 'abatimento',
    valor,
    data: new Date().toISOString(),
    obs,
  });

  return vale;
}

export async function softDeleteVale(id: string): Promise<void> {
  await withClient(async (c) => {
    const res = await c.query(
      `UPDATE vales SET deletado_em = NOW()
       WHERE id = $1 AND deletado_em IS NULL`,
      [id],
    );
    if (res.rowCount === 0) {
      const exists = await c.query('SELECT 1 FROM vales WHERE id = $1', [id]);
      if (exists.rows.length === 0) throw new Error('Vale não encontrado.');
      throw new Error('Vale já está excluído.');
    }
  });
}

export async function restoreVale(id: string): Promise<void> {
  await withClient(async (c) => {
    const res = await c.query(
      `UPDATE vales SET deletado_em = NULL
       WHERE id = $1 AND deletado_em IS NOT NULL`,
      [id],
    );
    if (res.rowCount === 0) throw new Error('Vale não está excluído.');
  });
}
