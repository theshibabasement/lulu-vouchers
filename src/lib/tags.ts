import { withClient } from './db';

export type TagCor = 'magenta' | 'cyan' | 'yellow' | 'purple' | 'mint' | 'cheek' | 'ink';

export interface Tag {
  id: number;
  nome: string;
  cor: TagCor;
  criadoEm: string;
}

function rowToTag(r: Record<string, unknown>): Tag {
  return {
    id: Number(r.id),
    nome: r.nome as string,
    cor: r.cor as TagCor,
    criadoEm: (r.criado_em as Date).toISOString(),
  };
}

export async function listTags(): Promise<Tag[]> {
  return withClient(async (c) => {
    const r = await c.query(`SELECT id, nome, cor, criado_em FROM tags ORDER BY nome ASC`);
    return r.rows.map(rowToTag);
  });
}

export async function createTag(nome: string, cor: TagCor = 'magenta'): Promise<Tag> {
  if (!nome.trim()) throw new Error('Nome obrigatório.');
  return withClient(async (c) => {
    const r = await c.query(
      `INSERT INTO tags (nome, cor) VALUES ($1, $2)
       ON CONFLICT (nome) DO UPDATE SET cor = EXCLUDED.cor
       RETURNING id, nome, cor, criado_em`,
      [nome.trim(), cor],
    );
    return rowToTag(r.rows[0]);
  });
}

export async function updateTag(id: number, patch: { nome?: string; cor?: TagCor }): Promise<Tag> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (patch.nome !== undefined) {
    fields.push(`nome = $${i++}`);
    values.push(patch.nome.trim());
  }
  if (patch.cor !== undefined) {
    fields.push(`cor = $${i++}`);
    values.push(patch.cor);
  }
  if (fields.length === 0) {
    return withClient(async (c) => {
      const r = await c.query(`SELECT id, nome, cor, criado_em FROM tags WHERE id = $1`, [id]);
      if (r.rows.length === 0) throw new Error('Tag não encontrada.');
      return rowToTag(r.rows[0]);
    });
  }
  values.push(id);
  return withClient(async (c) => {
    const r = await c.query(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, nome, cor, criado_em`,
      values,
    );
    if (r.rows.length === 0) throw new Error('Tag não encontrada.');
    return rowToTag(r.rows[0]);
  });
}

export async function deleteTag(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(`DELETE FROM tags WHERE id = $1`, [id]);
  });
}

export async function getTagsCliente(clienteId: number): Promise<Tag[]> {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT t.id, t.nome, t.cor, t.criado_em
       FROM tags t
       JOIN cliente_tags ct ON ct.tag_id = t.id
       WHERE ct.cliente_id = $1
       ORDER BY t.nome ASC`,
      [clienteId],
    );
    return r.rows.map(rowToTag);
  });
}

export async function addTagToCliente(clienteId: number, tagId: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `INSERT INTO cliente_tags (cliente_id, tag_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [clienteId, tagId],
    );
  });
}

export async function removeTagFromCliente(clienteId: number, tagId: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `DELETE FROM cliente_tags WHERE cliente_id = $1 AND tag_id = $2`,
      [clienteId, tagId],
    );
  });
}

/** Retorna mapa cliente_id → Tag[] pra uma lista de IDs (1 query). */
export async function getTagsParaClientes(ids: number[]): Promise<Map<number, Tag[]>> {
  const map = new Map<number, Tag[]>();
  if (ids.length === 0) return map;
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT ct.cliente_id, t.id, t.nome, t.cor, t.criado_em
       FROM cliente_tags ct
       JOIN tags t ON t.id = ct.tag_id
       WHERE ct.cliente_id = ANY($1)
       ORDER BY t.nome ASC`,
      [ids],
    );
    for (const row of r.rows) {
      const cid = Number(row.cliente_id);
      const list = map.get(cid) ?? [];
      list.push(rowToTag(row));
      map.set(cid, list);
    }
    return map;
  });
}
