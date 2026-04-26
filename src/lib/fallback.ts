import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Vale, Transacao } from './types';

const DATA_DIR = process.env.DATA_DIR || '/data';
const VALES_FILE = path.join(DATA_DIR, 'vales.jsonl');
const TX_FILE = path.join(DATA_DIR, 'transacoes.jsonl');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function appendVale(v: Vale): Promise<void> {
  try {
    await ensureDir();
    await fs.appendFile(VALES_FILE, JSON.stringify(v) + '\n', 'utf8');
  } catch (e) {
    console.warn('[fallback] appendVale falhou', (e as Error).message);
  }
}

export async function appendTransacao(t: Transacao & { valeId: string }): Promise<void> {
  try {
    await ensureDir();
    await fs.appendFile(TX_FILE, JSON.stringify(t) + '\n', 'utf8');
  } catch (e) {
    console.warn('[fallback] appendTx falhou', (e as Error).message);
  }
}

async function readJsonl<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return raw
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as T);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

/** Lê o JSONL e devolve a versão mais recente de cada vale (último registro de cada id). */
export async function readFallbackVales(): Promise<Vale[]> {
  const all = await readJsonl<Vale>(VALES_FILE);
  const tx = await readJsonl<Transacao & { valeId: string }>(TX_FILE);
  const map = new Map<string, Vale>();
  for (const v of all) map.set(v.id, { ...v, transacoes: [] });
  for (const t of tx) {
    const v = map.get(t.valeId);
    if (!v) continue;
    v.transacoes.push({ tipo: t.tipo, valor: t.valor, data: t.data, obs: t.obs });
    if (t.tipo === 'abatimento') {
      v.saldo = Math.max(0, Math.round((v.saldo - t.valor) * 100) / 100);
      if (v.saldo === 0) v.status = 'esgotado';
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  );
}
