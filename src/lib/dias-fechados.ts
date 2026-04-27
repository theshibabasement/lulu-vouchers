import { withClient } from './db';

export interface DiaFechado {
  data: string; // YYYY-MM-DD
  motivo: string | null;
  criadoEm: string;
}

function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function rowToDia(r: Record<string, unknown>): DiaFechado {
  return {
    data: dayKey(r.data as Date),
    motivo: (r.motivo as string | null) ?? null,
    criadoEm: (r.criado_em as Date).toISOString(),
  };
}

export async function listDiasFechados(): Promise<DiaFechado[]> {
  return withClient(async (c) => {
    const r = await c.query(`SELECT data, motivo, criado_em FROM dias_fechados ORDER BY data ASC`);
    return r.rows.map(rowToDia);
  });
}

export async function listDiasFechadosFuturos(): Promise<DiaFechado[]> {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT data, motivo, criado_em
       FROM dias_fechados
       WHERE data >= CURRENT_DATE
       ORDER BY data ASC`,
    );
    return r.rows.map(rowToDia);
  });
}

export async function isDiaFechado(isoDate: string): Promise<boolean> {
  // isoDate em YYYY-MM-DD
  return withClient(async (c) => {
    const r = await c.query<{ qtd: number }>(
      `SELECT COUNT(*)::int AS qtd FROM dias_fechados WHERE data = $1::date`,
      [isoDate],
    );
    return Number(r.rows[0].qtd) > 0;
  });
}

export async function addDiaFechado(isoDate: string, motivo?: string): Promise<DiaFechado> {
  return withClient(async (c) => {
    const r = await c.query(
      `INSERT INTO dias_fechados (data, motivo) VALUES ($1::date, $2)
       ON CONFLICT (data) DO UPDATE SET motivo = EXCLUDED.motivo
       RETURNING data, motivo, criado_em`,
      [isoDate, motivo?.trim() || null],
    );
    return rowToDia(r.rows[0]);
  });
}

export async function removeDiaFechado(isoDate: string): Promise<void> {
  await withClient(async (c) => {
    await c.query(`DELETE FROM dias_fechados WHERE data = $1::date`, [isoDate]);
  });
}
