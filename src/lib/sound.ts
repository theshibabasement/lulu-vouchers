/**
 * Pequeno feedback sonoro pra ações importantes (criar vale, abater).
 * Usa Web Audio API — sem dependência de arquivo binário.
 *
 * Browsers exigem que o AudioContext seja iniciado a partir de um gesto
 * do usuário (click). Como o som é disparado em onClick, isso já satisfaz.
 */

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Bip duplo "ding-ding" suave — confirmação positiva. */
export function playSuccessSound(): void {
  const c = getCtx();
  if (!c) return;
  try {
    const now = c.currentTime;
    play(c, 880, now, 0.08, 0.18);
    play(c, 1320, now + 0.1, 0.06, 0.14);
  } catch {
    /* ignore */
  }
}

function play(
  c: AudioContext,
  freq: number,
  start: number,
  attack: number,
  duration: number,
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.18, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}
