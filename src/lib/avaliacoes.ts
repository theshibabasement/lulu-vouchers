import { withClient, withTx } from './db';
import { upsertClienteTx, digitsOnly } from './clientes';
import type { Avaliacao, AvaliacaoStatus } from './types';

function rowToAvaliacao(r: Record<string, unknown>): Avaliacao {
  return {
    id: Number(r.id),
    clienteId: r.cliente_id ? Number(r.cliente_id) : null,
    nome: r.nome as string,
    cpf: (r.cpf as string | null) ?? null,
    whatsapp: (r.whatsapp as string | null) ?? null,
    dataHora: (r.data_hora as Date).toISOString(),
    qtdPecas: r.qtd_pecas ? Number(r.qtd_pecas) : null,
    tamanhos: (r.tamanhos as string[] | null) ?? [],
    observacoes: (r.observacoes as string | null) ?? null,
    status: r.status as AvaliacaoStatus,
    valeId: (r.vale_id as string | null) ?? null,
    criadoEm: (r.criado_em as Date).toISOString(),
    atualizadoEm: (r.atualizado_em as Date).toISOString(),
  };
}

const COLS = `id, cliente_id, nome, cpf, whatsapp, data_hora, qtd_pecas, tamanhos,
              observacoes, status, vale_id, criado_em, atualizado_em`;

export interface ListAvaliacoesOptions {
  status?: AvaliacaoStatus[];
  desde?: string; // ISO
  ate?: string; // ISO
  clienteId?: number;
}

export async function listAvaliacoes(opts: ListAvaliacoesOptions = {}): Promise<Avaliacao[]> {
  return withClient(async (c) => {
    const where: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (opts.status?.length) {
      where.push(`status = ANY($${i++})`);
      values.push(opts.status);
    }
    if (opts.desde) {
      where.push(`data_hora >= $${i++}`);
      values.push(opts.desde);
    }
    if (opts.ate) {
      where.push(`data_hora <= $${i++}`);
      values.push(opts.ate);
    }
    if (opts.clienteId) {
      where.push(`cliente_id = $${i++}`);
      values.push(opts.clienteId);
    }
    const sql = `SELECT ${COLS} FROM avaliacoes ${
      where.length ? 'WHERE ' + where.join(' AND ') : ''
    } ORDER BY data_hora ASC`;
    const r = await c.query(sql, values);
    return r.rows.map(rowToAvaliacao);
  });
}

export async function getAvaliacao(id: number): Promise<Avaliacao | null> {
  return withClient(async (c) => {
    const r = await c.query(`SELECT ${COLS} FROM avaliacoes WHERE id = $1`, [id]);
    if (r.rows.length === 0) return null;
    return rowToAvaliacao(r.rows[0]);
  });
}

export interface CreateAvaliacaoInput {
  nome: string;
  cpf?: string;
  whatsapp?: string;
  dataHora: string;
  qtdPecas?: number;
  tamanhos?: string[];
  observacoes?: string;
  clienteId?: number; // se vier autenticado pelo portal
}

/**
 * Cria avaliação. Se CPF fornecido, faz UPSERT do cliente e vincula.
 * Se vier `clienteId` (cliente autenticado), usa esse.
 */
export async function createAvaliacao(input: CreateAvaliacaoInput): Promise<Avaliacao> {
  const nome = input.nome.trim();
  if (!nome) throw new Error('Informe o nome.');
  const data = new Date(input.dataHora);
  if (isNaN(data.getTime())) throw new Error('Data/hora inválida.');
  if (data.getTime() < Date.now() - 1000 * 60 * 5) {
    throw new Error('Não dá pra agendar no passado.');
  }
  const cpfDigits = input.cpf ? digitsOnly(input.cpf) : '';
  if (input.cpf && cpfDigits.length !== 11) throw new Error('CPF inválido.');
  if (input.qtdPecas !== undefined && input.qtdPecas !== null) {
    if (!Number.isInteger(input.qtdPecas) || input.qtdPecas < 1) {
      throw new Error('Quantidade de peças inválida.');
    }
  }
  const tamanhos = (input.tamanhos ?? []).filter((t) => t && t.trim());

  return withTx(async (c) => {
    let clienteId = input.clienteId ?? null;
    if (!clienteId && cpfDigits) {
      const cliente = await upsertClienteTx(c, {
        cpf: cpfDigits,
        nome,
        whatsapp: input.whatsapp,
      });
      clienteId = cliente.id;
    }
    const r = await c.query(
      `INSERT INTO avaliacoes (cliente_id, nome, cpf, whatsapp, data_hora, qtd_pecas, tamanhos, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${COLS}`,
      [
        clienteId,
        nome,
        cpfDigits || null,
        input.whatsapp ? input.whatsapp.trim() || null : null,
        data,
        input.qtdPecas ?? null,
        tamanhos,
        input.observacoes ? input.observacoes.trim() || null : null,
      ],
    );
    return rowToAvaliacao(r.rows[0]);
  });
}

export async function updateAvaliacao(
  id: number,
  patch: { status?: AvaliacaoStatus; dataHora?: string; valeId?: string | null; observacoes?: string | null; qtdPecas?: number | null; tamanhos?: string[] },
): Promise<Avaliacao> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (patch.status !== undefined) {
    fields.push(`status = $${i++}`);
    values.push(patch.status);
  }
  if (patch.dataHora !== undefined) {
    fields.push(`data_hora = $${i++}`);
    values.push(new Date(patch.dataHora));
  }
  if (patch.valeId !== undefined) {
    fields.push(`vale_id = $${i++}`);
    values.push(patch.valeId);
  }
  if (patch.observacoes !== undefined) {
    fields.push(`observacoes = $${i++}`);
    values.push(patch.observacoes);
  }
  if (patch.qtdPecas !== undefined) {
    fields.push(`qtd_pecas = $${i++}`);
    values.push(patch.qtdPecas);
  }
  if (patch.tamanhos !== undefined) {
    fields.push(`tamanhos = $${i++}`);
    values.push(patch.tamanhos);
  }
  if (fields.length === 0) {
    const cur = await getAvaliacao(id);
    if (!cur) throw new Error('Avaliação não encontrada.');
    return cur;
  }
  fields.push(`atualizado_em = NOW()`);
  values.push(id);
  return withClient(async (c) => {
    const r = await c.query(
      `UPDATE avaliacoes SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${COLS}`,
      values,
    );
    if (r.rows.length === 0) throw new Error('Avaliação não encontrada.');
    return rowToAvaliacao(r.rows[0]);
  });
}

export async function deleteAvaliacao(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query('DELETE FROM avaliacoes WHERE id = $1', [id]);
  });
}
