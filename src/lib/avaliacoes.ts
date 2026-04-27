import { withClient, withTx } from './db';
import { upsertClienteTxFull, digitsOnly } from './clientes';
import { isDiaFechado } from './dias-fechados';
import { validateWhatsappBR } from './format';
import { getJanelasParaData, inJanela, spLocal } from './horarios';
import type { Avaliacao, AvaliacaoStatus, Cliente } from './types';

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
export interface CreateAvaliacaoResult {
  avaliacao: Avaliacao;
  /** Cliente vinculado (se CPF foi informado). */
  cliente: Cliente | null;
  /** true se o cliente foi criado agora pelo agendamento; false se já existia. */
  clienteCriado: boolean;
}

export async function createAvaliacao(input: CreateAvaliacaoInput): Promise<Avaliacao> {
  const r = await createAvaliacaoFull(input);
  return r.avaliacao;
}

export async function createAvaliacaoFull(input: CreateAvaliacaoInput): Promise<CreateAvaliacaoResult> {
  const nome = input.nome.trim();
  if (!nome) throw new Error('Informe o nome.');
  const data = new Date(input.dataHora);
  if (isNaN(data.getTime())) throw new Error('Data/hora inválida.');

  // Antecedência mínima: 1 hora a partir de agora.
  const ONE_HOUR_MS = 60 * 60 * 1000;
  if (data.getTime() < Date.now() + ONE_HOUR_MS) {
    throw new Error('Agende com pelo menos 1 hora de antecedência.');
  }

  // Bloqueia agendamento em dia fechado.
  const sp = spLocal(input.dataHora);
  if (await isDiaFechado(sp.dateStr)) {
    throw new Error('Loja fechada nesse dia. Escolha outra data.');
  }

  // Valida horário dentro das janelas configuradas (override por data,
  // depois por dia da semana, depois padrão).
  const janelas = await getJanelasParaData(sp.dateStr);
  if (janelas.length === 0) {
    throw new Error('Lulu não tem horário disponível nesse dia.');
  }
  if (!inJanela(sp.hh, sp.mm, janelas)) {
    const desc = janelas.map((j) => `${j.start}–${j.end}`).join(' e ');
    throw new Error(`Horário fora do funcionamento (${desc}).`);
  }

  const cpfDigits = input.cpf ? digitsOnly(input.cpf) : '';
  if (input.cpf && cpfDigits.length !== 11) throw new Error('CPF inválido.');
  if (input.qtdPecas !== undefined && input.qtdPecas !== null) {
    if (!Number.isInteger(input.qtdPecas) || input.qtdPecas < 1) {
      throw new Error('Quantidade de peças inválida.');
    }
  }
  const tamanhos = (input.tamanhos ?? []).filter((t) => t && t.trim());

  // Valida WhatsApp se informado
  let whatsappFormatted: string | null = null;
  if (input.whatsapp && input.whatsapp.trim()) {
    const v = validateWhatsappBR(input.whatsapp);
    if (!v.valid) throw new Error(`WhatsApp inválido: ${v.error}`);
    whatsappFormatted = v.formatted ?? input.whatsapp.trim();
  }

  return withTx(async (c) => {
    let clienteId = input.clienteId ?? null;
    let cliente: Cliente | null = null;
    let criado = false;
    if (!clienteId && cpfDigits) {
      const upsert = await upsertClienteTxFull(c, {
        cpf: cpfDigits,
        nome,
        whatsapp: whatsappFormatted ?? undefined,
      });
      cliente = upsert.cliente;
      criado = upsert.criado;
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
        whatsappFormatted,
        data,
        input.qtdPecas ?? null,
        tamanhos,
        input.observacoes ? input.observacoes.trim() || null : null,
      ],
    );
    return {
      avaliacao: rowToAvaliacao(r.rows[0]),
      cliente,
      clienteCriado: criado,
    };
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
