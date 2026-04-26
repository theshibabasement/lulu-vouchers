import { withClient, withTx } from './db';
import { appendVale, appendTransacao, readFallbackVales } from './fallback';
import type { Vale, Transacao } from './types';

function rowToVale(r: Record<string, unknown>): Vale {
  return {
    id: r.id as string,
    nome: r.nome as string,
    cpf: r.cpf as string,
    valorOriginal: Number(r.valor_original),
    saldo: Number(r.saldo),
    status: r.status as Vale['status'],
    criadoEm: (r.criado_em as Date).toISOString(),
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

export async function listVales(): Promise<Vale[]> {
  try {
    return await withClient(async (c) => {
      const vRes = await c.query(
        'SELECT id, nome, cpf, valor_original, saldo, status, criado_em FROM vales ORDER BY criado_em DESC',
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
        'SELECT id, nome, cpf, valor_original, saldo, status, criado_em FROM vales WHERE id = $1',
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
}

export async function createVale(input: CreateValeInput): Promise<Vale> {
  const { nome, cpf, valor } = input;
  if (!nome.trim()) throw new Error('Informe o nome do cliente.');
  if (cpf.replace(/\D/g, '').length !== 11) throw new Error('CPF inválido.');
  if (!(valor > 0)) throw new Error('Informe um valor válido.');

  const now = new Date();
  const nowIso = now.toISOString();

  const vale = await withTx(async (c) => {
    const existingRes = await c.query<{ id: string }>('SELECT id FROM vales');
    const existing = new Set(existingRes.rows.map((r) => r.id));
    const code = generateCode(existing);

    await c.query(
      `INSERT INTO vales (id, nome, cpf, valor_original, saldo, status, criado_em)
       VALUES ($1,$2,$3,$4,$4,'ativo',$5)`,
      [code, nome.trim(), cpf.trim(), valor, now],
    );
    await c.query(
      `INSERT INTO transacoes (vale_id, tipo, valor, data, obs)
       VALUES ($1,'criacao',$2,$3,$4)`,
      [code, valor, now, 'Vale emitido'],
    );

    return {
      id: code,
      nome: nome.trim(),
      cpf: cpf.trim(),
      valorOriginal: valor,
      saldo: valor,
      status: 'ativo',
      criadoEm: nowIso,
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
    const cur = await c.query<{ saldo: string; status: string }>(
      'SELECT saldo, status FROM vales WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (cur.rows.length === 0) throw new Error('Vale não encontrado.');
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
      'SELECT id, nome, cpf, valor_original, saldo, status, criado_em FROM vales WHERE id = $1',
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
