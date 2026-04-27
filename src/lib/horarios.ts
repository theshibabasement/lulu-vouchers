import { withClient } from './db';

export interface Janela {
  start: string; // 'HH:mm'
  end: string;
}

export type ConfigTipo = 'padrao' | 'semanal' | 'data';

export interface ConfigHorario {
  id: number;
  tipo: ConfigTipo;
  diaSemana: number | null; // 0=domingo..6=sábado
  data: string | null;       // 'YYYY-MM-DD'
  janelas: Janela[];
  atualizadoEm: string;
}

const SP_OFFSET_MS = -3 * 60 * 60 * 1000; // BR sem DST

const DEFAULT_JANELAS: Janela[] = [
  { start: '09:00', end: '12:00' },
  { start: '13:30', end: '18:00' },
];

function rowToConfig(r: Record<string, unknown>): ConfigHorario {
  return {
    id: Number(r.id),
    tipo: r.tipo as ConfigTipo,
    diaSemana: r.dia_semana === null || r.dia_semana === undefined ? null : Number(r.dia_semana),
    data: r.data ? formatDateOnly(r.data as Date) : null,
    janelas: (r.janelas as Janela[]) ?? [],
    atualizadoEm: (r.atualizado_em as Date).toISOString(),
  };
}

function formatDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Converte ISO UTC → componentes locais SP (UTC-3 fixo). */
export function spLocal(iso: string) {
  const utc = new Date(iso);
  const sp = new Date(utc.getTime() + SP_OFFSET_MS);
  return {
    hh: sp.getUTCHours(),
    mm: sp.getUTCMinutes(),
    weekday: sp.getUTCDay(),
    dateStr: `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, '0')}-${String(sp.getUTCDate()).padStart(2, '0')}`,
    timestamp: utc.getTime(),
  };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function inJanela(hh: number, mm: number, janelas: Janela[]): boolean {
  const total = hh * 60 + mm;
  return janelas.some((j) => total >= timeToMinutes(j.start) && total <= timeToMinutes(j.end));
}

export function validateJanelas(j: unknown): Janela[] {
  if (!Array.isArray(j)) throw new Error('Janelas inválidas.');
  const re = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return j.map((item, idx) => {
    if (!item || typeof item !== 'object') throw new Error(`Janela ${idx + 1} inválida.`);
    const obj = item as { start?: unknown; end?: unknown };
    const start = String(obj.start ?? '');
    const end = String(obj.end ?? '');
    if (!re.test(start) || !re.test(end)) {
      throw new Error(`Janela ${idx + 1}: formato inválido (use HH:mm).`);
    }
    if (timeToMinutes(start) >= timeToMinutes(end)) {
      throw new Error(`Janela ${idx + 1}: início precisa ser antes do fim.`);
    }
    return { start, end };
  });
}

// ============================================================
// Queries
// ============================================================

const COLS = `id, tipo, dia_semana, data, janelas, atualizado_em`;

export async function listConfigsHorarios(): Promise<ConfigHorario[]> {
  return withClient(async (c) => {
    const r = await c.query(
      `SELECT ${COLS} FROM config_horarios
       ORDER BY
         CASE tipo WHEN 'padrao' THEN 0 WHEN 'semanal' THEN 1 ELSE 2 END,
         dia_semana NULLS FIRST,
         data NULLS FIRST`,
    );
    return r.rows.map(rowToConfig);
  });
}

/**
 * Resolve as janelas válidas pra uma data específica (em SP local).
 * Hierarquia: data específica > semanal > padrão > DEFAULT_JANELAS.
 */
export async function getJanelasParaData(dateStr: string): Promise<Janela[]> {
  return withClient(async (c) => {
    // Tenta override por data
    const r1 = await c.query(
      `SELECT janelas FROM config_horarios WHERE tipo = 'data' AND data = $1`,
      [dateStr],
    );
    if (r1.rows.length > 0) return r1.rows[0].janelas as Janela[];

    // Tenta override por dia da semana
    const d = new Date(dateStr + 'T12:00:00Z'); // meio-dia UTC pra evitar TZ surprise
    const weekday = d.getUTCDay();
    const r2 = await c.query(
      `SELECT janelas FROM config_horarios WHERE tipo = 'semanal' AND dia_semana = $1`,
      [weekday],
    );
    if (r2.rows.length > 0) return r2.rows[0].janelas as Janela[];

    // Padrão
    const r3 = await c.query(`SELECT janelas FROM config_horarios WHERE tipo = 'padrao'`);
    if (r3.rows.length > 0) return r3.rows[0].janelas as Janela[];

    return DEFAULT_JANELAS;
  });
}

export async function setPadrao(janelas: Janela[]): Promise<ConfigHorario> {
  return withClient(async (c) => {
    const exist = await c.query(`SELECT id FROM config_horarios WHERE tipo = 'padrao'`);
    if (exist.rows.length > 0) {
      const r = await c.query(
        `UPDATE config_horarios SET janelas = $1::jsonb, atualizado_em = NOW()
         WHERE tipo = 'padrao' RETURNING ${COLS}`,
        [JSON.stringify(janelas)],
      );
      return rowToConfig(r.rows[0]);
    }
    const r = await c.query(
      `INSERT INTO config_horarios (tipo, janelas) VALUES ('padrao', $1::jsonb) RETURNING ${COLS}`,
      [JSON.stringify(janelas)],
    );
    return rowToConfig(r.rows[0]);
  });
}

export async function setSemanal(diaSemana: number, janelas: Janela[]): Promise<ConfigHorario> {
  if (diaSemana < 0 || diaSemana > 6) throw new Error('Dia da semana inválido.');
  return withClient(async (c) => {
    // Upsert manual por causa do índice parcial
    const exist = await c.query(
      `SELECT id FROM config_horarios WHERE tipo = 'semanal' AND dia_semana = $1`,
      [diaSemana],
    );
    if (exist.rows.length > 0) {
      const r = await c.query(
        `UPDATE config_horarios SET janelas = $1::jsonb, atualizado_em = NOW()
         WHERE tipo = 'semanal' AND dia_semana = $2
         RETURNING ${COLS}`,
        [JSON.stringify(janelas), diaSemana],
      );
      return rowToConfig(r.rows[0]);
    }
    const r = await c.query(
      `INSERT INTO config_horarios (tipo, dia_semana, janelas)
       VALUES ('semanal', $1, $2::jsonb) RETURNING ${COLS}`,
      [diaSemana, JSON.stringify(janelas)],
    );
    return rowToConfig(r.rows[0]);
  });
}

export async function setData(data: string, janelas: Janela[]): Promise<ConfigHorario> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error('Data inválida (YYYY-MM-DD).');
  return withClient(async (c) => {
    const exist = await c.query(
      `SELECT id FROM config_horarios WHERE tipo = 'data' AND data = $1`,
      [data],
    );
    if (exist.rows.length > 0) {
      const r = await c.query(
        `UPDATE config_horarios SET janelas = $1::jsonb, atualizado_em = NOW()
         WHERE tipo = 'data' AND data = $2
         RETURNING ${COLS}`,
        [JSON.stringify(janelas), data],
      );
      return rowToConfig(r.rows[0]);
    }
    const r = await c.query(
      `INSERT INTO config_horarios (tipo, data, janelas)
       VALUES ('data', $1::date, $2::jsonb) RETURNING ${COLS}`,
      [data, JSON.stringify(janelas)],
    );
    return rowToConfig(r.rows[0]);
  });
}

export async function deleteSemanal(diaSemana: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `DELETE FROM config_horarios WHERE tipo = 'semanal' AND dia_semana = $1`,
      [diaSemana],
    );
  });
}

export async function deleteData(data: string): Promise<void> {
  await withClient(async (c) => {
    await c.query(`DELETE FROM config_horarios WHERE tipo = 'data' AND data = $1`, [data]);
  });
}
