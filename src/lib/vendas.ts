import { withClient, withTx } from './db';
import { isValidCPF } from './format';
import { digitsOnly, normalizeInstagram, upsertClienteTx } from './clientes';
import { JANELA_RETIRADA_DIAS, type Venda } from './types';

function rowToVenda(r: Record<string, unknown>): Venda {
  return {
    id: Number(r.id),
    codigo: Number(r.codigo),
    clienteId: r.cliente_id ? Number(r.cliente_id) : null,
    portalToken: (r.portal_token as string | null) ?? null,
    nome: r.nome as string,
    cpf: (r.cpf as string | null) ?? null,
    whatsapp: (r.whatsapp as string | null) ?? null,
    instagram: (r.instagram as string | null) ?? null,
    valor: Number(r.valor),
    status: r.status as Venda['status'],
    observacoes: (r.observacoes as string | null) ?? null,
    prazoRetirada: (r.prazo_retirada as Date).toISOString(),
    retiradaEm: r.retirada_em ? (r.retirada_em as Date).toISOString() : null,
    canceladaEm: r.cancelada_em ? (r.cancelada_em as Date).toISOString() : null,
    criadoEm: (r.criado_em as Date).toISOString(),
    atualizadoEm: (r.atualizado_em as Date).toISOString(),
  };
}

// JOIN com clientes traz o portal_token — usado pra montar o link do portal
// no aviso de retirada por WhatsApp (igual os vales fazem).
const VENDA_COLS = `
  v.id, v.codigo, v.cliente_id, v.nome, v.cpf, v.whatsapp, v.instagram, v.valor, v.status,
  v.observacoes, v.prazo_retirada, v.retirada_em, v.cancelada_em, v.criado_em, v.atualizado_em,
  c.portal_token
`;
const VENDA_FROM = `FROM vendas v LEFT JOIN clientes c ON c.id = v.cliente_id`;

export interface ListVendasOptions {
  /** Inclui vendas canceladas na listagem. */
  includeCanceladas?: boolean;
}

export async function listVendas(opts: ListVendasOptions = {}): Promise<Venda[]> {
  return withClient(async (c) => {
    const where = opts.includeCanceladas ? '' : `WHERE v.status <> 'cancelada'`;
    const res = await c.query(
      `SELECT ${VENDA_COLS} ${VENDA_FROM} ${where} ORDER BY v.criado_em DESC`,
    );
    return res.rows.map(rowToVenda);
  });
}

export async function getVenda(id: number): Promise<Venda | null> {
  return withClient(async (c) => {
    const res = await c.query(`SELECT ${VENDA_COLS} ${VENDA_FROM} WHERE v.id = $1`, [id]);
    if (res.rows.length === 0) return null;
    return rowToVenda(res.rows[0]);
  });
}

/** Pedidos de um cliente (pro portal). Esconde cancelados; aguardando primeiro. */
export async function getVendasByCliente(clienteId: number): Promise<Venda[]> {
  return withClient(async (c) => {
    const res = await c.query(
      `SELECT ${VENDA_COLS} ${VENDA_FROM}
       WHERE v.cliente_id = $1 AND v.status <> 'cancelada'
       ORDER BY (v.status = 'aguardando') DESC, v.criado_em DESC`,
      [clienteId],
    );
    return res.rows.map(rowToVenda);
  });
}

export interface CreateVendaInput {
  nome: string;
  valor: number;
  cpf?: string;
  whatsapp?: string;
  instagram?: string;
  observacoes?: string;
}

/**
 * Registra uma venda online paga, aguardando retirada.
 * Se o CPF for válido, faz upsert do cliente (linkando e salvando o Instagram
 * no cadastro). Sem CPF, grava só o snapshot (nome + contato) — vendas do
 * Instagram nem sempre têm CPF.
 */
export async function createVenda(input: CreateVendaInput): Promise<Venda> {
  const nome = input.nome.trim();
  if (!nome) throw new Error('Informe o nome do cliente.');
  const valor = Number(input.valor);
  if (!(valor > 0)) throw new Error('Informe um valor válido.');

  const cpfDigits = digitsOnly(input.cpf ?? '');
  const temCpf = cpfDigits.length === 11;
  if (input.cpf && input.cpf.trim() && !temCpf) throw new Error('CPF inválido.');
  if (temCpf && !isValidCPF(cpfDigits)) throw new Error('CPF inválido — confere os dígitos.');

  const whatsapp = input.whatsapp?.trim() || null;
  const instagram = normalizeInstagram(input.instagram);

  const now = new Date();
  const prazo = new Date(now.getTime() + JANELA_RETIRADA_DIAS * 24 * 60 * 60 * 1000);

  return withTx(async (c) => {
    let clienteId: number | null = null;
    let portalToken: string | null = null;
    if (temCpf) {
      const cliente = await upsertClienteTx(c, {
        cpf: cpfDigits,
        nome,
        whatsapp,
        instagram,
      });
      clienteId = cliente.id;
      portalToken = cliente.portalToken ?? null;
    }

    const res = await c.query(
      `INSERT INTO vendas
         (cliente_id, nome, cpf, whatsapp, instagram, valor, status, observacoes, prazo_retirada, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6, 'aguardando', $7, $8, $9)
       RETURNING id, codigo, cliente_id, nome, cpf, whatsapp, instagram, valor, status,
                 observacoes, prazo_retirada, retirada_em, cancelada_em, criado_em, atualizado_em`,
      [
        clienteId,
        nome,
        temCpf ? cpfDigits : null,
        whatsapp,
        instagram,
        valor,
        input.observacoes?.trim() || null,
        prazo,
        now,
      ],
    );
    const venda = rowToVenda(res.rows[0]);
    venda.portalToken = portalToken; // RETURNING não faz JOIN — anexa aqui
    return venda;
  });
}

export async function marcarRetirada(id: number): Promise<Venda> {
  await withClient(async (c) => {
    const res = await c.query(
      `UPDATE vendas SET status = 'retirada', retirada_em = NOW(), atualizado_em = NOW()
       WHERE id = $1 AND status = 'aguardando'`,
      [id],
    );
    if (res.rowCount === 0) {
      const cur = await getVenda(id);
      if (!cur) throw new Error('Venda não encontrada.');
      if (cur.status === 'retirada') throw new Error('Venda já foi retirada.');
      throw new Error('Venda cancelada — não pode ser retirada.');
    }
  });
  return (await getVenda(id))!;
}

export async function cancelarVenda(id: number): Promise<Venda> {
  await withClient(async (c) => {
    const res = await c.query(
      `UPDATE vendas SET status = 'cancelada', cancelada_em = NOW(), atualizado_em = NOW()
       WHERE id = $1 AND status <> 'cancelada'`,
      [id],
    );
    if (res.rowCount === 0) {
      const cur = await getVenda(id);
      if (!cur) throw new Error('Venda não encontrada.');
      throw new Error('Venda já está cancelada.');
    }
  });
  return (await getVenda(id))!;
}
