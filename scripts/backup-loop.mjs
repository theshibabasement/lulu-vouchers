/**
 * Loop de backup — roda em background no container.
 * Primeiro backup 1h após start, depois a cada 24h.
 */
import { runBackup } from './backup.mjs';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FIRST_DELAY_MS = 60 * 60 * 1000; // 1h após start

console.log('[backup-loop] agendado: primeiro em 1h, depois a cada 24h.');

async function tick() {
  try {
    await runBackup();
  } catch (e) {
    console.error('[backup-loop] erro:', e);
  }
  setTimeout(tick, ONE_DAY_MS);
}

setTimeout(tick, FIRST_DELAY_MS);

// Mantém processo vivo
process.stdin.resume();
